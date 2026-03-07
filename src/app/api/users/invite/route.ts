import { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { isOrgAdmin } from '@/lib/auth/check-admin'
import { success, error } from '@/lib/api/response'

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  if (!user.organization_id) {
    return error('User has no organization', 403)
  }

  if (!isOrgAdmin(user)) return error('Admin access required', 403)

  const serviceClient = await createServiceRoleClient()

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return error('Invalid JSON', 400)
  }

  if (!body.email || typeof body.email !== 'string') {
    return error('email is required', 400)
  }
  if (!body.name || typeof body.name !== 'string') {
    return error('name is required', 400)
  }

  const projectId = typeof body.project_id === 'string' ? body.project_id : null
  const role = typeof body.role === 'string' ? body.role : null
  const validRoles = ['applicant', 'verifier', 'approver']

  if (projectId && !role) {
    return error('role is required when project_id is provided', 400)
  }
  if (role && !projectId) {
    return error('project_id is required when role is provided', 400)
  }
  if (role && !validRoles.includes(role)) {
    return error(`role must be one of: ${validRoles.join(', ')}`, 400)
  }

  // Validate project belongs to admin's org
  if (projectId) {
    const { data: project, error: projError } = await serviceClient
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('organization_id', user.organization_id!)
      .single()

    if (projError || !project) {
      return error('Project not found in your organization', 400)
    }
  }

  // Send invite email via Supabase (uses configured SMTP — noreply@clawforge.online)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ptw-iota.vercel.app'
  const { data: authData, error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(body.email, {
    redirectTo: `${siteUrl}/auth/callback`,
  })

  if (inviteError) {
    const msg = inviteError.message ?? ''
    if (msg.toLowerCase().includes('already') && msg.toLowerCase().includes('registered')) {
      return error('A user with this email already exists', 409)
    }
    return error(`Failed to invite user: ${msg}`, 500)
  }

  // Create user_profiles record
  const newUserId = authData.user.id
  const { data: profile, error: profileError } = await serviceClient
    .from('user_profiles')
    .insert({
      id: newUserId,
      email: body.email,
      name: body.name,
      phone: typeof body.phone === 'string' ? body.phone : null,
      organization_id: user.organization_id,
    })
    .select('id, email, phone, name, organization_id, created_at')
    .single()

  if (profileError) {
    // Rollback: delete the auth user to prevent orphan
    await serviceClient.auth.admin.deleteUser(newUserId)
    return error(`Failed to create user profile: ${profileError.message}`, 500)
  }

  // Assign project role if provided
  let roleWarning: string | null = null
  if (projectId && role) {
    const { error: roleError } = await serviceClient
      .from('user_project_roles')
      .insert({
        user_id: newUserId,
        project_id: projectId,
        role,
        is_active: true,
      })

    if (roleError) {
      roleWarning = `User created but role assignment failed: ${roleError.message}`
    }
  }

  return success({ ...profile, role_warning: roleWarning }, 201)
}

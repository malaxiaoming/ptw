import { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requirePlatformAdmin, requireSuperAdmin } from '@/lib/auth/require-platform-admin'
import { isSuperAdmin } from '@/lib/auth/check-admin'
import { success, error } from '@/lib/api/response'

export async function GET() {
  const guard = await requirePlatformAdmin()
  if (guard.errorResponse) return guard.errorResponse

  const serviceClient = await createServiceRoleClient()
  const userIsSuperAdmin = isSuperAdmin(guard.user)

  if (userIsSuperAdmin) {
    // Super admin sees all system_role users + all org admins
    const { data: admins, error: dbError } = await serviceClient
      .from('user_profiles')
      .select('id, name, email, phone, is_admin, system_role, is_active, organization_id, created_at, organizations(name)')
      .or('system_role.not.is.null,is_admin.eq.true')
      .order('created_at', { ascending: false })

    if (dbError) return error(`Failed to fetch admins: ${dbError.message}`, 500)

    const result = (admins ?? []).map((a) => {
      const org = a.organizations as unknown as { name: string } | null
      const { organizations: _, ...rest } = a
      return { ...rest, organization_name: org?.name ?? null }
    })

    return success(result)
  } else {
    // Regional admin sees only org admins (is_admin = true)
    const { data: admins, error: dbError } = await serviceClient
      .from('user_profiles')
      .select('id, name, email, phone, is_admin, system_role, is_active, organization_id, created_at, organizations(name)')
      .eq('is_admin', true)
      .order('created_at', { ascending: false })

    if (dbError) return error(`Failed to fetch admins: ${dbError.message}`, 500)

    const result = (admins ?? []).map((a) => {
      const org = a.organizations as unknown as { name: string } | null
      const { organizations: _, ...rest } = a
      return { ...rest, organization_name: org?.name ?? null }
    })

    return success(result)
  }
}

export async function POST(request: NextRequest) {
  const guard = await requirePlatformAdmin()
  if (guard.errorResponse) return guard.errorResponse

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return error('Invalid JSON', 400)
  }

  if (!body.email || typeof body.email !== 'string') return error('email is required', 400)
  if (!body.name || typeof body.name !== 'string') return error('name is required', 400)
  if (!body.role || typeof body.role !== 'string') return error('role is required', 400)

  const role = body.role as string

  if (role === 'regional_admin') {
    // Only super admin can create regional admins
    const superGuard = await requireSuperAdmin()
    if (superGuard.errorResponse) return superGuard.errorResponse
  } else if (role === 'org_admin') {
    if (!body.organization_id || typeof body.organization_id !== 'string') {
      return error('organization_id is required for org_admin role', 400)
    }
  } else {
    return error('role must be regional_admin or org_admin', 400)
  }

  const serviceClient = await createServiceRoleClient()

  // Verify org exists if org_admin
  if (role === 'org_admin') {
    const { data: org, error: orgError } = await serviceClient
      .from('organizations')
      .select('id')
      .eq('id', body.organization_id as string)
      .single()

    if (orgError || !org) return error('Organization not found', 404)
  }

  // Invite user
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ptw-iota.vercel.app'
  const { data: authData, error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(
    body.email,
    { redirectTo: `${siteUrl}/auth/callback` }
  )

  if (inviteError) {
    const msg = inviteError.message ?? ''
    if (msg.toLowerCase().includes('already') && msg.toLowerCase().includes('registered')) {
      return error('A user with this email already exists', 409)
    }
    return error(`Failed to invite user: ${msg}`, 500)
  }

  const newUserId = authData.user.id

  const profileData: Record<string, unknown> = {
    id: newUserId,
    email: body.email,
    name: body.name,
    phone: typeof body.phone === 'string' ? body.phone : null,
  }

  if (role === 'regional_admin') {
    profileData.system_role = 'regional_admin'
  } else {
    profileData.organization_id = body.organization_id
    profileData.is_admin = true
  }

  const { data: profile, error: profileError } = await serviceClient
    .from('user_profiles')
    .insert(profileData)
    .select('id, email, name, system_role, is_admin, organization_id, created_at')
    .single()

  if (profileError) {
    await serviceClient.auth.admin.deleteUser(newUserId)
    return error(`Failed to create admin profile: ${profileError.message}`, 500)
  }

  return success(profile, 201)
}

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

  return success(profile, 201)
}

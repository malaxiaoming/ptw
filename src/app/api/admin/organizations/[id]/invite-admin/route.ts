import { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requirePlatformAdmin } from '@/lib/auth/require-platform-admin'
import { success, error } from '@/lib/api/response'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requirePlatformAdmin()
  if (guard.errorResponse) return guard.errorResponse

  const { id: orgId } = await params

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

  const serviceClient = await createServiceRoleClient()

  // Verify org exists
  const { data: org, error: orgError } = await serviceClient
    .from('organizations')
    .select('id')
    .eq('id', orgId)
    .single()

  if (orgError || !org) return error('Organization not found', 404)

  // Invite user via Supabase Auth
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

  // Create profile as org admin
  const { data: profile, error: profileError } = await serviceClient
    .from('user_profiles')
    .insert({
      id: newUserId,
      email: body.email,
      name: body.name,
      phone: typeof body.phone === 'string' ? body.phone : null,
      organization_id: orgId,
      is_admin: true,
    })
    .select('id, email, name, organization_id, is_admin, created_at')
    .single()

  if (profileError) {
    await serviceClient.auth.admin.deleteUser(newUserId)
    return error(`Failed to create user profile: ${profileError.message}`, 500)
  }

  return success(profile, 201)
}

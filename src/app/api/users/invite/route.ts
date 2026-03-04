import { NextRequest } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { success, error } from '@/lib/api/response'

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  if (!user.organization_id) {
    return error('User has no organization', 403)
  }

  const supabase = await createServerSupabaseClient()

  // Admin check
  const { data: adminRoles } = await supabase
    .from('user_project_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')

  if (!adminRoles || adminRoles.length === 0) {
    return error('Admin access required', 403)
  }

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

  // Use service role client to invite user
  const serviceClient = await createServiceRoleClient()
  const { data: authData, error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(body.email)

  if (inviteError) return error(inviteError.message, 500)

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

  if (profileError) return error(profileError.message, 500)

  return success(profile, 201)
}

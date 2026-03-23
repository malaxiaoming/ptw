import { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requirePlatformAdmin } from '@/lib/auth/require-platform-admin'
import { success, error } from '@/lib/api/response'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requirePlatformAdmin()
  if (guard.errorResponse) return guard.errorResponse

  const { id } = await params
  const serviceClient = await createServiceRoleClient()

  const { data: org, error: dbError } = await serviceClient
    .from('organizations')
    .select('id, name, created_at')
    .eq('id', id)
    .single()

  if (dbError) return error('Organization not found', 404)

  // Fetch users in org
  const { data: users } = await serviceClient
    .from('user_profiles')
    .select('id, name, email, is_admin, system_role, is_active, created_at')
    .eq('organization_id', id)
    .order('created_at', { ascending: false })

  // Fetch projects in org
  const { data: projects } = await serviceClient
    .from('projects')
    .select('id, name, created_at')
    .eq('organization_id', id)
    .order('created_at', { ascending: false })

  return success({
    ...org,
    users: users ?? [],
    projects: projects ?? [],
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requirePlatformAdmin()
  if (guard.errorResponse) return guard.errorResponse

  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return error('Invalid JSON', 400)
  }

  if (!body.name || typeof body.name !== 'string') {
    return error('name is required', 400)
  }

  const serviceClient = await createServiceRoleClient()

  const { data: org, error: dbError } = await serviceClient
    .from('organizations')
    .update({ name: body.name })
    .eq('id', id)
    .select('id, name, created_at')
    .single()

  if (dbError) return error(`Failed to update organization: ${dbError.message}`, 500)

  return success(org)
}

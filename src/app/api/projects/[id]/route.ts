import { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { isOrgAdmin } from '@/lib/auth/check-admin'
import { success, error } from '@/lib/api/response'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  const { id } = await params
  if (!user.organization_id) return error('User has no organization', 403)
  const serviceClient = await createServiceRoleClient()

  // Single org-scoped admin check (service role bypasses RLS)
  let adminAccess: boolean
  try {
    adminAccess = await isOrgAdmin(serviceClient, user.id, user.organization_id)
  } catch {
    return error('Service unavailable', 503)
  }
  if (!adminAccess) return error('Admin access required', 403)

  const { data, error: dbError } = await serviceClient
    .from('projects')
    .select(`
      id, name, location, status, created_at,
      user_project_roles(
        id, user_id, role,
        user_profiles(id, name, email)
      )
    `)
    .eq('id', id)
    .eq('organization_id', user.organization_id)
    .single()

  if (dbError || !data) return error('Project not found', 404)

  return success(data)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  const { id } = await params
  if (!user.organization_id) return error('User has no organization', 403)
  const serviceClient = await createServiceRoleClient()

  // Org-scoped admin check (service role bypasses RLS)
  let adminAccess: boolean
  try {
    adminAccess = await isOrgAdmin(serviceClient, user.id, user.organization_id)
  } catch {
    return error('Service unavailable', 503)
  }
  if (!adminAccess) return error('Admin access required', 403)

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return error('Invalid JSON', 400)
  }

  // Validate status enum
  const validStatuses = ['active', 'archived']
  if (body.status !== undefined && !validStatuses.includes(body.status as string)) {
    return error(`status must be one of: ${validStatuses.join(', ')}`, 400)
  }
  if (body.name !== undefined && (!body.name || typeof body.name !== 'string' || (body.name as string).trim() === '')) {
    return error('name cannot be empty', 400)
  }

  const allowedFields = ['name', 'location', 'status']
  const updates: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (body[field] !== undefined) updates[field] = body[field]
  }

  if (Object.keys(updates).length === 0) {
    return error('No valid fields to update', 400)
  }

  const { data, error: dbError } = await serviceClient
    .from('projects')
    .update(updates)
    .eq('id', id)
    .eq('organization_id', user.organization_id)
    .select('id, name, location, status, created_at')
    .single()

  if (dbError) return error(dbError.message, 500)
  if (!data) return error('Project not found', 404)

  return success(data)
}

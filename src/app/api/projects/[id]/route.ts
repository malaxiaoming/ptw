import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { success, error } from '@/lib/api/response'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  const { id } = await params
  const supabase = await createServerSupabaseClient()

  // Check user has admin role in this project
  const { data: adminRole } = await supabase
    .from('user_project_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('project_id', id)
    .eq('role', 'admin')
    .maybeSingle()

  if (!adminRole) {
    // Also allow if user is org-level admin (admin in any project)
    const { data: anyAdminRole } = await supabase
      .from('user_project_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .limit(1)

    if (!anyAdminRole || anyAdminRole.length === 0) {
      return error('Admin access required', 403)
    }
  }

  const { data, error: dbError } = await supabase
    .from('projects')
    .select(`
      id, name, location, status, created_at,
      user_project_roles(
        id, user_id, role,
        user_profiles(id, name, email)
      )
    `)
    .eq('id', id)
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

  const allowedFields = ['name', 'location', 'status']
  const updates: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (body[field] !== undefined) updates[field] = body[field]
  }

  if (Object.keys(updates).length === 0) {
    return error('No valid fields to update', 400)
  }

  const { data, error: dbError } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', id)
    .select('id, name, location, status, created_at')
    .single()

  if (dbError) return error(dbError.message, 500)
  if (!data) return error('Project not found', 404)

  return success(data)
}

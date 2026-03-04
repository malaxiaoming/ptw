import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { success, error } from '@/lib/api/response'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  if (!user.organization_id) {
    return success([])
  }

  const supabase = await createServerSupabaseClient()

  // Return projects the user has any role in (accessible projects)
  const { data: roleRows, error: rolesError } = await supabase
    .from('user_project_roles')
    .select('project_id')
    .eq('user_id', user.id)

  if (rolesError) return error(rolesError.message, 500)

  const projectIds = (roleRows ?? []).map((r: { project_id: string }) => r.project_id)

  if (projectIds.length === 0) {
    return success([])
  }

  const { data, error: dbError } = await supabase
    .from('projects')
    .select('id, name, location, status, created_at')
    .in('id', projectIds)
    .order('name', { ascending: true })

  if (dbError) return error(dbError.message, 500)

  return success(data)
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  if (!user.organization_id) {
    return error('User has no organization', 403)
  }

  // Admin check: user must have admin role in at least one project
  const supabase = await createServerSupabaseClient()
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

  if (!body.name || typeof body.name !== 'string') {
    return error('name is required', 400)
  }

  const { data, error: dbError } = await supabase
    .from('projects')
    .insert({
      organization_id: user.organization_id,
      name: body.name,
      location: typeof body.location === 'string' ? body.location : null,
      status: 'active',
    })
    .select('id, name, location, status, created_at')
    .single()

  if (dbError) return error(dbError.message, 500)

  return success(data, 201)
}

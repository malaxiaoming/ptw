import { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { isOrgAdmin } from '@/lib/auth/check-admin'
import { success, error } from '@/lib/api/response'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  if (!user.organization_id) {
    return success([])
  }

  if (!isOrgAdmin(user)) return error('Admin access required', 403)

  const serviceClient = await createServiceRoleClient()

  const { data, error: dbError } = await serviceClient
    .from('user_profiles')
    .select(`
      id, email, phone, name, organization_id, is_admin, is_active, created_at,
      user_project_roles(id, role, is_active, project_id, projects(id, name))
    `)
    .eq('organization_id', user.organization_id)
    .order('is_active', { ascending: false })
    .order('name', { ascending: true })

  if (dbError) return error(dbError.message, 500)

  return success({ users: data, isAdmin: true, currentUserId: user.id })
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)
  if (!isOrgAdmin(user)) return error('Admin access required', 403)

  let body: { user_id?: string; is_active?: boolean }
  try {
    body = await req.json()
  } catch {
    return error('Invalid JSON', 400)
  }

  const { user_id, is_active } = body
  if (!user_id || typeof is_active !== 'boolean') {
    return error('user_id and is_active (boolean) are required', 400)
  }

  if (user_id === user.id) {
    return error('Cannot change your own active status', 400)
  }

  const serviceClient = await createServiceRoleClient()

  // Check target user exists and is in the same org
  const { data: target, error: fetchErr } = await serviceClient
    .from('user_profiles')
    .select('id, is_admin, organization_id')
    .eq('id', user_id)
    .single()

  if (fetchErr || !target) return error('User not found', 404)
  if (target.organization_id !== user.organization_id) return error('User not in your organization', 403)
  if (target.is_admin) return error('Cannot disable another admin', 400)

  // Bulk-toggle all project roles for this user across the admin's org
  const { data: orgProjects, error: projErr } = await serviceClient
    .from('projects')
    .select('id')
    .eq('organization_id', user.organization_id!)

  if (projErr) return error(projErr.message, 500)

  const projectIds = (orgProjects ?? []).map((p: { id: string }) => p.id)

  if (projectIds.length > 0) {
    const { error: rolesErr } = await serviceClient
      .from('user_project_roles')
      .update({ is_active })
      .eq('user_id', user_id)
      .in('project_id', projectIds)

    if (rolesErr) return error(rolesErr.message, 500)
  }

  // Also update user_profiles.is_active as a display indicator
  const { error: updateErr } = await serviceClient
    .from('user_profiles')
    .update({ is_active })
    .eq('id', user_id)

  if (updateErr) return error(updateErr.message, 500)

  return success({ user_id, is_active })
}

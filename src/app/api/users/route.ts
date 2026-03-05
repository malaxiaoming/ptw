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

  const serviceClient = await createServiceRoleClient()

  // Org-scoped admin check (service role bypasses RLS)
  let adminAccess: boolean
  try {
    adminAccess = await isOrgAdmin(serviceClient, user.id, user.organization_id)
  } catch {
    return error('Service unavailable', 503)
  }
  if (!adminAccess) return error('Admin access required', 403)

  const { data, error: dbError } = await serviceClient
    .from('user_profiles')
    .select(`
      id, email, phone, name, organization_id, created_at,
      user_project_roles(id, role, project_id, projects(id, name))
    `)
    .eq('organization_id', user.organization_id)
    .order('name', { ascending: true })

  if (dbError) return error(dbError.message, 500)

  return success({ users: data, isAdmin: true })
}

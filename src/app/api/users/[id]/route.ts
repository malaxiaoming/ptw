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

  if (!isOrgAdmin(user)) return error('Admin access required', 403)

  const { id } = await params

  const serviceClient = await createServiceRoleClient()

  const { data, error: dbError } = await serviceClient
    .from('user_profiles')
    .select(`
      id, email, phone, name, organization_id, is_admin, is_active, created_at,
      user_project_roles(id, role, is_active, project_id, projects(id, name))
    `)
    .eq('id', id)
    .eq('organization_id', user.organization_id)
    .single()

  if (dbError || !data) return error('User not found', 404)

  return success(data)
}

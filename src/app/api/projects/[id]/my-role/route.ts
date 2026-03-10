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
  const admin = isOrgAdmin(user)

  const serviceClient = await createServiceRoleClient()

  const { data, error: dbError } = await serviceClient
    .from('user_project_roles')
    .select('role, company_id')
    .eq('user_id', user.id)
    .eq('project_id', id)
    .eq('is_active', true)

  if (dbError) return error(dbError.message, 500)

  const roles = (data ?? []).map((r: { role: string }) => r.role)
  const companyId = (data ?? []).find((r: { company_id: string | null }) => r.company_id)?.company_id ?? null

  return success({ roles, company_id: companyId, is_admin: admin })
}

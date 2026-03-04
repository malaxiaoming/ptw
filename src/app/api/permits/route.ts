import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { getUserRolesForProject } from '@/lib/auth/get-user-roles'
import { canPerformActionWithRoles } from '@/lib/auth/permissions'
import { success, error } from '@/lib/api/response'

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  const supabase = await createServerSupabaseClient()
  const projectId = request.nextUrl.searchParams.get('project_id')
  const status = request.nextUrl.searchParams.get('status')

  let query = supabase
    .from('permits')
    .select(`
      *,
      permit_types(name, code),
      applicant:user_profiles!applicant_id(name),
      project:projects!project_id(name)
    `)
    .order('created_at', { ascending: false })

  if (projectId) query = query.eq('project_id', projectId)
  if (status) query = query.eq('status', status)

  // Filter to only projects user has access to
  const { data: userRoles } = await supabase
    .from('user_project_roles')
    .select('project_id')
    .eq('user_id', user.id)

  const projectIds = (userRoles ?? []).map((r) => r.project_id)
  query = query.in('project_id', projectIds)

  const { data, error: dbError } = await query
  if (dbError) return error(dbError.message, 500)

  return success(data)
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  const body = await request.json()
  const { project_id, permit_type_id, work_location, work_description } = body

  const roles = await getUserRolesForProject(user.id, project_id)
  if (!canPerformActionWithRoles(roles, 'create_permit')) {
    return error('You do not have permission to create permits in this project', 403)
  }

  const supabase = await createServerSupabaseClient()

  const { data, error: dbError } = await supabase
    .from('permits')
    .insert({
      project_id,
      permit_type_id,
      applicant_id: user.id,
      work_location,
      work_description,
      status: 'draft',
    })
    .select()
    .single()

  if (dbError) return error(dbError.message, 500)

  // Log creation
  await supabase.from('permit_activity_log').insert({
    permit_id: data.id,
    action: 'created',
    performed_by: user.id,
  })

  return success(data, 201)
}

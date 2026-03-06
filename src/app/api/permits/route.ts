import { NextRequest } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { isOrgAdmin } from '@/lib/auth/check-admin'
import { getUserRolesForProject } from '@/lib/auth/get-user-roles'
import { canPerformActionWithRoles } from '@/lib/auth/permissions'
import { success, error } from '@/lib/api/response'

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  const supabase = await createServerSupabaseClient()
  const projectId = request.nextUrl.searchParams.get('project_id')
  const status = request.nextUrl.searchParams.get('status')
  const permitTypeId = request.nextUrl.searchParams.get('permit_type_id')

  let accessibleProjectIds: string[]

  if (isOrgAdmin(user) && user.organization_id) {
    // Admin sees all permits in their org's projects
    const serviceClient = await createServiceRoleClient()
    const { data: orgProjects } = await serviceClient
      .from('projects')
      .select('id')
      .eq('organization_id', user.organization_id)
    accessibleProjectIds = (orgProjects ?? []).map((p) => p.id)
  } else {
    // Non-admin: only projects with active roles
    const { data: userRoles } = await supabase
      .from('user_project_roles')
      .select('project_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
    accessibleProjectIds = (userRoles ?? []).map((r) => r.project_id)
  }

  // If no project memberships, return empty list
  if (accessibleProjectIds.length === 0) return success([])

  // If filtering by a specific project, verify access
  if (projectId && !accessibleProjectIds.includes(projectId)) {
    return error('Project not found or access denied', 403)
  }

  const targetProjectIds = projectId ? [projectId] : accessibleProjectIds

  let query = supabase
    .from('permits')
    .select(`
      *,
      permit_types(name, code),
      applicant:user_profiles!applicant_id(name),
      project:projects!project_id(name)
    `)
    .in('project_id', targetProjectIds)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (permitTypeId) query = query.eq('permit_type_id', permitTypeId)

  const { data, error: dbError } = await query
  if (dbError) return error(dbError.message, 500)

  return success(data)
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return error('Invalid request body', 400)
  }

  const { project_id, permit_type_id, work_location, work_description } = body as {
    project_id?: string
    permit_type_id?: string
    work_location?: string
    work_description?: string
  }

  if (!project_id || !permit_type_id || !work_location || !work_description) {
    return error('project_id, permit_type_id, work_location, and work_description are required', 400)
  }

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

  if (dbError) return error('Failed to create permit', 500)

  await supabase.from('permit_activity_log').insert({
    permit_id: data.id,
    action: 'created',
    performed_by: user.id,
  })

  return success(data, 201)
}

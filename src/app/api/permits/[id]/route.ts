import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { getUserRolesForProject } from '@/lib/auth/get-user-roles'
import { success, error } from '@/lib/api/response'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data, error: dbError } = await supabase
    .from('permits')
    .select(`
      *,
      permit_types(name, code, checklist_template),
      applicant:user_profiles!applicant_id(id, name, email),
      verifier:user_profiles!verifier_id(id, name, email),
      approver:user_profiles!approver_id(id, name, email),
      project:projects!project_id(id, name, location),
      permit_attachments(*),
      permit_activity_log(*, performer:user_profiles!performed_by(name))
    `)
    .eq('id', id)
    .single()

  if (dbError || !data) return error('Permit not found', 404)

  // Verify user belongs to the permit's project
  const roles = await getUserRolesForProject(user.id, data.project_id)
  if (roles.length === 0) return error('Permit not found', 404)

  return success(data)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return error('Invalid request body', 400)
  }

  const supabase = await createServerSupabaseClient()

  // Only allow editing draft permits by the applicant
  const { data: permit } = await supabase
    .from('permits')
    .select('status, applicant_id')
    .eq('id', id)
    .single()

  if (!permit) return error('Permit not found', 404)
  if (permit.status !== 'draft') return error('Only draft permits can be edited', 400)
  if (permit.applicant_id !== user.id) return error('You can only edit your own permits', 403)

  const allowedFields = [
    'work_location', 'work_description', 'gps_lat', 'gps_lng',
    'scheduled_start', 'scheduled_end', 'checklist_data', 'personnel',
  ]
  const updates: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (body[field] !== undefined) updates[field] = body[field]
  }

  const { data, error: dbError } = await supabase
    .from('permits')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (dbError) return error(dbError.message, 500)

  return success(data)
}

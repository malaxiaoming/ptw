import { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { success, error } from '@/lib/api/response'

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  const projectId = request.nextUrl.searchParams.get('project_id')
  if (!projectId) return error('project_id is required', 400)

  const supabase = await createServiceRoleClient()

  const { data, error: dbError } = await supabase
    .from('toolbox_meetings')
    .select('*, conductor:user_profiles!conducted_by(id, name)')
    .eq('project_id', projectId)
    .eq('organization_id', user.organization_id)
    .eq('is_active', true)
    .order('meeting_date', { ascending: false })

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
    return error('Invalid JSON', 400)
  }

  const projectId = body.project_id
  if (!projectId || typeof projectId !== 'string') {
    return error('project_id is required', 400)
  }
  const meetingDate = body.meeting_date
  if (!meetingDate || typeof meetingDate !== 'string') {
    return error('meeting_date is required', 400)
  }

  const supabase = await createServiceRoleClient()

  // Check for duplicate date
  const { data: existing } = await supabase
    .from('toolbox_meetings')
    .select('id')
    .eq('project_id', projectId)
    .eq('meeting_date', meetingDate)
    .eq('is_active', true)
    .maybeSingle()

  if (existing) {
    return error('A toolbox meeting already exists for this date', 409)
  }

  const { data, error: dbError } = await supabase
    .from('toolbox_meetings')
    .insert({
      organization_id: user.organization_id,
      project_id: projectId,
      conducted_by: user.id,
      meeting_date: meetingDate,
      meeting_time: typeof body.meeting_time === 'string' ? body.meeting_time : null,
      location: typeof body.location === 'string' ? body.location : null,
      checklist: body.checklist ?? {},
      attendance: body.attendance ?? [],
      notes: typeof body.notes === 'string' ? body.notes : null,
      signed_off: body.signed_off === true,
      signed_off_at: body.signed_off === true ? new Date().toISOString() : null,
    })
    .select('*, conductor:user_profiles!conducted_by(id, name)')
    .single()

  if (dbError) return error(dbError.message, 500)

  return success(data, 201)
}

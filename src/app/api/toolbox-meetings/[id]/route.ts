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
  const supabase = await createServiceRoleClient()

  const { data, error: dbError } = await supabase
    .from('toolbox_meetings')
    .select('*, conductor:user_profiles!conducted_by(id, name)')
    .eq('id', id)
    .eq('organization_id', user.organization_id)
    .eq('is_active', true)
    .single()

  if (dbError || !data) return error('Meeting not found', 404)

  return success(data)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  const { id } = await params
  const supabase = await createServiceRoleClient()

  // Verify meeting exists and check permission
  const { data: existing } = await supabase
    .from('toolbox_meetings')
    .select('id, conducted_by')
    .eq('id', id)
    .eq('organization_id', user.organization_id)
    .eq('is_active', true)
    .single()

  if (!existing) return error('Meeting not found', 404)
  if (existing.conducted_by !== user.id && !isOrgAdmin(user)) {
    return error('Only the conductor or an admin can update this meeting', 403)
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return error('Invalid JSON', 400)
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.checklist !== undefined) updates.checklist = body.checklist
  if (body.attendance !== undefined) updates.attendance = body.attendance
  if (typeof body.notes === 'string') updates.notes = body.notes
  if (typeof body.location === 'string') updates.location = body.location
  if (typeof body.meeting_time === 'string') updates.meeting_time = body.meeting_time
  if (typeof body.signed_off === 'boolean') {
    updates.signed_off = body.signed_off
    if (body.signed_off) {
      updates.signed_off_at = new Date().toISOString()
    }
  }

  const { data, error: dbError } = await supabase
    .from('toolbox_meetings')
    .update(updates)
    .eq('id', id)
    .select('*, conductor:user_profiles!conducted_by(id, name)')
    .single()

  if (dbError) return error(dbError.message, 500)

  return success(data)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  const { id } = await params
  const supabase = await createServiceRoleClient()

  // Verify meeting exists and check permission
  const { data: existing } = await supabase
    .from('toolbox_meetings')
    .select('id, conducted_by')
    .eq('id', id)
    .eq('organization_id', user.organization_id)
    .eq('is_active', true)
    .single()

  if (!existing) return error('Meeting not found', 404)
  if (existing.conducted_by !== user.id && !isOrgAdmin(user)) {
    return error('Only the conductor or an admin can delete this meeting', 403)
  }

  const { error: dbError } = await supabase
    .from('toolbox_meetings')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (dbError) return error(dbError.message, 500)

  return success({ message: 'Meeting deleted' })
}

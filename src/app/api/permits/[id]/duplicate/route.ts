import { NextRequest } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { getUserRolesForProject } from '@/lib/auth/get-user-roles'
import { canPerformActionWithRoles } from '@/lib/auth/permissions'
import { defaultScheduledStart, defaultScheduledEnd, datetimeLocalToISO } from '@/lib/utils/date-defaults'
import { success, error } from '@/lib/api/response'
import type { ChecklistTemplate } from '@/lib/permits/checklist-validation'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  const { id } = await params
  const supabase = await createServerSupabaseClient()

  // Fetch source permit
  const { data: source } = await supabase
    .from('permits')
    .select('*, permit_types(name, code, checklist_template)')
    .eq('id', id)
    .single()

  if (!source) return error('Permit not found', 404)

  // Verify user has access and create_permit permission in the project
  const roles = await getUserRolesForProject(user.id, source.project_id)
  if (roles.length === 0) return error('Permit not found', 404)

  if (!canPerformActionWithRoles(roles, 'create_permit')) {
    return error('You do not have permission to create permits in this project', 403)
  }

  const serviceClient = await createServiceRoleClient()

  // Strip photo field values from checklist_data — photos reference the
  // original permit's attachments and must be re-uploaded for each new permit.
  let checklistData = source.checklist_data as Record<string, unknown> | null
  const template = (source as Record<string, unknown>).permit_types as { checklist_template: ChecklistTemplate } | null
  if (checklistData && template?.checklist_template?.sections) {
    checklistData = { ...checklistData }
    for (const section of template.checklist_template.sections) {
      for (const field of section.fields) {
        if (field.type === 'photo') {
          delete checklistData[field.id]
        }
      }
    }
  }

  const { data: newPermit, error: dbError } = await serviceClient
    .from('permits')
    .insert({
      project_id: source.project_id,
      permit_type_id: source.permit_type_id,
      applicant_id: user.id,
      status: 'draft',
      work_location: source.work_location,
      work_description: source.work_description,
      gps_lat: source.gps_lat,
      gps_lng: source.gps_lng,
      checklist_data: checklistData,
      personnel: source.personnel,
      scheduled_start: datetimeLocalToISO(defaultScheduledStart()),
      scheduled_end: datetimeLocalToISO(defaultScheduledEnd()),
    })
    .select()
    .single()

  if (dbError) return error('Failed to duplicate permit', 500)

  // Log activity
  await serviceClient.from('permit_activity_log').insert({
    permit_id: newPermit.id,
    action: 'created',
    performed_by: user.id,
    comments: `Duplicated from ${source.permit_number}`,
  })

  return success(newPermit, 201)
}

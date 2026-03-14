import { NextRequest } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { getUserRolesForProject } from '@/lib/auth/get-user-roles'
import { validateTransition } from '@/lib/permits/transition'
import { type PermitAction } from '@/lib/permits/state-machine'
import { validateChecklist, type ChecklistTemplate, type PersonnelEntry } from '@/lib/permits/checklist-validation'
import { success, error } from '@/lib/api/response'

export async function POST(
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

  if (!body.action || typeof body.action !== 'string') {
    return error('action is required', 400)
  }

  const action = body.action as PermitAction
  const comments = typeof body.comments === 'string' ? body.comments : undefined

  const supabase = await createServerSupabaseClient()
  const serviceClient = await createServiceRoleClient()

  // Get current permit
  const { data: permit } = await supabase
    .from('permits')
    .select('id, status, applicant_id, project_id, checklist_data, personnel, permit_types(checklist_template)')
    .eq('id', id)
    .single()

  if (!permit) return error('Permit not found', 404)

  // Get user roles for this project
  const roles = await getUserRolesForProject(user.id, permit.project_id)

  // Validate transition
  const result = validateTransition(
    { id: permit.id, status: permit.status, applicant_id: permit.applicant_id, project_id: permit.project_id },
    action,
    { userId: user.id, roles }
  )

  if (!result.valid) return error(result.error!, 403)

  if (result.requiresComment && !comments) {
    return error('Comments are required for this action', 400)
  }

  // Validate checklist on submit
  if (action === 'submit') {
    const template = (permit as Record<string, unknown>).permit_types as { checklist_template: ChecklistTemplate } | null
    if (template?.checklist_template) {
      const checklistData = (permit.checklist_data ?? {}) as Record<string, unknown>
      const personnel = ((permit.personnel ?? []) as PersonnelEntry[])
      const checklistResult = validateChecklist(template.checklist_template, checklistData, personnel)
      if (!checklistResult.valid) {
        return error(checklistResult.errors.join('; '), 400)
      }
    }
  }

  // Build update payload
  const updates: Record<string, unknown> = { status: result.newStatus }
  const now = new Date().toISOString()

  switch (action) {
    case 'submit':
      updates.submitted_at = now
      break
    case 'verify':
      updates.verifier_id = user.id
      updates.verified_at = now
      break
    case 'approve':
      updates.approver_id = user.id
      updates.approved_at = now
      updates.activated_at = now
      break
    case 'reject':
      updates.approver_id = user.id
      updates.rejection_reason = comments
      break
    case 'revoke':
      updates.revocation_reason = comments
      break
    case 'verify_closure':
      updates.closed_at = now
      break
  }

  // Execute transition
  const { data: updated, error: dbError } = await serviceClient
    .from('permits')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (dbError) return error(dbError.message, 500)

  // Log activity
  await serviceClient.from('permit_activity_log').insert({
    permit_id: id,
    action: action === 'submit_closure' ? 'closure_submitted'
      : action === 'verify_closure' ? 'closed'
      : action === 'return_closure' ? 'closure_returned'
      : action,
    performed_by: user.id,
    comments,
  })

  return success(updated)
}

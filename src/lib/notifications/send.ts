import { createServiceRoleClient } from '@/lib/supabase/server'
import { getNotificationRecipients } from './recipients'
import type { PermitStatus } from '@/lib/permits/state-machine'

interface SendNotificationParams {
  permitId: string
  permitNumber: string
  projectId: string
  newStatus: PermitStatus
  parties: {
    applicant_id: string
    verifier_id: string | null
    approver_id: string | null
  }
}

const STATUS_MESSAGES: Partial<Record<PermitStatus, { title: string; message: string }>> = {
  submitted: { title: 'Permit Submitted for Verification', message: 'A new permit requires your verification.' },
  verified: { title: 'Permit Verified', message: 'A permit has been verified and requires your approval.' },
  rejected: { title: 'Permit Rejected', message: 'Your permit has been rejected.' },
  revoked: { title: 'Permit Revoked', message: 'A permit has been revoked.' },
  active: { title: 'Permit Approved & Active', message: 'Your permit has been approved and is now active.' },
  closure_submitted: { title: 'Closure Report Submitted', message: 'A closure report requires your verification.' },
  closed: { title: 'Permit Closed', message: 'Your permit has been closed out.' },
  draft: { title: 'Permit Returned', message: 'Your permit has been returned for revision.' },
}

export async function sendPermitNotifications(params: SendNotificationParams) {
  const { permitId, permitNumber, projectId, newStatus, parties } = params
  const supabase = await createServiceRoleClient()

  const target = getNotificationRecipients(newStatus, parties)
  const template = STATUS_MESSAGES[newStatus]
  if (!template) return

  let recipientIds: string[] = []

  if (target.targetUserIds) {
    recipientIds = target.targetUserIds
  }

  if (target.targetRoles) {
    const { data: roleUsers, error: roleError } = await supabase
      .from('user_project_roles')
      .select('user_id')
      .eq('project_id', projectId)
      .in('role', target.targetRoles)

    if (roleError) {
      console.error('[sendPermitNotifications] Failed to fetch role users:', roleError.message)
      // Non-fatal: fall through with empty roleUsers
    }

    recipientIds = [...recipientIds, ...(roleUsers ?? []).map((r) => r.user_id)]
  }

  // Deduplicate
  recipientIds = [...new Set(recipientIds)]

  if (recipientIds.length === 0) return

  // Insert in-app notifications
  const notifications = recipientIds.map((userId) => ({
    user_id: userId,
    permit_id: permitId,
    type: newStatus,
    title: `${template.title} — ${permitNumber}`,
    message: template.message,
  }))

  const { error: insertError } = await supabase.from('notifications').insert(notifications)
  if (insertError) {
    console.error('[sendPermitNotifications] Failed to insert notifications:', insertError.message)
    // Non-fatal: state transition has already occurred; log but don't throw
  }

  // TODO: Send email notifications via Resend (future enhancement)
}

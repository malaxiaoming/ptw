import { Resend } from 'resend'
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
  pdfBuffer?: Buffer
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

  // Send email notifications via Resend
  await sendEmailNotifications(recipientIds, permitId, permitNumber, template, supabase, params.pdfBuffer)
}

async function sendEmailNotifications(
  recipientIds: string[],
  permitId: string,
  permitNumber: string,
  template: { title: string; message: string },
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
  pdfBuffer?: Buffer
) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return

  const { data: profiles, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, email')
    .in('id', recipientIds)

  if (profileError) {
    console.error('[sendPermitNotifications] Failed to fetch user emails:', profileError.message)
    return
  }

  const recipients = (profiles ?? []).filter((p: { id: string; email: string | null }) => p.email)
  if (recipients.length === 0) return

  const resend = new Resend(apiKey)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const from = process.env.EMAIL_FROM || 'onboarding@resend.dev'
  const subject = `${template.title} — ${permitNumber}`
  const permitUrl = `${appUrl}/permits/${permitId}`

  for (const recipient of recipients) {
    try {
      await resend.emails.send({
        from,
        to: recipient.email,
        subject,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a1a1a;">${template.title}</h2>
            <p style="color: #333; font-size: 16px;">${template.message}</p>
            <p style="color: #333; font-size: 16px;"><strong>Permit:</strong> ${permitNumber}</p>
            <a href="${permitUrl}" style="display: inline-block; margin-top: 16px; padding: 10px 20px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px;">View Permit</a>
          </div>
        `,
        ...(pdfBuffer ? { attachments: [{ filename: `${permitNumber}.pdf`, content: pdfBuffer }] } : {}),
      })
    } catch (err) {
      console.error(`[sendPermitNotifications] Failed to send email to ${recipient.email}:`, err)
    }
  }
}

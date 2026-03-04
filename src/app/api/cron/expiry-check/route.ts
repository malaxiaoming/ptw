import { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendPermitNotifications } from '@/lib/notifications/send'
import { success, error } from '@/lib/api/response'

export async function POST(request: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return error('Unauthorized', 401)
  }

  const supabase = await createServiceRoleClient()
  const now = new Date()
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000)

  // Find active/approved permits expiring within 48 hours
  const { data: expiringPermits } = await supabase
    .from('permits')
    .select('id, permit_number, project_id, applicant_id, verifier_id, approver_id')
    .in('status', ['approved', 'active'])
    .lte('scheduled_end', in48h.toISOString())
    .gte('scheduled_end', now.toISOString())

  for (const permit of expiringPermits ?? []) {
    await sendPermitNotifications({
      permitId: permit.id,
      permitNumber: permit.permit_number,
      projectId: permit.project_id,
      newStatus: 'active', // reuse active notification template
      parties: {
        applicant_id: permit.applicant_id,
        verifier_id: permit.verifier_id,
        approver_id: permit.approver_id,
      },
    })
  }

  return success({ checked: expiringPermits?.length ?? 0 })
}

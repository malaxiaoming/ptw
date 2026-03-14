import { timingSafeEqual } from 'crypto'
import { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendPermitNotifications } from '@/lib/notifications/send'
import { success, error } from '@/lib/api/response'

export async function POST(request: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[cron/expiry-check] CRON_SECRET is not set')
    return error('Internal server error', 500)
  }
  const expected = `Bearer ${cronSecret}`
  const actual = authHeader ?? ''
  const match =
    actual.length === expected.length &&
    timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
  if (!match) return error('Unauthorized', 401)

  const supabase = await createServiceRoleClient()
  const now = new Date()
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000)

  // Find active permits expiring within 48 hours
  const { data: expiringPermits, error: dbError } = await supabase
    .from('permits')
    .select('id, permit_number, project_id, applicant_id, verifier_id, approver_id')
    .in('status', ['active'])
    .lte('scheduled_end', in48h.toISOString())
    .gte('scheduled_end', now.toISOString())

  if (dbError) {
    console.error('[cron/expiry-check] DB query failed:', dbError.message)
    return error('Internal server error', 500)
  }

  let checked = 0
  for (const permit of expiringPermits ?? []) {
    try {
      await sendPermitNotifications({
        permitId: permit.id,
        permitNumber: permit.permit_number,
        projectId: permit.project_id,
        newStatus: 'active', // TODO: add dedicated 'expiring_soon' status; reusing 'active' template for now
        parties: {
          applicant_id: permit.applicant_id,
          verifier_id: permit.verifier_id,
          approver_id: permit.approver_id,
        },
      })
      checked++
    } catch (err) {
      console.error('[cron/expiry-check] Failed for permit', permit.id, err)
    }
  }

  return success({ checked })
}

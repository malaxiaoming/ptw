import { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { isOrgAdmin } from '@/lib/auth/check-admin'
import { success, error } from '@/lib/api/response'
import { decrypt } from '@/lib/crypto'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)
  if (!isOrgAdmin(user)) return error('Admin access required', 403)

  const reason = request.nextUrl.searchParams.get('reason')
  if (!reason || !reason.trim()) {
    return error('reason query parameter is required', 400)
  }

  const { id: workerId } = await params
  const supabase = await createServiceRoleClient()

  const { data: worker } = await supabase
    .from('workers')
    .select('id, nric_fin_encrypted, nric_fin_type')
    .eq('id', workerId)
    .eq('organization_id', user.organization_id)
    .single()

  if (!worker) return error('Worker not found', 404)
  if (!worker.nric_fin_encrypted) return error('No NRIC/FIN data on file', 404)

  // Decrypt
  let nricFull: string
  try {
    nricFull = decrypt(worker.nric_fin_encrypted)
  } catch {
    return error('Failed to decrypt NRIC data', 500)
  }

  // Log access
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  await supabase
    .from('sensitive_data_access_log')
    .insert({
      worker_id: workerId,
      accessed_by: user.id,
      access_type: 'nric_decrypt',
      reason: reason.trim(),
      ip_address: ip,
      organization_id: user.organization_id,
    })

  return success({ nric_fin_full: nricFull, nric_fin_type: worker.nric_fin_type })
}

import { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { isOrgAdmin } from '@/lib/auth/check-admin'
import { success, error } from '@/lib/api/response'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sicId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)
  if (!isOrgAdmin(user)) return error('Admin access required', 403)

  const { sicId } = await params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return error('Invalid JSON', 400)
  }

  const supabase = await createServiceRoleClient()

  const updates: Record<string, unknown> = {}
  if (typeof body.sic_number === 'string') updates.sic_number = body.sic_number
  if (typeof body.sic_expiry === 'string') updates.sic_expiry = body.sic_expiry || null
  if (typeof body.sic_issuer === 'string') updates.sic_issuer = body.sic_issuer
  if (typeof body.issued_at === 'string') updates.issued_at = body.issued_at || null

  const { data, error: dbError } = await supabase
    .from('worker_sic_records')
    .update(updates)
    .eq('id', sicId)
    .eq('organization_id', user.organization_id)
    .select('id, worker_id, project_id, sic_number, sic_expiry, sic_issuer, issued_at, is_active, created_at')
    .single()

  if (dbError || !data) return error('SIC record not found', 404)

  return success(data)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; sicId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)
  if (!isOrgAdmin(user)) return error('Admin access required', 403)

  const { sicId } = await params
  const supabase = await createServiceRoleClient()

  // Soft delete
  const { data, error: dbError } = await supabase
    .from('worker_sic_records')
    .update({ is_active: false })
    .eq('id', sicId)
    .eq('organization_id', user.organization_id)
    .select('id')
    .single()

  if (dbError || !data) return error('SIC record not found', 404)

  return success({ message: 'SIC record deactivated' })
}

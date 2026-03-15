import { NextRequest } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { isOrgAdmin } from '@/lib/auth/check-admin'
import { success, error } from '@/lib/api/response'
import { encrypt } from '@/lib/crypto'

function maskPhone(phone: string | null): string | null {
  if (!phone || phone.length < 4) return phone
  return '****' + phone.slice(-4)
}

const NRIC_REGEX = /^[STFGM]\d{7}[A-Z]$/i
function validateNricFormat(value: string, type: string): boolean {
  if (type === 'nric' || type === 'fin') return NRIC_REGEX.test(value)
  return value.length >= 4
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data, error: dbError } = await supabase
    .from('workers')
    .select('id, name, phone, company, trade, cert_number, cert_expiry, is_active, created_at, project_id, company_id, nric_fin_type, nric_fin_last4, consent_given')
    .eq('id', id)
    .eq('organization_id', user.organization_id)
    .single()

  if (dbError || !data) return error('Worker not found', 404)

  if (!isOrgAdmin(user)) {
    data.phone = maskPhone(data.phone)
    if (data.nric_fin_last4) data.nric_fin_last4 = '****'
  }

  return success(data)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)
  if (!isOrgAdmin(user)) return error('Admin access required', 403)

  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return error('Invalid JSON', 400)
  }

  const supabase = await createServiceRoleClient()

  // Verify ownership
  const { data: existing } = await supabase
    .from('workers')
    .select('id')
    .eq('id', id)
    .eq('organization_id', user.organization_id)
    .single()

  if (!existing) return error('Worker not found', 404)

  const updates: Record<string, unknown> = {}
  if (typeof body.name === 'string') updates.name = body.name
  if (typeof body.phone === 'string') updates.phone = body.phone
  if (typeof body.company === 'string') updates.company = body.company
  if (typeof body.cert_number === 'string') updates.cert_number = body.cert_number
  if (typeof body.cert_expiry === 'string') updates.cert_expiry = body.cert_expiry || null
  if (typeof body.is_active === 'boolean') updates.is_active = body.is_active
  if (typeof body.project_id === 'string') updates.project_id = body.project_id
  if (typeof body.company_id === 'string') updates.company_id = body.company_id

  // NRIC/FIN update
  if (typeof body.nric_fin_full === 'string' && body.nric_fin_full) {
    const nricType = typeof body.nric_fin_type === 'string' ? body.nric_fin_type : 'nric'
    if (!['nric', 'fin', 'work_permit'].includes(nricType)) {
      return error('nric_fin_type must be nric, fin, or work_permit', 400)
    }
    if (!validateNricFormat(body.nric_fin_full, nricType)) {
      return error('Invalid NRIC/FIN format', 400)
    }
    if (body.consent_given !== true) {
      return error('Consent is required when providing NRIC/FIN data', 400)
    }
    updates.nric_fin_type = nricType
    updates.nric_fin_last4 = body.nric_fin_full.slice(-4)
    updates.nric_fin_encrypted = encrypt(body.nric_fin_full)
    updates.consent_given = true
    updates.consent_at = new Date().toISOString()
  }

  // If company_id changed, update company name and trade from company record
  if (typeof body.company_id === 'string' && body.company_id) {
    const { data: companyRow } = await supabase
      .from('project_companies')
      .select('name, trade')
      .eq('id', body.company_id)
      .single()
    if (companyRow) {
      updates.company = companyRow.name
      if (companyRow.trade) updates.trade = companyRow.trade
    }
  }

  const { data, error: dbError } = await supabase
    .from('workers')
    .update(updates)
    .eq('id', id)
    .eq('organization_id', user.organization_id)
    .select('id, name, phone, company, trade, cert_number, cert_expiry, is_active, created_at, project_id, company_id, nric_fin_type, nric_fin_last4, consent_given')
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
  if (!isOrgAdmin(user)) return error('Admin access required', 403)

  const { id } = await params
  const supabase = await createServiceRoleClient()

  // Soft delete
  const { data, error: dbError } = await supabase
    .from('workers')
    .update({ is_active: false })
    .eq('id', id)
    .eq('organization_id', user.organization_id)
    .select('id')
    .single()

  if (dbError || !data) return error('Worker not found', 404)

  return success({ message: 'Worker deactivated' })
}

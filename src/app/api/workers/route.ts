import { NextRequest } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { isOrgAdmin } from '@/lib/auth/check-admin'
import { success, error } from '@/lib/api/response'

function maskPhone(phone: string | null): string | null {
  if (!phone || phone.length < 4) return phone
  return '****' + phone.slice(-4)
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  const supabase = await createServerSupabaseClient()
  const search = request.nextUrl.searchParams.get('search')
  const projectId = request.nextUrl.searchParams.get('project_id')

  let query = supabase
    .from('workers')
    .select('id, name, phone, company, trade, cert_number, cert_expiry, is_active, created_at, project_id, company_id')
    .eq('organization_id', user.organization_id)
    .eq('is_active', true)
    .order('name')

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  let companyId = request.nextUrl.searchParams.get('company_id')

  // Server-side enforcement: SC users can only query workers from their own company
  if (projectId && !isOrgAdmin(user)) {
    const serviceClient = await createServiceRoleClient()
    const { data: roleData } = await serviceClient
      .from('user_project_roles')
      .select('company_id, project_companies(role)')
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .eq('is_active', true)

    const userCompanyId = roleData?.find((r: { company_id: string | null }) => r.company_id)?.company_id ?? null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userCompanyRole = (roleData as any[])?.find((r) => r.project_companies)?.project_companies?.role ?? null

    // SC users must be restricted to their own company
    if (userCompanyRole !== 'main_contractor' && userCompanyId) {
      companyId = userCompanyId
    }
  }

  if (companyId) {
    query = query.eq('company_id', companyId)
  }

  if (search) {
    const safeSearch = search.replace(/[,)(]/g, '')
    if (safeSearch) {
      query = query.or(`name.ilike.%${safeSearch}%,cert_number.ilike.%${safeSearch}%,company.ilike.%${safeSearch}%`)
    }
  }

  const { data, error: dbError } = await query
  if (dbError) return error(dbError.message, 500)

  const admin = isOrgAdmin(user)
  const masked = admin ? data : data?.map((w) => ({ ...w, phone: maskPhone(w.phone) }))

  return success(masked)
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)
  if (!isOrgAdmin(user)) return error('Admin access required', 403)

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return error('Invalid JSON', 400)
  }

  if (!body.name || typeof body.name !== 'string') {
    return error('name is required', 400)
  }

  const supabase = await createServiceRoleClient()

  // If company_id provided, look up company name and trade
  let companyName = typeof body.company === 'string' ? body.company : null
  let companyTrade: string | null = typeof body.trade === 'string' ? body.trade : null
  if (typeof body.company_id === 'string' && body.company_id) {
    const { data: companyRow } = await supabase
      .from('project_companies')
      .select('name, trade')
      .eq('id', body.company_id)
      .single()
    if (companyRow) {
      companyName = companyRow.name
      if (companyRow.trade) companyTrade = companyRow.trade
    }
  }

  const { data, error: dbError } = await supabase
    .from('workers')
    .insert({
      organization_id: user.organization_id,
      name: body.name as string,
      phone: typeof body.phone === 'string' ? body.phone : null,
      company: companyName,
      trade: companyTrade,
      cert_number: typeof body.cert_number === 'string' ? body.cert_number : null,
      cert_expiry: typeof body.cert_expiry === 'string' && body.cert_expiry ? body.cert_expiry : null,
      project_id: typeof body.project_id === 'string' ? body.project_id : null,
      company_id: typeof body.company_id === 'string' ? body.company_id : null,
    })
    .select('id, name, phone, company, trade, cert_number, cert_expiry, is_active, created_at, project_id, company_id')
    .single()

  if (dbError) return error(dbError.message, 500)

  return success(data, 201)
}

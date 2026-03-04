import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { success, error } from '@/lib/api/response'

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  const supabase = await createServerSupabaseClient()
  const search = request.nextUrl.searchParams.get('search')

  let query = supabase
    .from('workers')
    .select('id, name, phone, company, trade, cert_number, cert_expiry, is_active, created_at')
    .eq('organization_id', user.organization_id)
    .eq('is_active', true)
    .order('name')

  if (search) {
    const safeSearch = search.replace(/[,)(]/g, '')
    if (safeSearch) {
      query = query.or(`name.ilike.%${safeSearch}%,cert_number.ilike.%${safeSearch}%,company.ilike.%${safeSearch}%`)
    }
  }

  const { data, error: dbError } = await query
  if (dbError) return error(dbError.message, 500)

  return success(data)
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return error('Invalid JSON', 400)
  }

  if (!body.name || typeof body.name !== 'string') {
    return error('name is required', 400)
  }

  const supabase = await createServerSupabaseClient()
  const { data, error: dbError } = await supabase
    .from('workers')
    .insert({
      organization_id: user.organization_id,
      name: body.name as string,
      phone: typeof body.phone === 'string' ? body.phone : null,
      company: typeof body.company === 'string' ? body.company : null,
      trade: typeof body.trade === 'string' ? body.trade : null,
      cert_number: typeof body.cert_number === 'string' ? body.cert_number : null,
      cert_expiry: typeof body.cert_expiry === 'string' ? body.cert_expiry : null,
    })
    .select('id, name, phone, company, trade, cert_number, cert_expiry, is_active, created_at')
    .single()

  if (dbError) return error(dbError.message, 500)

  return success(data, 201)
}

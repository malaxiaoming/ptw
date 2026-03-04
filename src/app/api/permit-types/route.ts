import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { success, error } from '@/lib/api/response'

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  if (!user.organization_id) {
    return success([])
  }

  const activeOnly = request.nextUrl.searchParams.get('active_only') !== 'false'

  const supabase = await createServerSupabaseClient()

  let query = supabase
    .from('permit_types')
    .select('id, name, code, checklist_template, is_active, created_at')
    .eq('organization_id', user.organization_id)

  if (activeOnly) {
    query = query.eq('is_active', true)
  }

  query = query.order('name', { ascending: true })

  const { data, error: dbError } = await query

  if (dbError) return error(dbError.message, 500)

  return success(data)
}

import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { success, error } from '@/lib/api/response'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)
  if (!user.organization_id) return error('No organization', 404)

  const supabase = await createServerSupabaseClient()
  const { data, error: dbError } = await supabase
    .from('organizations')
    .select('id, name, created_at')
    .eq('id', user.organization_id)
    .single()

  if (dbError) return error(dbError.message, 500)
  return success(data)
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)
  if (!user.is_admin) return error('Forbidden', 403)
  if (!user.organization_id) return error('No organization', 404)

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return error('Invalid JSON', 400)
  }

  if (body.name === undefined) return error('No fields to update', 400)
  if (typeof body.name !== 'string' || body.name.trim() === '') {
    return error('name cannot be empty', 400)
  }

  const supabase = await createServerSupabaseClient()
  const { data, error: dbError } = await supabase
    .from('organizations')
    .update({ name: (body.name as string).trim() })
    .eq('id', user.organization_id)
    .select('id, name, created_at')
    .single()

  if (dbError) return error(dbError.message, 500)
  return success(data)
}

import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { success, error } from '@/lib/api/response'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)
  return success(user)
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return error('Invalid JSON', 400)
  }

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim() === '') {
      return error('name cannot be empty', 400)
    }
  }

  const updates: Record<string, unknown> = {}
  if (body.name !== undefined) updates.name = (body.name as string).trim()
  if (body.phone !== undefined) updates.phone = body.phone || null

  if (Object.keys(updates).length === 0) return error('No fields to update', 400)

  const supabase = await createServerSupabaseClient()
  const { data, error: dbError } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', user.id)
    .select('id, email, phone, name, organization_id, created_at')
    .single()

  if (dbError) return error(dbError.message, 500)
  return success(data)
}

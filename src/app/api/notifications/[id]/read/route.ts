import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { success, error } from '@/lib/api/response'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  const { id } = await params
  const supabase = await createServerSupabaseClient()

  if (id === 'all') {
    const { error: dbError } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    if (dbError) return error(dbError.message, 500)
  } else {
    const { error: dbError } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', user.id)

    if (dbError) return error(dbError.message, 500)
  }

  return success({ ok: true })
}

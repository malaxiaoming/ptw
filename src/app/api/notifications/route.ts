import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { success, error } from '@/lib/api/response'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  const supabase = await createServerSupabaseClient()

  const [notificationsResult, countResult] = await Promise.all([
    supabase
      .from('notifications')
      .select('id, permit_id, type, title, message, is_read, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false),
  ])

  if (notificationsResult.error) return error(notificationsResult.error.message, 500)

  return success({
    notifications: notificationsResult.data,
    unread_count: countResult.count ?? 0,
  })
}

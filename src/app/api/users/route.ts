import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { success, error } from '@/lib/api/response'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  if (!user.organization_id) {
    return success([])
  }

  const supabase = await createServerSupabaseClient()

  // Admin check
  const { data: adminRoles } = await supabase
    .from('user_project_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')

  if (!adminRoles || adminRoles.length === 0) {
    return error('Admin access required', 403)
  }

  const { data, error: dbError } = await supabase
    .from('user_profiles')
    .select('id, email, phone, name, organization_id, created_at')
    .eq('organization_id', user.organization_id)
    .order('name', { ascending: true })

  if (dbError) return error(dbError.message, 500)

  return success(data)
}

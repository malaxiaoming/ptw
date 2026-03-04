import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Role } from './permissions'

export async function getUserRolesForProject(
  userId: string,
  projectId: string
): Promise<Role[]> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('user_project_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('project_id', projectId)

  return (data ?? []).map((r) => r.role as Role)
}

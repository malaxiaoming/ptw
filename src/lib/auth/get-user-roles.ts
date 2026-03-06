import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROLE_PERMISSIONS, type Role } from './permissions'

const VALID_ROLES = Object.keys(ROLE_PERMISSIONS) as Role[]

function isValidRole(value: unknown): value is Role {
  return typeof value === 'string' && VALID_ROLES.includes(value as Role)
}

export async function getUserRolesForProject(
  userId: string,
  projectId: string
): Promise<Role[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('user_project_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .eq('is_active', true)

  if (error) {
    throw new Error(`Failed to fetch user roles: ${error.message}`)
  }

  return (data ?? []).map((r) => r.role).filter(isValidRole)
}

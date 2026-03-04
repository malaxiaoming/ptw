import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Returns true if userId has an admin role on any project belonging to organizationId.
 * Throws on DB error (caller should handle).
 */
export async function isOrgAdmin(
  supabase: SupabaseClient,
  userId: string,
  organizationId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_project_roles')
    .select('role, projects!inner(organization_id)')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .eq('projects.organization_id', organizationId)
    .limit(1)

  if (error) throw new Error(`Admin check failed: ${error.message}`)
  return (data ?? []).length > 0
}

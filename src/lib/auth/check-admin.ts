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
  // Get project IDs belonging to the org
  const { data: projects, error: projError } = await supabase
    .from('projects')
    .select('id')
    .eq('organization_id', organizationId)

  if (projError) throw new Error(`Admin check failed: ${projError.message}`)
  const projectIds = (projects ?? []).map((p: { id: string }) => p.id)
  if (projectIds.length === 0) return false

  // Check if user has admin role in any of those projects
  const { data, error } = await supabase
    .from('user_project_roles')
    .select('id')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .in('project_id', projectIds)
    .limit(1)

  if (error) throw new Error(`Admin check failed: ${error.message}`)
  return (data ?? []).length > 0
}

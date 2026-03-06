import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { success, error } from '@/lib/api/response'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  const supabase = await createServerSupabaseClient()

  // Get all projects this user has access to
  const { data: userRoles, error: rolesError } = await supabase
    .from('user_project_roles')
    .select('project_id, role')
    .eq('user_id', user.id)
    .eq('is_active', true)

  if (rolesError) return error(rolesError.message, 500)

  const projectIds = (userRoles ?? []).map((r) => r.project_id)

  if (projectIds.length === 0) {
    return success({
      pending_actions: [],
      status_counts: {},
      expiring_soon: [],
      recent_activity: [],
    })
  }

  // 1. My Pending Actions — permits waiting for THIS user's action
  // Applicant: draft (own) | Verifier: submitted, closure_submitted | Approver: verified
  const applicantRoleProjects = (userRoles ?? []).filter(r => r.role === 'applicant').map(r => r.project_id)
  const verifierRoleProjects = (userRoles ?? []).filter(r => r.role === 'verifier').map(r => r.project_id)
  const approverRoleProjects = (userRoles ?? []).filter(r => r.role === 'approver').map(r => r.project_id)

  type PendingQueryResult = Promise<{ data: unknown[] | null; error: unknown }>

  // Build pending actions queries in parallel
  const pendingQueries: PendingQueryResult[] = []

  // Applicant sees own drafts
  if (applicantRoleProjects.length > 0) {
    pendingQueries.push(
      supabase
        .from('permits')
        .select('id, permit_number, status, project_id, permit_type_id, created_at, updated_at')
        .eq('applicant_id', user.id)
        .eq('status', 'draft')
        .in('project_id', applicantRoleProjects)
        .order('updated_at', { ascending: false })
        .limit(10) as unknown as PendingQueryResult
    )
  }

  // Verifier sees submitted + closure_submitted
  if (verifierRoleProjects.length > 0) {
    pendingQueries.push(
      supabase
        .from('permits')
        .select('id, permit_number, status, project_id, permit_type_id, created_at, updated_at')
        .in('status', ['submitted', 'closure_submitted'])
        .in('project_id', verifierRoleProjects)
        .order('updated_at', { ascending: false })
        .limit(10) as unknown as PendingQueryResult
    )
  }

  // Approver sees verified
  if (approverRoleProjects.length > 0) {
    pendingQueries.push(
      supabase
        .from('permits')
        .select('id, permit_number, status, project_id, permit_type_id, created_at, updated_at')
        .eq('status', 'verified')
        .in('project_id', approverRoleProjects)
        .order('updated_at', { ascending: false })
        .limit(10) as unknown as PendingQueryResult
    )
  }

  // 2. Permits by Status counts — all permits user can see
  const { data: allPermits, error: allError } = await supabase
    .from('permits')
    .select('id, status')
    .in('project_id', projectIds)

  if (allError) return error(allError.message, 500)

  // 3. Expiring Soon — active permits with scheduled_end within 48 hours
  const now = new Date()
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000)

  const { data: expiringSoon, error: expiryError } = await supabase
    .from('permits')
    .select('id, permit_number, status, project_id, scheduled_end, applicant_id')
    .eq('status', 'active')
    .in('project_id', projectIds)
    .lte('scheduled_end', in48h.toISOString())
    .gte('scheduled_end', now.toISOString())
    .order('scheduled_end')
    .limit(10)

  if (expiryError) return error(expiryError.message, 500)

  // 4. Recent Activity
  const { data: recentActivity, error: activityError } = await supabase
    .from('permit_activity_log')
    .select('id, permit_id, action, performed_by, comments, created_at')
    .in('permit_id',
      // Use permit IDs from all accessible projects
      allPermits?.map(p => p.id) ?? []
    )
    .order('created_at', { ascending: false })
    .limit(10)

  if (activityError) return error(activityError.message, 500)

  // Execute pending queries
  const pendingResults = await Promise.all(pendingQueries)
  const pendingPermits = pendingResults.flatMap((r) => {
    if (r.error) {
      console.error('[dashboard/stats] Failed to fetch pending permits:', (r.error as { message?: string }).message)
    }
    return r.data ?? []
  })

  // Deduplicate pending permits by ID
  const seenIds = new Set<string>()
  const dedupedPending = pendingPermits.filter((p: unknown) => {
    const permit = p as { id: string }
    if (seenIds.has(permit.id)) return false
    seenIds.add(permit.id)
    return true
  })

  // Compute status counts
  const statusCounts: Record<string, number> = {}
  for (const permit of allPermits ?? []) {
    statusCounts[permit.status] = (statusCounts[permit.status] ?? 0) + 1
  }

  return success({
    pending_actions: dedupedPending.slice(0, 10),
    status_counts: statusCounts,
    expiring_soon: expiringSoon ?? [],
    recent_activity: recentActivity ?? [],
  })
}

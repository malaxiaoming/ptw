import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { success, error } from '@/lib/api/response'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  const { id } = await params

  const supabase = await createServerSupabaseClient()

  // Check user has access to this project
  const { data: userRoles } = await supabase
    .from('user_project_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('project_id', id)
    .eq('is_active', true)

  const roles = (userRoles ?? []).map((r) => r.role)

  if (roles.length === 0 && user.is_admin !== true) {
    return error('Forbidden', 403)
  }

  // 1. My Pending Actions — role-aware queries
  type PendingQueryResult = Promise<{ data: unknown[] | null; error: unknown }>
  const pendingQueries: PendingQueryResult[] = []

  const selectFields = 'id, permit_number, status, created_at, updated_at, permit_type_id, permit_types(name, code)'

  // Applicant sees own drafts
  if (roles.includes('applicant')) {
    pendingQueries.push(
      supabase
        .from('permits')
        .select(selectFields)
        .eq('applicant_id', user.id)
        .eq('project_id', id)
        .eq('status', 'draft')
        .order('updated_at', { ascending: false })
        .limit(10) as unknown as PendingQueryResult
    )
  }

  // Verifier sees submitted + closure_submitted
  if (roles.includes('verifier')) {
    pendingQueries.push(
      supabase
        .from('permits')
        .select(selectFields)
        .eq('project_id', id)
        .in('status', ['submitted', 'closure_submitted'])
        .order('updated_at', { ascending: false })
        .limit(10) as unknown as PendingQueryResult
    )
  }

  // Approver sees verified
  if (roles.includes('approver')) {
    pendingQueries.push(
      supabase
        .from('permits')
        .select(selectFields)
        .eq('project_id', id)
        .eq('status', 'verified')
        .order('updated_at', { ascending: false })
        .limit(10) as unknown as PendingQueryResult
    )
  }

  const pendingResults = await Promise.all(pendingQueries)
  const pendingPermits = pendingResults.flatMap((r) => {
    if (r.error) {
      console.error('[permit-summary] Failed to fetch pending permits:', (r.error as { message?: string }).message)
    }
    return r.data ?? []
  })

  // Deduplicate by permit ID
  const seenIds = new Set<string>()
  const dedupedPending = pendingPermits.filter((p: unknown) => {
    const permit = p as { id: string }
    if (seenIds.has(permit.id)) return false
    seenIds.add(permit.id)
    return true
  }).slice(0, 10)

  // 2. Stats — count permits by status
  const { data: allPermits } = await supabase
    .from('permits')
    .select('id, status, scheduled_end')
    .eq('project_id', id)

  const statusCounts: Record<string, number> = {}
  for (const permit of allPermits ?? []) {
    statusCounts[permit.status] = (statusCounts[permit.status] ?? 0) + 1
  }

  // Expiring soon: active permits with scheduled_end within 48 hours
  const now = new Date()
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000)
  const expiringCount = (allPermits ?? []).filter((p) => {
    if (p.status !== 'active' || !p.scheduled_end) return false
    const end = new Date(p.scheduled_end)
    return end >= now && end <= in48h
  }).length

  // 3. Recent Permits — last 10
  const { data: recentPermits } = await supabase
    .from('permits')
    .select('id, permit_number, status, created_at, permit_types(name, code)')
    .eq('project_id', id)
    .order('created_at', { ascending: false })
    .limit(10)

  return success({
    my_actions: dedupedPending,
    stats: { ...statusCounts, expiring_soon: expiringCount },
    recent_permits: recentPermits ?? [],
  })
}

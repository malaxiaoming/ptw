import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock getCurrentUser
vi.mock('@/lib/auth/get-user', () => ({
  getCurrentUser: vi.fn(),
}))

// Mock createServerSupabaseClient
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { getCurrentUser } from '@/lib/auth/get-user'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { GET } from '@/app/api/dashboard/stats/route'

const mockGetCurrentUser = vi.mocked(getCurrentUser)
const mockCreateClient = vi.mocked(createServerSupabaseClient)

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  phone: null,
  name: 'Test User',
  organization_id: 'org-1',
  is_admin: false,
  created_at: '2024-01-01T00:00:00Z',
}

/**
 * Builds a full Supabase query chain mock that resolves at .limit().
 */
function makeFullChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
  }
  return chain
}

/**
 * Builds a roles query chain — resolves at the second .eq() call.
 * The route does:  .select('project_id, role').eq('user_id', user.id).eq('is_active', true)
 */
function makeRolesChain(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
  }
  let eqCount = 0
  chain.eq.mockImplementation(() => {
    eqCount++
    if (eqCount === 2) return Promise.resolve(result)
    return chain
  })
  return chain
}

/**
 * Builds an allPermits chain — resolves at .in() (single call).
 * The route does: .select('id, status').in('project_id', projectIds)
 */
function makeAllPermitsChain(result: { data: unknown; error: unknown }) {
  return {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue(result),
  }
}

describe('GET /api/dashboard/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 if not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('returns empty stats when user has no project roles', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)

    // user_project_roles returns empty — early return path
    const rolesChain = makeRolesChain({ data: [], error: null })

    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(rolesChain),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toEqual({
      pending_actions: [],
      status_counts: {},
      expiring_soon: [],
      recent_activity: [],
    })
  })

  it('returns 500 on DB error when fetching user roles', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)

    // rolesError is set — route should return 500
    const rolesChain = makeRolesChain({ data: null, error: { message: 'roles DB error' } })

    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(rolesChain),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe('roles DB error')
  })

  it('returns status_counts correctly when permits exist', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)

    // User is an applicant on proj-1
    const userRoles = [{ project_id: 'proj-1', role: 'applicant' }]
    const allPermitsData = [
      { id: 'p-1', status: 'draft' },
      { id: 'p-2', status: 'draft' },
      { id: 'p-3', status: 'active' },
    ]

    // from() call order:
    // 1: user_project_roles
    // 2: permits (applicant pending — built before allPermits query)
    // 3: permits (allPermits — awaited sequentially)
    // 4: permits (expiringSoon — awaited sequentially)
    // 5: permit_activity_log (recentActivity — awaited sequentially)
    // pending queries resolved in Promise.all after step 5

    let fromCallCount = 0

    const rolesChain = makeRolesChain({ data: userRoles, error: null })
    const pendingApplicantChain = makeFullChain({ data: [], error: null })
    const allPermitsChain = makeAllPermitsChain({ data: allPermitsData, error: null })
    const expiryChain = makeFullChain({ data: [], error: null })
    const activityChain = makeFullChain({ data: [], error: null })

    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockImplementation(() => {
        fromCallCount++
        if (fromCallCount === 1) return rolesChain
        if (fromCallCount === 2) return pendingApplicantChain  // applicant pending
        if (fromCallCount === 3) return allPermitsChain        // allPermits
        if (fromCallCount === 4) return expiryChain            // expiringSoon
        if (fromCallCount === 5) return activityChain          // recentActivity
        return makeFullChain({ data: [], error: null })
      }),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.status_counts).toEqual({ draft: 2, active: 1 })
    expect(body.data.expiring_soon).toEqual([])
    expect(body.data.recent_activity).toEqual([])
  })

  it('returns pending_actions for an applicant (own drafts)', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)

    const userRoles = [{ project_id: 'proj-1', role: 'applicant' }]
    const draftPermits = [
      {
        id: 'p-1',
        permit_number: 'PTW-2024-0001',
        status: 'draft',
        project_id: 'proj-1',
        permit_type_id: 'type-1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      },
    ]

    // from() order: roles, applicant-pending, allPermits, expiry, activity
    let fromCallCount = 0

    const rolesChain = makeRolesChain({ data: userRoles, error: null })
    const pendingApplicantChain = makeFullChain({ data: draftPermits, error: null })
    const allPermitsChain = makeAllPermitsChain({ data: draftPermits.map(p => ({ id: p.id, status: p.status })), error: null })
    const expiryChain = makeFullChain({ data: [], error: null })
    const activityChain = makeFullChain({ data: [], error: null })

    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockImplementation(() => {
        fromCallCount++
        if (fromCallCount === 1) return rolesChain
        if (fromCallCount === 2) return pendingApplicantChain
        if (fromCallCount === 3) return allPermitsChain
        if (fromCallCount === 4) return expiryChain
        if (fromCallCount === 5) return activityChain
        return makeFullChain({ data: [], error: null })
      }),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.pending_actions).toHaveLength(1)
    expect(body.data.pending_actions[0].permit_number).toBe('PTW-2024-0001')
    expect(body.data.pending_actions[0].status).toBe('draft')
  })

  it('returns pending_actions for a verifier (submitted permits in their projects)', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)

    const userRoles = [{ project_id: 'proj-1', role: 'verifier' }]
    const submittedPermits = [
      {
        id: 'p-2',
        permit_number: 'PTW-2024-0002',
        status: 'submitted',
        project_id: 'proj-1',
        permit_type_id: 'type-1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-03T00:00:00Z',
      },
    ]

    // from() order: roles, verifier-pending, allPermits, expiry, activity
    let fromCallCount = 0

    const rolesChain = makeRolesChain({ data: userRoles, error: null })
    // Verifier pending chain: .select().in('status',[...]).in('project_id',...).order().limit()
    const pendingVerifierChain = makeFullChain({ data: submittedPermits, error: null })
    const allPermitsChain = makeAllPermitsChain({ data: submittedPermits.map(p => ({ id: p.id, status: p.status })), error: null })
    const expiryChain = makeFullChain({ data: [], error: null })
    const activityChain = makeFullChain({ data: [], error: null })

    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockImplementation(() => {
        fromCallCount++
        if (fromCallCount === 1) return rolesChain
        if (fromCallCount === 2) return pendingVerifierChain  // verifier pending
        if (fromCallCount === 3) return allPermitsChain
        if (fromCallCount === 4) return expiryChain
        if (fromCallCount === 5) return activityChain
        return makeFullChain({ data: [], error: null })
      }),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.pending_actions).toHaveLength(1)
    expect(body.data.pending_actions[0].permit_number).toBe('PTW-2024-0002')
    expect(body.data.pending_actions[0].status).toBe('submitted')
  })

  it('returns expiring_soon for active permits within 48h', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)

    const userRoles = [{ project_id: 'proj-1', role: 'approver' }]
    const expiringPermit = {
      id: 'p-3',
      permit_number: 'PTW-2024-0003',
      status: 'active',
      project_id: 'proj-1',
      scheduled_end: new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString(), // 10h from now
      applicant_id: 'user-2',
    }

    // from() order: roles, approver-pending, allPermits, expiry, activity
    let fromCallCount = 0

    const rolesChain = makeRolesChain({ data: userRoles, error: null })
    const pendingApproverChain = makeFullChain({ data: [], error: null })
    const allPermitsChain = makeAllPermitsChain({ data: [{ id: 'p-3', status: 'active' }], error: null })
    const expiryChain = makeFullChain({ data: [expiringPermit], error: null })
    const activityChain = makeFullChain({ data: [], error: null })

    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockImplementation(() => {
        fromCallCount++
        if (fromCallCount === 1) return rolesChain
        if (fromCallCount === 2) return pendingApproverChain  // approver pending
        if (fromCallCount === 3) return allPermitsChain
        if (fromCallCount === 4) return expiryChain
        if (fromCallCount === 5) return activityChain
        return makeFullChain({ data: [], error: null })
      }),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.expiring_soon).toHaveLength(1)
    expect(body.data.expiring_soon[0].permit_number).toBe('PTW-2024-0003')
    expect(body.data.expiring_soon[0].status).toBe('active')
  })

  it('returns 200 with empty pending_actions when a pending query errors', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)

    // User is an applicant on proj-1; the pending applicant query will return an error
    const userRoles = [{ project_id: 'proj-1', role: 'applicant' }]

    // from() order: roles, applicant-pending (error), allPermits, expiry, activity
    let fromCallCount = 0

    const rolesChain = makeRolesChain({ data: userRoles, error: null })
    const pendingApplicantErrorChain = makeFullChain({ data: null, error: { message: 'pending query DB error' } })
    const allPermitsChain = makeAllPermitsChain({ data: [], error: null })
    const expiryChain = makeFullChain({ data: [], error: null })
    const activityChain = makeFullChain({ data: [], error: null })

    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockImplementation(() => {
        fromCallCount++
        if (fromCallCount === 1) return rolesChain
        if (fromCallCount === 2) return pendingApplicantErrorChain  // applicant pending — errors
        if (fromCallCount === 3) return allPermitsChain
        if (fromCallCount === 4) return expiryChain
        if (fromCallCount === 5) return activityChain
        return makeFullChain({ data: [], error: null })
      }),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const res = await GET()
    const body = await res.json()

    // Error is logged but not fatal — API still returns 200 with empty pending_actions
    expect(res.status).toBe(200)
    expect(body.data.pending_actions).toEqual([])
    expect(body.data.status_counts).toEqual({})
    expect(body.data.expiring_soon).toEqual([])
    expect(body.data.recent_activity).toEqual([])
  })

  it('returns 500 on DB error when fetching all permits', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)

    const userRoles = [{ project_id: 'proj-1', role: 'applicant' }]

    // from() order: roles, applicant-pending, allPermits (error)
    let fromCallCount = 0

    const rolesChain = makeRolesChain({ data: userRoles, error: null })
    const pendingApplicantChain = makeFullChain({ data: [], error: null })
    const allPermitsChain = makeAllPermitsChain({ data: null, error: { message: 'permits DB error' } })

    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockImplementation(() => {
        fromCallCount++
        if (fromCallCount === 1) return rolesChain
        if (fromCallCount === 2) return pendingApplicantChain
        if (fromCallCount === 3) return allPermitsChain
        return makeFullChain({ data: [], error: null })
      }),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe('permits DB error')
  })
})

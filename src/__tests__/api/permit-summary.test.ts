import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth/get-user', () => ({
  getCurrentUser: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { getCurrentUser } from '@/lib/auth/get-user'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { GET } from '@/app/api/projects/[id]/permit-summary/route'

const mockGetCurrentUser = vi.mocked(getCurrentUser)
const mockCreateClient = vi.mocked(createServerSupabaseClient)

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  phone: null,
  name: 'Test User',
  organization_id: 'org-1',
  organization_name: null,
  is_admin: false,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
}

const mockAdminUser = {
  ...mockUser,
  id: 'admin-1',
  is_admin: true,
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

function makeRequest() {
  return new NextRequest('http://localhost/api/projects/proj-1/permit-summary')
}

function makeFullChain(result: { data: unknown; error: unknown }) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
  }
}

function makeRolesChain(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
  }
  let eqCount = 0
  chain.eq.mockImplementation(() => {
    eqCount++
    if (eqCount === 3) return Promise.resolve(result)
    return chain
  })
  return chain
}

describe('GET /api/projects/[id]/permit-summary', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 401 if not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null)
    const res = await GET(makeRequest(), makeParams('proj-1'))
    const body = await res.json()
    expect(res.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 403 if user has no roles on project and is not admin', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)

    const rolesChain = makeRolesChain({ data: [], error: null })

    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(rolesChain),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const res = await GET(makeRequest(), makeParams('proj-1'))
    const body = await res.json()
    expect(res.status).toBe(403)
    expect(body.error).toBe('Forbidden')
  })

  it('allows admin access even without project roles', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)

    // Roles chain returns empty (admin has no project roles)
    const rolesChain = makeRolesChain({ data: [], error: null })
    // allPermits chain
    const allPermitsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    // recentPermits chain
    const recentChain = makeFullChain({ data: [], error: null })

    let fromCallCount = 0
    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockImplementation(() => {
        fromCallCount++
        if (fromCallCount === 1) return rolesChain       // user_project_roles
        if (fromCallCount === 2) return allPermitsChain   // allPermits
        if (fromCallCount === 3) return recentChain       // recentPermits
        return makeFullChain({ data: [], error: null })
      }),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const res = await GET(makeRequest(), makeParams('proj-1'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.my_actions).toEqual([])
    expect(body.data.recent_permits).toEqual([])
  })

  it('returns my_actions for verifier with submitted permits', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)

    const rolesChain = makeRolesChain({ data: [{ role: 'verifier' }], error: null })
    const pendingVerifierChain = makeFullChain({
      data: [{
        id: 'p-1',
        permit_number: 'PTW-0001',
        status: 'submitted',
        created_at: '2024-01-01',
        updated_at: '2024-01-02',
        permit_type_id: 't-1',
        permit_types: { name: 'Hot Work', code: 'HW' },
      }],
      error: null,
    })
    const allPermitsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [
          { id: 'p-1', status: 'submitted', scheduled_end: null },
          { id: 'p-2', status: 'active', scheduled_end: null },
        ],
        error: null,
      }),
    }
    const recentChain = makeFullChain({
      data: [
        { id: 'p-1', permit_number: 'PTW-0001', status: 'submitted', created_at: '2024-01-01' },
        { id: 'p-2', permit_number: 'PTW-0002', status: 'active', created_at: '2024-01-02' },
      ],
      error: null,
    })

    let fromCallCount = 0
    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockImplementation(() => {
        fromCallCount++
        if (fromCallCount === 1) return rolesChain
        if (fromCallCount === 2) return pendingVerifierChain  // verifier pending
        if (fromCallCount === 3) return allPermitsChain       // allPermits
        if (fromCallCount === 4) return recentChain           // recentPermits
        return makeFullChain({ data: [], error: null })
      }),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const res = await GET(makeRequest(), makeParams('proj-1'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.my_actions).toHaveLength(1)
    expect(body.data.my_actions[0].permit_number).toBe('PTW-0001')
    expect(body.data.stats.submitted).toBe(1)
    expect(body.data.stats.active).toBe(1)
    expect(body.data.stats.expiring_soon).toBe(0)
    expect(body.data.recent_permits).toHaveLength(2)
  })

  it('computes expiring_soon count from active permits within 48h', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)

    const rolesChain = makeRolesChain({ data: [{ role: 'applicant' }], error: null })
    const pendingChain = makeFullChain({ data: [], error: null })

    const in12h = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
    const in72h = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
    const allPermitsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [
          { id: 'p-1', status: 'active', scheduled_end: in12h },  // expiring
          { id: 'p-2', status: 'active', scheduled_end: in72h },  // not expiring
          { id: 'p-3', status: 'draft', scheduled_end: in12h },   // draft, not active
        ],
        error: null,
      }),
    }
    const recentChain = makeFullChain({ data: [], error: null })

    let fromCallCount = 0
    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockImplementation(() => {
        fromCallCount++
        if (fromCallCount === 1) return rolesChain
        if (fromCallCount === 2) return pendingChain
        if (fromCallCount === 3) return allPermitsChain
        if (fromCallCount === 4) return recentChain
        return makeFullChain({ data: [], error: null })
      }),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const res = await GET(makeRequest(), makeParams('proj-1'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.stats.expiring_soon).toBe(1)
    expect(body.data.stats.active).toBe(2)
    expect(body.data.stats.draft).toBe(1)
  })
})

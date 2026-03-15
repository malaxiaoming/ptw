import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth/get-user', () => ({ getCurrentUser: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
  createServiceRoleClient: vi.fn(),
}))
vi.mock('@/lib/auth/check-admin', () => ({ isOrgAdmin: vi.fn() }))

import { getCurrentUser } from '@/lib/auth/get-user'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { isOrgAdmin } from '@/lib/auth/check-admin'
import { GET, POST } from '@/app/api/workers/[id]/sic/route'

const mockGetCurrentUser = vi.mocked(getCurrentUser)
const mockCreateServiceClient = vi.mocked(createServiceRoleClient)
const mockIsOrgAdmin = vi.mocked(isOrgAdmin)

const mockUser = {
  id: 'user-1', email: 'test@example.com', phone: null, name: 'Test User',
  organization_id: 'org-1', organization_name: null, is_admin: false, is_active: true, created_at: '2024-01-01T00:00:00Z',
}
const mockAdminUser = { ...mockUser, is_admin: true }

function makeRequest(url: string, options?: ConstructorParameters<typeof NextRequest>[1]): NextRequest {
  return new NextRequest(url, options)
}
function makeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

describe('GET /api/workers/[id]/sic', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 if not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null)
    const res = await GET(makeRequest('http://localhost/api/workers/w-1/sic'), makeParams('w-1'))
    expect(res.status).toBe(401)
  })

  it('returns SIC records for worker', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)
    mockIsOrgAdmin.mockReturnValue(false)

    const sicRecords = [
      { id: 'sic-1', worker_id: 'w-1', project_id: 'p-1', sic_number: 'SIC001', sic_expiry: '2026-12-31', sic_issuer: 'MainCo', issued_at: '2025-01-01', is_active: true, created_at: '2025-01-01T00:00:00Z' },
    ]

    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: sicRecords, error: null }),
    }
    mockCreateServiceClient.mockResolvedValue({ from: vi.fn().mockReturnValue(chain) } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

    const res = await GET(makeRequest('http://localhost/api/workers/w-1/sic'), makeParams('w-1'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toEqual(sicRecords)
  })
})

describe('POST /api/workers/[id]/sic', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 if not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null)
    const res = await POST(
      makeRequest('http://localhost/api/workers/w-1/sic', {
        method: 'POST', body: JSON.stringify({ project_id: 'p-1', sic_number: 'SIC001' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      makeParams('w-1')
    )
    expect(res.status).toBe(401)
  })

  it('returns 403 if not admin', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)
    mockIsOrgAdmin.mockReturnValue(false)

    const res = await POST(
      makeRequest('http://localhost/api/workers/w-1/sic', {
        method: 'POST', body: JSON.stringify({ project_id: 'p-1', sic_number: 'SIC001' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      makeParams('w-1')
    )
    expect(res.status).toBe(403)
  })

  it('returns 400 if project_id missing', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)
    mockIsOrgAdmin.mockReturnValue(true)

    const res = await POST(
      makeRequest('http://localhost/api/workers/w-1/sic', {
        method: 'POST', body: JSON.stringify({ sic_number: 'SIC001' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      makeParams('w-1')
    )
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toBe('project_id is required')
  })

  it('returns 400 if sic_number missing', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)
    mockIsOrgAdmin.mockReturnValue(true)

    const res = await POST(
      makeRequest('http://localhost/api/workers/w-1/sic', {
        method: 'POST', body: JSON.stringify({ project_id: 'p-1' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      makeParams('w-1')
    )
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toBe('sic_number is required')
  })

  it('creates SIC record and returns 201', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)
    mockIsOrgAdmin.mockReturnValue(true)

    const newSic = {
      id: 'sic-new', worker_id: 'w-1', project_id: 'p-1', sic_number: 'SIC001',
      sic_expiry: '2026-12-31', sic_issuer: 'MainCo', issued_at: '2025-01-01', is_active: true, created_at: '2025-01-01T00:00:00Z',
    }

    let callCount = 0
    const fromMock = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // Worker ownership check
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'w-1' }, error: null }) }
      }
      // Insert chain
      return { insert: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: newSic, error: null }) }
    })
    mockCreateServiceClient.mockResolvedValue({ from: fromMock } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

    const res = await POST(
      makeRequest('http://localhost/api/workers/w-1/sic', {
        method: 'POST',
        body: JSON.stringify({ project_id: 'p-1', sic_number: 'SIC001', sic_expiry: '2026-12-31', sic_issuer: 'MainCo', issued_at: '2025-01-01' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      makeParams('w-1')
    )
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.data).toEqual(newSic)
  })

  it('returns 404 if worker not found', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)
    mockIsOrgAdmin.mockReturnValue(true)

    const fromMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })
    mockCreateServiceClient.mockResolvedValue({ from: fromMock } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

    const res = await POST(
      makeRequest('http://localhost/api/workers/w-999/sic', {
        method: 'POST', body: JSON.stringify({ project_id: 'p-1', sic_number: 'SIC001' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      makeParams('w-999')
    )
    expect(res.status).toBe(404)
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock getCurrentUser
vi.mock('@/lib/auth/get-user', () => ({
  getCurrentUser: vi.fn(),
}))

// Mock supabase clients
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
  createServiceRoleClient: vi.fn(),
}))

// Mock isOrgAdmin
vi.mock('@/lib/auth/check-admin', () => ({
  isOrgAdmin: vi.fn(),
}))

import { getCurrentUser } from '@/lib/auth/get-user'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { isOrgAdmin } from '@/lib/auth/check-admin'
import { GET, POST } from '@/app/api/workers/route'

const mockGetCurrentUser = vi.mocked(getCurrentUser)
const mockCreateClient = vi.mocked(createServerSupabaseClient)
const mockCreateServiceClient = vi.mocked(createServiceRoleClient)
const mockIsOrgAdmin = vi.mocked(isOrgAdmin)

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

const mockAdminUser = { ...mockUser, is_admin: true }

function makeRequest(url: string, options?: ConstructorParameters<typeof NextRequest>[1]): NextRequest {
  return new NextRequest(url, options)
}

describe('GET /api/workers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 if not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const req = makeRequest('http://localhost/api/workers')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('returns worker list with masked phone for non-admin', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)
    mockIsOrgAdmin.mockReturnValue(false)

    const workers = [
      { id: 'w-1', name: 'Alice', phone: '91234567', company: 'BuildCo', trade: 'Electrician', cert_number: 'C001', cert_expiry: '2025-12-31', is_active: true, created_at: '2024-01-01T00:00:00Z', project_id: null, company_id: null },
    ]

    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: workers, error: null }),
      or: vi.fn().mockResolvedValue({ data: workers, error: null }),
    }
    mockCreateClient.mockResolvedValue({ from: vi.fn().mockReturnValue(chain) } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const req = makeRequest('http://localhost/api/workers')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data[0].phone).toBe('****4567')
    expect(body.data[0].cert_number).toBe('C001')
    expect(chain.eq).toHaveBeenCalledWith('organization_id', 'org-1')
    expect(chain.eq).toHaveBeenCalledWith('is_active', true)
  })

  it('returns worker list with full phone for admin', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)
    mockIsOrgAdmin.mockReturnValue(true)

    const workers = [
      { id: 'w-1', name: 'Alice', phone: '91234567', company: 'BuildCo', trade: 'Electrician', cert_number: 'C001', cert_expiry: '2025-12-31', is_active: true, created_at: '2024-01-01T00:00:00Z', project_id: null, company_id: null },
    ]

    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: workers, error: null }),
      or: vi.fn().mockResolvedValue({ data: workers, error: null }),
    }
    mockCreateClient.mockResolvedValue({ from: vi.fn().mockReturnValue(chain) } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const req = makeRequest('http://localhost/api/workers')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data[0].phone).toBe('91234567')
  })

  it('filters by company_id when param is provided', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)
    mockIsOrgAdmin.mockReturnValue(true)

    const workers = [
      { id: 'w-1', name: 'Alice', phone: null, company: 'BuildCo', trade: 'Electrician', cert_number: 'C001', cert_expiry: null, is_active: true, created_at: '2024-01-01T00:00:00Z', project_id: null, company_id: 'comp-1' },
    ]

    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    }
    // The last .eq() call (for company_id) resolves the chain
    let eqCallCount = 0
    chain.eq.mockImplementation(() => {
      eqCallCount++
      return chain
    })
    // order returns chain (so subsequent .eq works), and the final resolution
    // happens when the chain is awaited. We need the chain to be thenable.
    chain.order.mockReturnValue({
      ...chain,
      eq: vi.fn().mockResolvedValue({ data: workers, error: null }),
      then: (resolve: (v: unknown) => void) => resolve({ data: workers, error: null }),
    })

    mockCreateClient.mockResolvedValue({ from: vi.fn().mockReturnValue(chain) } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const req = makeRequest('http://localhost/api/workers?company_id=comp-1')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toEqual(workers)
  })

  it('calls .or() filter when search param is provided', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)
    mockIsOrgAdmin.mockReturnValue(true)

    const workers = [{ id: 'w-1', name: 'Bob', phone: null, company: 'TestCo', trade: 'Welder', cert_number: 'C002', cert_expiry: null, is_active: true, created_at: '2024-01-01T00:00:00Z', project_id: null, company_id: null }]

    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      or: vi.fn().mockResolvedValue({ data: workers, error: null }),
    }
    mockCreateClient.mockResolvedValue({ from: vi.fn().mockReturnValue(chain) } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const req = makeRequest('http://localhost/api/workers?search=Bob')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toEqual(workers)
    expect(chain.or).toHaveBeenCalledWith('name.ilike.%Bob%,cert_number.ilike.%Bob%,company.ilike.%Bob%')
  })
})

describe('POST /api/workers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 if not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const req = makeRequest('http://localhost/api/workers', {
      method: 'POST',
      body: JSON.stringify({ name: 'Alice' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 403 if not admin', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)
    mockIsOrgAdmin.mockReturnValue(false)

    const req = makeRequest('http://localhost/api/workers', {
      method: 'POST',
      body: JSON.stringify({ name: 'Alice' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toBe('Admin access required')
  })

  it('returns 400 if name is missing', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)
    mockIsOrgAdmin.mockReturnValue(true)

    const req = makeRequest('http://localhost/api/workers', {
      method: 'POST',
      body: JSON.stringify({ company: 'BuildCo' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe('name is required')
  })

  it('returns 400 if JSON is malformed', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)
    mockIsOrgAdmin.mockReturnValue(true)

    const req = makeRequest('http://localhost/api/workers', {
      method: 'POST',
      body: 'not-valid-json',
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe('Invalid JSON')
  })

  it('creates worker and returns 201', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)
    mockIsOrgAdmin.mockReturnValue(true)

    const newWorker = {
      id: 'w-new',
      name: 'Charlie',
      phone: '91234567',
      company: 'SafeCo',
      trade: 'Rigger',
      cert_number: 'C003',
      cert_expiry: '2026-06-30',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      project_id: null,
      company_id: null,
    }

    const chain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: newWorker, error: null }),
    }
    mockCreateServiceClient.mockResolvedValue({ from: vi.fn().mockReturnValue(chain) } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

    const req = makeRequest('http://localhost/api/workers', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Charlie',
        phone: '91234567',
        company: 'SafeCo',
        trade: 'Rigger',
        cert_number: 'C003',
        cert_expiry: '2026-06-30',
      }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.data).toEqual(newWorker)
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        organization_id: 'org-1',
        name: 'Charlie',
        phone: '91234567',
        company: 'SafeCo',
      })
    )
  })
})

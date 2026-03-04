import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

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
import { GET, POST } from '@/app/api/workers/route'

const mockGetCurrentUser = vi.mocked(getCurrentUser)
const mockCreateClient = vi.mocked(createServerSupabaseClient)

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  phone: null,
  name: 'Test User',
  organization_id: 'org-1',
  created_at: '2024-01-01T00:00:00Z',
}

function makeRequest(url: string, options?: ConstructorParameters<typeof NextRequest>[1]): NextRequest {
  return new NextRequest(url, options)
}

function makeSupabaseChain(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
  }
  // For list queries (no .single()), resolve from .order() or .or()
  chain.order.mockResolvedValue(result)
  chain.or.mockResolvedValue(result)
  return chain
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

  it('returns worker list for authenticated user scoped to organization_id', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)

    const workers = [
      { id: 'w-1', name: 'Alice', company: 'BuildCo', trade: 'Electrician', cert_number: 'C001', cert_expiry: '2025-12-31', is_active: true, created_at: '2024-01-01T00:00:00Z' },
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
    expect(body.data).toEqual(workers)
    // Verify organization_id scoping
    expect(chain.eq).toHaveBeenCalledWith('organization_id', 'org-1')
    expect(chain.eq).toHaveBeenCalledWith('is_active', true)
  })

  it('calls .or() filter when search param is provided', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)

    const workers = [{ id: 'w-1', name: 'Bob', company: 'TestCo', trade: 'Welder', cert_number: 'C002', cert_expiry: null, is_active: true, created_at: '2024-01-01T00:00:00Z' }]

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

  it('returns 400 if name is missing', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)

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
    mockGetCurrentUser.mockResolvedValue(mockUser)

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
    mockGetCurrentUser.mockResolvedValue(mockUser)

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
    }

    const chain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: newWorker, error: null }),
    }
    mockCreateClient.mockResolvedValue({ from: vi.fn().mockReturnValue(chain) } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

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

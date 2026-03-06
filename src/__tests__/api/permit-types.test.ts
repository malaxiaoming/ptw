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
import { GET } from '@/app/api/permit-types/route'

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

function makeRequest(url: string): NextRequest {
  return new NextRequest(url)
}

function makeSupabaseChain(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue(result),
  }
  return chain
}

describe('GET /api/permit-types', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 if not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const req = makeRequest('http://localhost/api/permit-types')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('returns empty array when user has no organization_id', async () => {
    mockGetCurrentUser.mockResolvedValue({
      ...mockUser,
      organization_id: null,
    })

    const req = makeRequest('http://localhost/api/permit-types')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toEqual([])
  })

  it('returns active permit types by default', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)

    const permitTypes = [
      {
        id: 'pt-1',
        name: 'Hot Work',
        code: 'HW',
        checklist_template: { sections: [], personnel: [] },
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
      },
    ]

    const chain = makeSupabaseChain({ data: permitTypes, error: null })
    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(chain),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const req = makeRequest('http://localhost/api/permit-types')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toEqual(permitTypes)
    // Verify it filters by organization_id
    expect(chain.eq).toHaveBeenCalledWith('organization_id', 'org-1')
    // Verify it filters active_only by default
    expect(chain.eq).toHaveBeenCalledWith('is_active', true)
  })

  it('returns all permit types when active_only=false', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)

    const permitTypes = [
      {
        id: 'pt-1',
        name: 'Hot Work',
        code: 'HW',
        checklist_template: { sections: [], personnel: [] },
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'pt-2',
        name: 'Confined Space',
        code: 'CS',
        checklist_template: { sections: [], personnel: [] },
        is_active: false,
        created_at: '2024-01-01T00:00:00Z',
      },
    ]

    const chain = makeSupabaseChain({ data: permitTypes, error: null })
    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(chain),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const req = makeRequest('http://localhost/api/permit-types?active_only=false')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toEqual(permitTypes)
    // Verify it does NOT filter by is_active when active_only=false
    expect(chain.eq).not.toHaveBeenCalledWith('is_active', true)
  })

  it('returns 500 on database error', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)

    const chain = makeSupabaseChain({ data: null, error: { message: 'DB connection failed' } })
    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(chain),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const req = makeRequest('http://localhost/api/permit-types')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe('DB connection failed')
  })

  it('returns permit types ordered by name', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)

    const chain = makeSupabaseChain({ data: [], error: null })
    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(chain),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const req = makeRequest('http://localhost/api/permit-types')
    await GET(req)

    expect(chain.order).toHaveBeenCalledWith('name', { ascending: true })
  })
})

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
import { GET, PATCH, DELETE } from '@/app/api/workers/[id]/route'

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

const existingWorker = {
  id: 'w-1',
  name: 'Alice',
  phone: '91234567',
  company: 'BuildCo',
  trade: 'Electrician',
  cert_number: 'C001',
  cert_expiry: '2025-12-31',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  project_id: null,
  company_id: null,
}

function makeRequest(url: string, options?: ConstructorParameters<typeof NextRequest>[1]): NextRequest {
  return new NextRequest(url, options)
}

function makeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

describe('GET /api/workers/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 if not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const req = makeRequest('http://localhost/api/workers/w-1')
    const res = await GET(req, makeParams('w-1'))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 404 if worker not found or not in org', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)
    mockIsOrgAdmin.mockReturnValue(false)

    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
    }
    mockCreateClient.mockResolvedValue({ from: vi.fn().mockReturnValue(chain) } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const req = makeRequest('http://localhost/api/workers/w-999')
    const res = await GET(req, makeParams('w-999'))
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error).toBe('Worker not found')
  })

  it('returns worker with masked phone for non-admin', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)
    mockIsOrgAdmin.mockReturnValue(false)

    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { ...existingWorker }, error: null }),
    }
    mockCreateClient.mockResolvedValue({ from: vi.fn().mockReturnValue(chain) } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const req = makeRequest('http://localhost/api/workers/w-1')
    const res = await GET(req, makeParams('w-1'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.phone).toBe('****4567')
    expect(body.data.cert_number).toBe('C001')
  })

  it('returns worker with full phone for admin', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)
    mockIsOrgAdmin.mockReturnValue(true)

    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { ...existingWorker }, error: null }),
    }
    mockCreateClient.mockResolvedValue({ from: vi.fn().mockReturnValue(chain) } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const req = makeRequest('http://localhost/api/workers/w-1')
    const res = await GET(req, makeParams('w-1'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.phone).toBe('91234567')
    expect(chain.eq).toHaveBeenCalledWith('id', 'w-1')
    expect(chain.eq).toHaveBeenCalledWith('organization_id', 'org-1')
  })
})

describe('PATCH /api/workers/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 if not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const req = makeRequest('http://localhost/api/workers/w-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated Name' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req, makeParams('w-1'))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 403 if not admin', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)
    mockIsOrgAdmin.mockReturnValue(false)

    const req = makeRequest('http://localhost/api/workers/w-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated Name' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req, makeParams('w-1'))
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toBe('Admin access required')
  })

  it('returns 404 if worker not in org', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)
    mockIsOrgAdmin.mockReturnValue(true)

    // Ownership check returns null
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    mockCreateServiceClient.mockResolvedValue({ from: vi.fn().mockReturnValue(chain) } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

    const req = makeRequest('http://localhost/api/workers/w-999', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Hacker' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req, makeParams('w-999'))
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error).toBe('Worker not found')
  })

  it('updates only provided fields and returns updated worker', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)
    mockIsOrgAdmin.mockReturnValue(true)

    const updatedWorker = { ...existingWorker, name: 'Alice Updated', trade: 'Senior Electrician' }

    // First call: ownership check
    // Second call: update
    let callCount = 0
    const fromMock = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // Ownership check chain
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'w-1' }, error: null }),
        }
      } else {
        // Update chain
        return {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: updatedWorker, error: null }),
        }
      }
    })
    mockCreateServiceClient.mockResolvedValue({ from: fromMock } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

    const req = makeRequest('http://localhost/api/workers/w-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Alice Updated', trade: 'Senior Electrician' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req, makeParams('w-1'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toEqual(updatedWorker)
  })
})

describe('DELETE /api/workers/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 if not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const req = makeRequest('http://localhost/api/workers/w-1', { method: 'DELETE' })
    const res = await DELETE(req, makeParams('w-1'))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 403 if not admin', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)
    mockIsOrgAdmin.mockReturnValue(false)

    const req = makeRequest('http://localhost/api/workers/w-1', { method: 'DELETE' })
    const res = await DELETE(req, makeParams('w-1'))
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toBe('Admin access required')
  })

  it('soft-deletes (sets is_active=false) and returns 200', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)
    mockIsOrgAdmin.mockReturnValue(true)

    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'w-1' }, error: null }),
    }
    mockCreateServiceClient.mockResolvedValue({ from: vi.fn().mockReturnValue(chain) } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

    const req = makeRequest('http://localhost/api/workers/w-1', { method: 'DELETE' })
    const res = await DELETE(req, makeParams('w-1'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toEqual({ message: 'Worker deactivated' })
    expect(chain.update).toHaveBeenCalledWith({ is_active: false })
    expect(chain.eq).toHaveBeenCalledWith('id', 'w-1')
    expect(chain.eq).toHaveBeenCalledWith('organization_id', 'org-1')
  })

  it('returns 404 if worker not found', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)
    mockIsOrgAdmin.mockReturnValue(true)

    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
    }
    mockCreateServiceClient.mockResolvedValue({ from: vi.fn().mockReturnValue(chain) } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

    const req = makeRequest('http://localhost/api/workers/w-999', { method: 'DELETE' })
    const res = await DELETE(req, makeParams('w-999'))
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error).toBe('Worker not found')
  })
})

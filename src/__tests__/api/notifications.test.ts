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
import { GET } from '@/app/api/notifications/route'
import { POST } from '@/app/api/notifications/[id]/read/route'

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

function makeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

describe('GET /api/notifications', () => {
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

  it('returns notifications and unread count for authenticated user', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)

    const notifications = [
      {
        id: 'notif-1',
        permit_id: 'permit-1',
        type: 'approved',
        title: 'Permit Approved — PTW-2024-0001',
        message: 'Your permit has been approved.',
        is_read: false,
        created_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'notif-2',
        permit_id: 'permit-2',
        type: 'submitted',
        title: 'Permit Submitted for Verification — PTW-2024-0002',
        message: 'A new permit requires your verification.',
        is_read: true,
        created_at: '2024-01-02T00:00:00Z',
      },
    ]

    // Two parallel queries: list query and count query
    let callCount = 0
    const fromMock = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // notifications list query
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: notifications, error: null }),
        }
      } else {
        // unread count query
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        }
      }
    })

    // The count query chain ends at the second .eq() call
    // We need to handle the Promise.all pattern — both resolve concurrently
    // Build independent chain mocks for each from() call
    const listChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: notifications, error: null }),
    }

    const countChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation(() => countChain),
    }
    // The second .eq() call on countChain should resolve as a Promise with count
    let countEqCallCount = 0
    countChain.eq.mockImplementation(() => {
      countEqCallCount++
      if (countEqCallCount === 2) {
        return Promise.resolve({ count: 1, error: null })
      }
      return countChain
    })

    let fromCallCount = 0
    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockImplementation(() => {
        fromCallCount++
        return fromCallCount === 1 ? listChain : countChain
      }),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.notifications).toEqual(notifications)
    expect(body.data.unread_count).toBe(1)
  })

  it('returns 500 when notifications query fails', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)

    const listChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB read failed' } }),
    }

    const countChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    }
    let countEqCallCount = 0
    countChain.eq.mockImplementation(() => {
      countEqCallCount++
      if (countEqCallCount === 2) {
        return Promise.resolve({ count: 0, error: null })
      }
      return countChain
    })

    let fromCallCount = 0
    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockImplementation(() => {
        fromCallCount++
        return fromCallCount === 1 ? listChain : countChain
      }),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe('DB read failed')
  })
})

describe('POST /api/notifications/[id]/read', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 if not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/notifications/notif-1/read', { method: 'POST' })
    const res = await POST(req, makeParams('notif-1'))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('marks single notification as read scoped to user_id', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)

    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    }
    // .eq() is called twice: .eq('id', id) and .eq('user_id', user.id)
    // The second call resolves the promise
    let eqCallCount = 0
    chain.eq.mockImplementation(() => {
      eqCallCount++
      if (eqCallCount === 2) {
        return Promise.resolve({ error: null })
      }
      return chain
    })

    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(chain),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const req = new NextRequest('http://localhost/api/notifications/notif-1/read', { method: 'POST' })
    const res = await POST(req, makeParams('notif-1'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toEqual({ ok: true })
    expect(chain.update).toHaveBeenCalledWith({ is_read: true })
    expect(chain.eq).toHaveBeenCalledWith('id', 'notif-1')
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-1')
  })

  it('marks all notifications as read when id is "all"', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)

    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    }
    // Three .eq() calls for the "all" path: user_id, is_read
    let eqCallCount = 0
    chain.eq.mockImplementation(() => {
      eqCallCount++
      if (eqCallCount === 2) {
        return Promise.resolve({ error: null })
      }
      return chain
    })

    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(chain),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const req = new NextRequest('http://localhost/api/notifications/all/read', { method: 'POST' })
    const res = await POST(req, makeParams('all'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toEqual({ ok: true })
    expect(chain.update).toHaveBeenCalledWith({ is_read: true })
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(chain.eq).toHaveBeenCalledWith('is_read', false)
  })

  it('returns 500 when mark-all-read DB update fails', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)

    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    }
    let eqCallCount = 0
    chain.eq.mockImplementation(() => {
      eqCallCount++
      if (eqCallCount === 2) {
        return Promise.resolve({ error: { message: 'DB update failed' } })
      }
      return chain
    })

    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(chain),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const req = new NextRequest('http://localhost/api/notifications/all/read', { method: 'POST' })
    const res = await POST(req, makeParams('all'))
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe('DB update failed')
  })
})

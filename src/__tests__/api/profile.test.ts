import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetCurrentUser, mockSupabase } = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
  mockSupabase: { from: vi.fn() },
}))

vi.mock('@/lib/auth/get-user', () => ({ getCurrentUser: mockGetCurrentUser }))
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => mockSupabase),
}))
vi.mock('@/lib/api/response', () => ({
  success: vi.fn((data) => ({ json: () => ({ data }), status: 200 })),
  error: vi.fn((msg, status) => ({ json: () => ({ error: msg }), status })),
}))

import { PATCH } from '@/app/api/profile/route'

describe('PATCH /api/profile', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 if not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null)
    const req = new Request('http://localhost/api/profile', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Alice' }),
    })
    const res = await PATCH(req as any)
    expect(res.status).toBe(401)
  })

  it('updates name and phone', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1', name: 'Old', phone: null })
    const updateMock = { eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'user-1', name: 'Alice', phone: '+6512345678' }, error: null }) }
    mockSupabase.from.mockReturnValue({ update: vi.fn(() => updateMock) })
    const req = new Request('http://localhost/api/profile', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Alice', phone: '+6512345678' }),
    })
    const res = await PATCH(req as any)
    expect(res.status).toBe(200)
  })

  it('rejects empty name', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1', name: 'Old', phone: null })
    const req = new Request('http://localhost/api/profile', {
      method: 'PATCH',
      body: JSON.stringify({ name: '' }),
    })
    const res = await PATCH(req as any)
    expect(res.status).toBe(400)
  })
})

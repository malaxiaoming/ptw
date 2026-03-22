import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth/get-user', () => ({
  getCurrentUser: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: vi.fn(),
}))

import { getCurrentUser } from '@/lib/auth/get-user'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { GET } from '@/app/api/users/[id]/route'

const mockGetCurrentUser = vi.mocked(getCurrentUser)
const mockCreateServiceClient = vi.mocked(createServiceRoleClient)

const mockAdminUser = {
  id: 'admin-1',
  email: 'admin@example.com',
  phone: null,
  name: 'Admin User',
  organization_id: 'org-1',
  organization_name: null,
  is_admin: true,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
}

const mockNonAdminUser = {
  ...mockAdminUser,
  id: 'user-1',
  email: 'user@example.com',
  name: 'Regular User',
  is_admin: false,
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

function makeRequest() {
  return new NextRequest('http://localhost/api/users/user-1')
}

describe('GET /api/users/[id]', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 401 if not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null)
    const res = await GET(makeRequest(), makeParams('user-1'))
    const body = await res.json()
    expect(res.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 403 if user is not admin', async () => {
    mockGetCurrentUser.mockResolvedValue(mockNonAdminUser)
    const res = await GET(makeRequest(), makeParams('user-1'))
    const body = await res.json()
    expect(res.status).toBe(403)
    expect(body.error).toBe('Admin access required')
  })

  it('returns 404 if user not found in same org', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)

    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
    }

    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(chain),
    } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

    const res = await GET(makeRequest(), makeParams('nonexistent'))
    const body = await res.json()
    expect(res.status).toBe(404)
    expect(body.error).toBe('User not found')
  })

  it('returns user profile with project roles', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)

    const userData = {
      id: 'user-1',
      email: 'user@example.com',
      phone: '+6591234567',
      name: 'Regular User',
      organization_id: 'org-1',
      is_admin: false,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      user_project_roles: [
        {
          id: 'role-1',
          role: 'applicant',
          is_active: true,
          project_id: 'proj-1',
          projects: { id: 'proj-1', name: 'Project Alpha' },
        },
        {
          id: 'role-2',
          role: 'verifier',
          is_active: false,
          project_id: 'proj-2',
          projects: { id: 'proj-2', name: 'Project Beta' },
        },
      ],
    }

    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: userData, error: null }),
    }

    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(chain),
    } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

    const res = await GET(makeRequest(), makeParams('user-1'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.name).toBe('Regular User')
    expect(body.data.email).toBe('user@example.com')
    expect(body.data.user_project_roles).toHaveLength(2)
    expect(body.data.user_project_roles[0].role).toBe('applicant')
    expect(body.data.user_project_roles[0].projects.name).toBe('Project Alpha')
    expect(body.data.user_project_roles[1].is_active).toBe(false)
  })
})

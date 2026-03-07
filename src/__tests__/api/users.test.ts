import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth/get-user', () => ({
  getCurrentUser: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
  createServiceRoleClient: vi.fn(),
}))

import { getCurrentUser } from '@/lib/auth/get-user'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { GET as getUsers, PATCH as patchUser } from '@/app/api/users/route'
import { POST as inviteUser } from '@/app/api/users/invite/route'

const mockGetCurrentUser = vi.mocked(getCurrentUser)
const mockCreateServiceClient = vi.mocked(createServiceRoleClient)

const mockNonAdminUser = {
  id: 'user-1',
  email: 'user@example.com',
  phone: null,
  name: 'Regular User',
  organization_id: 'org-1',
  organization_name: null,
  is_admin: false,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
}

const mockAdminUser = {
  ...mockNonAdminUser,
  id: 'admin-1',
  email: 'admin@example.com',
  name: 'Admin User',
  is_admin: true,
}

function makeRequest(url: string, options?: ConstructorParameters<typeof NextRequest>[1]): NextRequest {
  return new NextRequest(url, options)
}

// ─── GET /api/users ──────────────────────────────────────────────────────────

describe('GET /api/users', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 401 if not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null)
    const res = await getUsers()
    const body = await res.json()
    expect(res.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('returns empty array if user has no organization_id', async () => {
    mockGetCurrentUser.mockResolvedValue({ ...mockAdminUser, organization_id: null })
    const res = await getUsers()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data).toEqual([])
  })

  it('returns 403 if user is not admin', async () => {
    mockGetCurrentUser.mockResolvedValue(mockNonAdminUser)

    const res = await getUsers()
    const body = await res.json()
    expect(res.status).toBe(403)
    expect(body.error).toBe('Admin access required')
  })

  it('returns all users in the organization for admin', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)

    const users = [
      { id: 'user-1', email: 'admin@example.com', phone: null, name: 'Admin User', organization_id: 'org-1', is_admin: true, is_active: true, created_at: '2024-01-01T00:00:00Z', user_project_roles: [] },
      { id: 'user-2', email: 'bob@example.com', phone: '91234567', name: 'Bob', organization_id: 'org-1', is_admin: false, is_active: true, created_at: '2024-01-02T00:00:00Z', user_project_roles: [] },
    ]

    const usersChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    }
    // Second .order() call resolves the promise
    usersChain.order.mockReturnValueOnce(usersChain).mockResolvedValueOnce({ data: users, error: null })

    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(usersChain),
    } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

    const res = await getUsers()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data).toEqual({ users, isAdmin: true, currentUserId: 'admin-1' })
    expect(usersChain.eq).toHaveBeenCalledWith('organization_id', 'org-1')
  })

  it('returns 500 on database error', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)

    const usersChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    }
    usersChain.order.mockReturnValueOnce(usersChain).mockResolvedValueOnce({ data: null, error: { message: 'DB failed' } })

    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(usersChain),
    } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

    const res = await getUsers()
    const body = await res.json()
    expect(res.status).toBe(500)
    expect(body.error).toBe('DB failed')
  })
})

// ─── PATCH /api/users ────────────────────────────────────────────────────────

describe('PATCH /api/users', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 401 if not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null)
    const req = makeRequest('http://localhost/api/users', {
      method: 'PATCH',
      body: JSON.stringify({ user_id: 'user-2', is_active: false }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await patchUser(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 if not admin', async () => {
    mockGetCurrentUser.mockResolvedValue(mockNonAdminUser)
    const req = makeRequest('http://localhost/api/users', {
      method: 'PATCH',
      body: JSON.stringify({ user_id: 'user-2', is_active: false }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await patchUser(req)
    expect(res.status).toBe(403)
  })

  it('returns 400 if user_id or is_active missing', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)
    const req = makeRequest('http://localhost/api/users', {
      method: 'PATCH',
      body: JSON.stringify({ user_id: 'user-2' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await patchUser(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 if admin tries to disable themselves', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)
    const req = makeRequest('http://localhost/api/users', {
      method: 'PATCH',
      body: JSON.stringify({ user_id: mockAdminUser.id, is_active: false }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await patchUser(req)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toBe('Cannot change your own active status')
  })

  it('returns 400 if target user is admin', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)

    const selectChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'other-admin', is_admin: true, organization_id: 'org-1' },
        error: null,
      }),
    }

    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(selectChain),
    } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

    const req = makeRequest('http://localhost/api/users', {
      method: 'PATCH',
      body: JSON.stringify({ user_id: 'other-admin', is_active: false }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await patchUser(req)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toBe('Cannot disable another admin')
  })

  it('successfully toggles user active status', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)

    // First from() call: select to check target user
    const selectChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'user-2', is_admin: false, organization_id: 'org-1' },
        error: null,
      }),
    }

    // Second from() call: update
    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    }

    const fromMock = vi.fn()
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(updateChain)

    mockCreateServiceClient.mockResolvedValue({
      from: fromMock,
    } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

    const req = makeRequest('http://localhost/api/users', {
      method: 'PATCH',
      body: JSON.stringify({ user_id: 'user-2', is_active: false }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await patchUser(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data).toEqual({ user_id: 'user-2', is_active: false })
  })
})

// ─── POST /api/users/invite ───────────────────────────────────────────────────

describe('POST /api/users/invite', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 401 if not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null)
    const req = makeRequest('http://localhost/api/users/invite', {
      method: 'POST',
      body: JSON.stringify({ email: 'new@test.com', name: 'New User' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await inviteUser(req)
    const body = await res.json()
    expect(res.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 403 if user has no organization_id', async () => {
    mockGetCurrentUser.mockResolvedValue({ ...mockAdminUser, organization_id: null })
    const req = makeRequest('http://localhost/api/users/invite', {
      method: 'POST',
      body: JSON.stringify({ email: 'new@test.com', name: 'New User' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await inviteUser(req)
    const body = await res.json()
    expect(res.status).toBe(403)
    expect(body.error).toBe('User has no organization')
  })

  it('returns 403 if user is not admin', async () => {
    mockGetCurrentUser.mockResolvedValue(mockNonAdminUser)

    const req = makeRequest('http://localhost/api/users/invite', {
      method: 'POST',
      body: JSON.stringify({ email: 'new@test.com', name: 'New User' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await inviteUser(req)
    const body = await res.json()
    expect(res.status).toBe(403)
    expect(body.error).toBe('Admin access required')
  })

  it('returns 400 if email is missing', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)

    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn(),
      auth: { admin: { inviteUserByEmail: vi.fn(), deleteUser: vi.fn() } },
    } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

    const req = makeRequest('http://localhost/api/users/invite', {
      method: 'POST',
      body: JSON.stringify({ name: 'New User' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await inviteUser(req)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toBe('email is required')
  })

  it('returns 400 if name is missing', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)

    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn(),
      auth: { admin: { inviteUserByEmail: vi.fn(), deleteUser: vi.fn() } },
    } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

    const req = makeRequest('http://localhost/api/users/invite', {
      method: 'POST',
      body: JSON.stringify({ email: 'new@test.com' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await inviteUser(req)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toBe('name is required')
  })

  it('returns 400 if JSON is malformed', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)

    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn(),
      auth: { admin: { inviteUserByEmail: vi.fn(), deleteUser: vi.fn() } },
    } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

    const req = makeRequest('http://localhost/api/users/invite', {
      method: 'POST',
      body: 'bad-json',
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await inviteUser(req)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toBe('Invalid JSON')
  })

  it('invites user and creates profile, returns 201', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)

    const newProfile = {
      id: 'new-auth-id',
      email: 'new@test.com',
      phone: '+6591234567',
      name: 'New User',
      organization_id: 'org-1',
      created_at: '2024-01-01T00:00:00Z',
    }

    const insertChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: newProfile, error: null }),
    }

    const inviteUserByEmail = vi.fn().mockResolvedValue({
      data: { user: { id: 'new-auth-id' } },
      error: null,
    })

    const deleteUser = vi.fn().mockResolvedValue({ error: null })

    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(insertChain),
      auth: { admin: { inviteUserByEmail, deleteUser } },
    } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

    const req = makeRequest('http://localhost/api/users/invite', {
      method: 'POST',
      body: JSON.stringify({ email: 'new@test.com', name: 'New User', phone: '+6591234567' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await inviteUser(req)
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.data).toEqual({ ...newProfile, role_warning: null })
    expect(inviteUserByEmail).toHaveBeenCalledWith('new@test.com', {
      redirectTo: 'https://ptw-iota.vercel.app/auth/callback',
    })
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'new-auth-id',
        email: 'new@test.com',
        name: 'New User',
        phone: '+6591234567',
        organization_id: 'org-1',
      })
    )
  })

  it('returns 409 if inviteUserByEmail fails with "already registered"', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)

    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn(),
      auth: {
        admin: {
          inviteUserByEmail: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'User already registered' },
          }),
        },
      },
    } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

    const req = makeRequest('http://localhost/api/users/invite', {
      method: 'POST',
      body: JSON.stringify({ email: 'existing@test.com', name: 'Existing User' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await inviteUser(req)
    const body = await res.json()
    expect(res.status).toBe(409)
    expect(body.error).toBe('A user with this email already exists')
  })

  it('returns 500 if inviteUserByEmail fails with a generic error', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)

    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn(),
      auth: {
        admin: {
          inviteUserByEmail: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Internal server error' },
          }),
        },
      },
    } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

    const req = makeRequest('http://localhost/api/users/invite', {
      method: 'POST',
      body: JSON.stringify({ email: 'new@test.com', name: 'New User' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await inviteUser(req)
    const body = await res.json()
    expect(res.status).toBe(500)
    expect(body.error).toBe('Failed to invite user: Internal server error')
  })

  it('returns 500 and rolls back auth user if profile insert fails', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)

    const insertChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } }),
    }

    const deleteUserMock = vi.fn().mockResolvedValue({ error: null })

    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(insertChain),
      auth: {
        admin: {
          inviteUserByEmail: vi.fn().mockResolvedValue({
            data: { user: { id: 'new-auth-id' } },
            error: null,
          }),
          deleteUser: deleteUserMock,
        },
      },
    } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

    const req = makeRequest('http://localhost/api/users/invite', {
      method: 'POST',
      body: JSON.stringify({ email: 'new@test.com', name: 'New User' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await inviteUser(req)
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe('Failed to create user profile: Insert failed')
    expect(deleteUserMock).toHaveBeenCalledWith('new-auth-id')
  })
})

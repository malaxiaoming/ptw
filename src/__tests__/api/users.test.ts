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
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { GET as getUsers } from '@/app/api/users/route'
import { POST as inviteUser } from '@/app/api/users/invite/route'

const mockGetCurrentUser = vi.mocked(getCurrentUser)
const mockCreateClient = vi.mocked(createServerSupabaseClient)
const mockCreateServiceClient = vi.mocked(createServiceRoleClient)

const mockUser = {
  id: 'user-1',
  email: 'admin@example.com',
  phone: null,
  name: 'Admin User',
  organization_id: 'org-1',
  created_at: '2024-01-01T00:00:00Z',
}

function makeRequest(url: string, options?: ConstructorParameters<typeof NextRequest>[1]): NextRequest {
  return new NextRequest(url, options)
}

/**
 * Build the admin-check chain for isOrgAdmin:
 * .select(...).eq(...).eq(...).eq(...).limit(1) → resolves with data
 */
function makeIsOrgAdminChain(hasAdmin: boolean) {
  const adminData = hasAdmin
    ? [{ role: 'admin', projects: { organization_id: 'org-1' } }]
    : []
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: adminData, error: null }),
  }
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
    mockGetCurrentUser.mockResolvedValue({ ...mockUser, organization_id: null })
    const res = await getUsers()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data).toEqual([])
  })

  it('returns 403 if user is not admin', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)

    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(makeIsOrgAdminChain(false)),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const res = await getUsers()
    const body = await res.json()
    expect(res.status).toBe(403)
    expect(body.error).toBe('Admin access required')
  })

  it('returns all users in the organization for admin', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)

    const users = [
      { id: 'user-1', email: 'admin@example.com', phone: null, name: 'Admin User', organization_id: 'org-1', created_at: '2024-01-01T00:00:00Z' },
      { id: 'user-2', email: 'bob@example.com', phone: '91234567', name: 'Bob', organization_id: 'org-1', created_at: '2024-01-02T00:00:00Z' },
    ]

    const adminCheckChain = makeIsOrgAdminChain(true)

    const usersChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: users, error: null }),
    }

    let fromCount = 0
    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockImplementation(() => {
        fromCount++
        return fromCount === 1 ? adminCheckChain : usersChain
      }),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const res = await getUsers()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data).toEqual(users)
    expect(usersChain.eq).toHaveBeenCalledWith('organization_id', 'org-1')
  })

  it('returns 500 on database error', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)

    const adminCheckChain = makeIsOrgAdminChain(true)

    const usersChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB failed' } }),
    }

    let fromCount = 0
    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockImplementation(() => {
        fromCount++
        return fromCount === 1 ? adminCheckChain : usersChain
      }),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const res = await getUsers()
    const body = await res.json()
    expect(res.status).toBe(500)
    expect(body.error).toBe('DB failed')
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
    mockGetCurrentUser.mockResolvedValue({ ...mockUser, organization_id: null })
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
    mockGetCurrentUser.mockResolvedValue(mockUser)

    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(makeIsOrgAdminChain(false)),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

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
    mockGetCurrentUser.mockResolvedValue(mockUser)

    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(makeIsOrgAdminChain(true)),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

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
    mockGetCurrentUser.mockResolvedValue(mockUser)

    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(makeIsOrgAdminChain(true)),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

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
    mockGetCurrentUser.mockResolvedValue(mockUser)

    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(makeIsOrgAdminChain(true)),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

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
    mockGetCurrentUser.mockResolvedValue(mockUser)

    const newProfile = {
      id: 'new-auth-id',
      email: 'new@test.com',
      phone: '+6591234567',
      name: 'New User',
      organization_id: 'org-1',
      created_at: '2024-01-01T00:00:00Z',
    }

    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(makeIsOrgAdminChain(true)),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    // Mock service role client for inviteUserByEmail and profile insert
    const insertChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: newProfile, error: null }),
    }

    const serviceClient = {
      auth: {
        admin: {
          inviteUserByEmail: vi.fn().mockResolvedValue({
            data: { user: { id: 'new-auth-id' } },
            error: null,
          }),
          deleteUser: vi.fn().mockResolvedValue({ error: null }),
        },
      },
      from: vi.fn().mockReturnValue(insertChain),
    }

    mockCreateServiceClient.mockResolvedValue(serviceClient as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

    const req = makeRequest('http://localhost/api/users/invite', {
      method: 'POST',
      body: JSON.stringify({ email: 'new@test.com', name: 'New User', phone: '+6591234567' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await inviteUser(req)
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.data).toEqual(newProfile)
    expect(serviceClient.auth.admin.inviteUserByEmail).toHaveBeenCalledWith('new@test.com')
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

  // Fix 4: error mapping for "already registered"
  it('returns 409 if inviteUserByEmail fails with "already registered"', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)

    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(makeIsOrgAdminChain(true)),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const serviceClient = {
      auth: {
        admin: {
          inviteUserByEmail: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'User already registered' },
          }),
        },
      },
    }

    mockCreateServiceClient.mockResolvedValue(serviceClient as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

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
    mockGetCurrentUser.mockResolvedValue(mockUser)

    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(makeIsOrgAdminChain(true)),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const serviceClient = {
      auth: {
        admin: {
          inviteUserByEmail: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Internal server error' },
          }),
        },
      },
    }

    mockCreateServiceClient.mockResolvedValue(serviceClient as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

    const req = makeRequest('http://localhost/api/users/invite', {
      method: 'POST',
      body: JSON.stringify({ email: 'new@test.com', name: 'New User' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await inviteUser(req)
    const body = await res.json()
    expect(res.status).toBe(500)
    expect(body.error).toBe('Failed to send invitation')
  })

  // Fix 4: rollback test — profile insert fails after auth user created
  it('returns 500 and rolls back auth user if profile insert fails', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)

    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(makeIsOrgAdminChain(true)),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const insertChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } }),
    }

    const deleteUserMock = vi.fn().mockResolvedValue({ error: null })

    const serviceClient = {
      auth: {
        admin: {
          inviteUserByEmail: vi.fn().mockResolvedValue({
            data: { user: { id: 'new-auth-id' } },
            error: null,
          }),
          deleteUser: deleteUserMock,
        },
      },
      from: vi.fn().mockReturnValue(insertChain),
    }

    mockCreateServiceClient.mockResolvedValue(serviceClient as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

    const req = makeRequest('http://localhost/api/users/invite', {
      method: 'POST',
      body: JSON.stringify({ email: 'new@test.com', name: 'New User' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await inviteUser(req)
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe('Failed to create user profile')
    // Rollback: deleteUser should have been called with the new auth user's ID
    expect(deleteUserMock).toHaveBeenCalledWith('new-auth-id')
  })
})

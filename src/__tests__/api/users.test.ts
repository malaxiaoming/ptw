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
import { GET as getUsers } from '@/app/api/users/route'
import { POST as inviteUser } from '@/app/api/users/invite/route'

const mockGetCurrentUser = vi.mocked(getCurrentUser)
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
 * Build a service client mock that handles isOrgAdmin's two-step query:
 *  1. from('projects').select('id').eq('organization_id', orgId) → project list
 *  2. from('user_project_roles').select('id').eq(...).eq(...).in(...).limit(1) → admin check
 *
 * When hasAdmin=false, projects returns [] so isOrgAdmin short-circuits without
 * hitting user_project_roles.
 */
function makeIsOrgAdminServiceClient(hasAdmin: boolean) {
  const projectsChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({
      data: hasAdmin ? [{ id: 'proj-1' }] : [],
      error: null,
    }),
  }

  const rolesChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({
      data: hasAdmin ? [{ id: 'role-1' }] : [],
      error: null,
    }),
  }

  return vi.fn().mockImplementation((table: string) => {
    if (table === 'projects') return projectsChain
    if (table === 'user_project_roles') return rolesChain
    // Fallback for other tables (e.g. user_profiles in invite route)
    return {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'unexpected call' } }),
    }
  })
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

    mockCreateServiceClient.mockResolvedValue({
      from: makeIsOrgAdminServiceClient(false),
    } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

    const res = await getUsers()
    const body = await res.json()
    expect(res.status).toBe(403)
    expect(body.error).toBe('Admin access required')
  })

  it('returns all users in the organization for admin', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)

    const users = [
      { id: 'user-1', email: 'admin@example.com', phone: null, name: 'Admin User', organization_id: 'org-1', created_at: '2024-01-01T00:00:00Z', user_project_roles: [] },
      { id: 'user-2', email: 'bob@example.com', phone: '91234567', name: 'Bob', organization_id: 'org-1', created_at: '2024-01-02T00:00:00Z', user_project_roles: [] },
    ]

    const usersChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: users, error: null }),
    }

    const adminCheckFrom = makeIsOrgAdminServiceClient(true)
    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'user_profiles') return usersChain
        return adminCheckFrom(table)
      }),
    } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

    const res = await getUsers()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data).toEqual({ users, isAdmin: true })
    expect(usersChain.eq).toHaveBeenCalledWith('organization_id', 'org-1')
  })

  it('returns 500 on database error', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)

    const usersChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB failed' } }),
    }

    const adminCheckFrom = makeIsOrgAdminServiceClient(true)
    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'user_profiles') return usersChain
        return adminCheckFrom(table)
      }),
    } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

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

    mockCreateServiceClient.mockResolvedValue({
      from: makeIsOrgAdminServiceClient(false),
      auth: { admin: { inviteUserByEmail: vi.fn(), deleteUser: vi.fn() } },
    } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

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

    mockCreateServiceClient.mockResolvedValue({
      from: makeIsOrgAdminServiceClient(true),
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
    mockGetCurrentUser.mockResolvedValue(mockUser)

    mockCreateServiceClient.mockResolvedValue({
      from: makeIsOrgAdminServiceClient(true),
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
    mockGetCurrentUser.mockResolvedValue(mockUser)

    mockCreateServiceClient.mockResolvedValue({
      from: makeIsOrgAdminServiceClient(true),
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
    mockGetCurrentUser.mockResolvedValue(mockUser)

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

    const adminCheckFrom = makeIsOrgAdminServiceClient(true)

    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'user_profiles') return insertChain
        return adminCheckFrom(table)
      }),
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
    expect(body.data).toEqual(newProfile)
    expect(inviteUserByEmail).toHaveBeenCalledWith('new@test.com')
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
    mockGetCurrentUser.mockResolvedValue(mockUser)

    mockCreateServiceClient.mockResolvedValue({
      from: makeIsOrgAdminServiceClient(true),
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
    mockGetCurrentUser.mockResolvedValue(mockUser)

    mockCreateServiceClient.mockResolvedValue({
      from: makeIsOrgAdminServiceClient(true),
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
    expect(body.error).toBe('Failed to send invitation')
  })

  it('returns 500 and rolls back auth user if profile insert fails', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)

    const insertChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } }),
    }

    const deleteUserMock = vi.fn().mockResolvedValue({ error: null })

    const adminCheckFrom = makeIsOrgAdminServiceClient(true)

    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'user_profiles') return insertChain
        return adminCheckFrom(table)
      }),
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
    expect(body.error).toBe('Failed to create user profile')
    expect(deleteUserMock).toHaveBeenCalledWith('new-auth-id')
  })
})

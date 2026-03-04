import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth/get-user', () => ({
  getCurrentUser: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { getCurrentUser } from '@/lib/auth/get-user'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { GET as getProjects, POST as postProjects } from '@/app/api/projects/route'
import { GET as getProject, PATCH as patchProject } from '@/app/api/projects/[id]/route'
import { GET as getRoles, POST as postRole, DELETE as deleteRole } from '@/app/api/projects/[id]/roles/route'

const mockGetCurrentUser = vi.mocked(getCurrentUser)
const mockCreateClient = vi.mocked(createServerSupabaseClient)

const mockUser = {
  id: 'user-1',
  email: 'admin@example.com',
  phone: null,
  name: 'Admin User',
  organization_id: 'org-1',
  created_at: '2024-01-01T00:00:00Z',
}

const mockAdminUser = mockUser

function makeRequest(url: string, options?: ConstructorParameters<typeof NextRequest>[1]): NextRequest {
  return new NextRequest(url, options)
}

function makeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

/**
 * Build the admin-check chain for isOrgAdmin:
 * .select(...).eq(...).eq(...).eq(...).limit(1) → resolves with data
 *
 * hasAdmin=true  → data: [{ role: 'admin', projects: { organization_id: 'org-1' } }]
 * hasAdmin=false → data: []
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

// ─── GET /api/projects ─────────────────────────────────────────────────────

describe('GET /api/projects', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 401 if not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null)
    const res = await getProjects()
    const body = await res.json()
    expect(res.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('returns empty array if user has no organization_id', async () => {
    mockGetCurrentUser.mockResolvedValue({ ...mockUser, organization_id: null })
    const res = await getProjects()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data).toEqual([])
  })

  it('returns empty array if user has no project roles', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)

    // First from(): user_project_roles for accessible project IDs
    const rolesChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    }

    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(rolesChain),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const res = await getProjects()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data).toEqual([])
  })

  it('returns projects accessible to the user', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)

    const projects = [
      { id: 'proj-1', name: 'Project Alpha', location: 'Singapore', status: 'active', created_at: '2024-01-01T00:00:00Z' },
    ]

    const rolesChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [{ project_id: 'proj-1' }], error: null }),
    }

    const projectsChain = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: projects, error: null }),
    }

    let fromCount = 0
    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockImplementation(() => {
        fromCount++
        return fromCount === 1 ? rolesChain : projectsChain
      }),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const res = await getProjects()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data).toEqual(projects)
    expect(projectsChain.in).toHaveBeenCalledWith('id', ['proj-1'])
  })

  it('returns 500 on database error when fetching roles', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)

    const rolesChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    }

    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(rolesChain),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const res = await getProjects()
    const body = await res.json()
    expect(res.status).toBe(500)
    expect(body.error).toBe('DB error')
  })
})

// ─── POST /api/projects ─────────────────────────────────────────────────────

describe('POST /api/projects', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 401 if not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null)
    const req = makeRequest('http://localhost/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Project' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await postProjects(req)
    const body = await res.json()
    expect(res.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 403 if user has no organization_id', async () => {
    mockGetCurrentUser.mockResolvedValue({ ...mockUser, organization_id: null })
    const req = makeRequest('http://localhost/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Project' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await postProjects(req)
    const body = await res.json()
    expect(res.status).toBe(403)
    expect(body.error).toBe('User has no organization')
  })

  it('returns 403 if user is not admin', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)

    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(makeIsOrgAdminChain(false)),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const req = makeRequest('http://localhost/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Project' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await postProjects(req)
    const body = await res.json()
    expect(res.status).toBe(403)
    expect(body.error).toBe('Admin access required')
  })

  it('returns 400 if name is missing', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)

    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(makeIsOrgAdminChain(true)),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const req = makeRequest('http://localhost/api/projects', {
      method: 'POST',
      body: JSON.stringify({ location: 'Singapore' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await postProjects(req)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toBe('name is required')
  })

  it('returns 400 if JSON is malformed', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)

    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(makeIsOrgAdminChain(true)),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const req = makeRequest('http://localhost/api/projects', {
      method: 'POST',
      body: 'not-json',
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await postProjects(req)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toBe('Invalid JSON')
  })

  it('creates a project and returns 201 for admin user', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)

    const newProject = {
      id: 'proj-new',
      name: 'New Project',
      location: 'Jurong',
      status: 'active',
      created_at: '2024-01-01T00:00:00Z',
    }

    const adminCheckChain = makeIsOrgAdminChain(true)

    const insertChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: newProject, error: null }),
    }

    let fromCount = 0
    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockImplementation(() => {
        fromCount++
        return fromCount === 1 ? adminCheckChain : insertChain
      }),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const req = makeRequest('http://localhost/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Project', location: 'Jurong' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await postProjects(req)
    const body = await res.json()
    expect(res.status).toBe(201)
    expect(body.data).toEqual(newProject)
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ organization_id: 'org-1', name: 'New Project', location: 'Jurong' })
    )
  })
})

// ─── GET /api/projects/[id] ──────────────────────────────────────────────────

describe('GET /api/projects/[id]', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 401 if not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null)
    const req = makeRequest('http://localhost/api/projects/proj-1')
    const res = await getProject(req, makeParams('proj-1'))
    const body = await res.json()
    expect(res.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 403 if user is not org admin', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)

    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(makeIsOrgAdminChain(false)),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const req = makeRequest('http://localhost/api/projects/proj-1')
    const res = await getProject(req, makeParams('proj-1'))
    const body = await res.json()
    expect(res.status).toBe(403)
    expect(body.error).toBe('Admin access required')
  })

  it('returns project data for admin user', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)

    const project = {
      id: 'proj-1',
      name: 'Project Alpha',
      location: 'Singapore',
      status: 'active',
      created_at: '2024-01-01T00:00:00Z',
      user_project_roles: [],
    }

    const adminCheckChain = makeIsOrgAdminChain(true)

    const projectDataChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: project, error: null }),
    }

    let fromCount = 0
    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockImplementation(() => {
        fromCount++
        return fromCount === 1 ? adminCheckChain : projectDataChain
      }),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const req = makeRequest('http://localhost/api/projects/proj-1')
    const res = await getProject(req, makeParams('proj-1'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data).toEqual(project)
  })

  it('returns 503 if admin check DB throws', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)

    const errorChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    }

    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(errorChain),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const req = makeRequest('http://localhost/api/projects/proj-1')
    const res = await getProject(req, makeParams('proj-1'))
    const body = await res.json()
    expect(res.status).toBe(503)
    expect(body.error).toBe('Service unavailable')
  })
})

// ─── PATCH /api/projects/[id] ───────────────────────────────────────────────

describe('PATCH /api/projects/[id]', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 401 if not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null)
    const req = makeRequest('http://localhost/api/projects/proj-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await patchProject(req, makeParams('proj-1'))
    const body = await res.json()
    expect(res.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 403 if user is not admin', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)

    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(makeIsOrgAdminChain(false)),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const req = makeRequest('http://localhost/api/projects/proj-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await patchProject(req, makeParams('proj-1'))
    const body = await res.json()
    expect(res.status).toBe(403)
    expect(body.error).toBe('Admin access required')
  })

  it('updates project and returns updated data', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)

    const updatedProject = {
      id: 'proj-1', name: 'Updated Name', location: 'Woodlands', status: 'archived', created_at: '2024-01-01T00:00:00Z',
    }

    const adminCheckChain = makeIsOrgAdminChain(true)

    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updatedProject, error: null }),
    }

    let fromCount = 0
    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockImplementation(() => {
        fromCount++
        return fromCount === 1 ? adminCheckChain : updateChain
      }),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const req = makeRequest('http://localhost/api/projects/proj-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated Name', location: 'Woodlands', status: 'archived' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await patchProject(req, makeParams('proj-1'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data).toEqual(updatedProject)
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Updated Name', status: 'archived' })
    )
  })

  it('returns 400 if no valid fields provided', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)

    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(makeIsOrgAdminChain(true)),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const req = makeRequest('http://localhost/api/projects/proj-1', {
      method: 'PATCH',
      body: JSON.stringify({ unrecognized_field: 'value' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await patchProject(req, makeParams('proj-1'))
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toBe('No valid fields to update')
  })

  // Fix 6: status enum validation
  it('returns 400 if status value is invalid', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)

    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(makeIsOrgAdminChain(true)),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const req = makeRequest('http://localhost/api/projects/proj-1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'invalid-status' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await patchProject(req, makeParams('proj-1'))
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toContain('status must be one of')
  })
})

// ─── GET /api/projects/[id]/roles ────────────────────────────────────────────

describe('GET /api/projects/[id]/roles', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 401 if not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null)
    const req = makeRequest('http://localhost/api/projects/proj-1/roles')
    const res = await getRoles(req, makeParams('proj-1'))
    const body = await res.json()
    expect(res.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 403 if user is not admin', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)

    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(makeIsOrgAdminChain(false)),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const req = makeRequest('http://localhost/api/projects/proj-1/roles')
    const res = await getRoles(req, makeParams('proj-1'))
    const body = await res.json()
    expect(res.status).toBe(403)
    expect(body.error).toBe('Admin access required')
  })

  it('returns role assignments for project', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)

    const roleAssignments = [
      { id: 'r-1', user_id: 'user-2', role: 'applicant', user_profiles: { id: 'user-2', name: 'Bob', email: 'bob@test.com' } },
    ]

    const adminCheckChain = makeIsOrgAdminChain(true)

    const rolesDataChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: roleAssignments, error: null }),
    }

    let fromCount = 0
    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockImplementation(() => {
        fromCount++
        return fromCount === 1 ? adminCheckChain : rolesDataChain
      }),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const req = makeRequest('http://localhost/api/projects/proj-1/roles')
    const res = await getRoles(req, makeParams('proj-1'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data).toEqual(roleAssignments)
    expect(rolesDataChain.eq).toHaveBeenCalledWith('project_id', 'proj-1')
  })
})

// ─── POST /api/projects/[id]/roles ───────────────────────────────────────────

describe('POST /api/projects/[id]/roles', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 401 if not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null)
    const req = makeRequest('http://localhost/api/projects/proj-1/roles', {
      method: 'POST',
      body: JSON.stringify({ user_id: 'user-2', role: 'applicant' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await postRole(req, makeParams('proj-1'))
    const body = await res.json()
    expect(res.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 400 if role is invalid', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)

    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(makeIsOrgAdminChain(true)),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const req = makeRequest('http://localhost/api/projects/proj-1/roles', {
      method: 'POST',
      body: JSON.stringify({ user_id: 'user-2', role: 'superuser' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await postRole(req, makeParams('proj-1'))
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toBe('Invalid role')
  })

  it('returns 403 if target user is not in the same org', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)

    const adminCheckChain = makeIsOrgAdminChain(true)

    // user_profiles check: user in different org
    const userProfileChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { organization_id: 'other-org' }, error: null }),
    }

    let fromCount = 0
    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockImplementation(() => {
        fromCount++
        return fromCount === 1 ? adminCheckChain : userProfileChain
      }),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const req = makeRequest('http://localhost/api/projects/proj-1/roles', {
      method: 'POST',
      body: JSON.stringify({ user_id: 'user-other', role: 'applicant' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await postRole(req, makeParams('proj-1'))
    const body = await res.json()
    expect(res.status).toBe(403)
    expect(body.error).toBe('User not found in your organization')
  })

  it('creates a role assignment and returns 201', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)

    const newRole = { id: 'r-new', user_id: 'user-2', role: 'verifier' }

    const adminCheckChain = makeIsOrgAdminChain(true)

    const userProfileChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { organization_id: 'org-1' }, error: null }),
    }

    const upsertChain = {
      upsert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: newRole, error: null }),
    }

    let fromCount = 0
    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockImplementation(() => {
        fromCount++
        if (fromCount === 1) return adminCheckChain
        if (fromCount === 2) return userProfileChain
        return upsertChain
      }),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const req = makeRequest('http://localhost/api/projects/proj-1/roles', {
      method: 'POST',
      body: JSON.stringify({ user_id: 'user-2', role: 'verifier' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await postRole(req, makeParams('proj-1'))
    const body = await res.json()
    expect(res.status).toBe(201)
    expect(body.data).toEqual(newRole)
    expect(upsertChain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-2', project_id: 'proj-1', role: 'verifier' }),
      expect.objectContaining({ ignoreDuplicates: true })
    )
  })

  // Fix 5: duplicate upsert returns null from maybeSingle — should return 201 without error
  it('returns 201 without error when role already exists (duplicate upsert)', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)

    const adminCheckChain = makeIsOrgAdminChain(true)

    const userProfileChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { organization_id: 'org-1' }, error: null }),
    }

    // maybeSingle returns null when upsert is a no-op (row already exists)
    const upsertChain = {
      upsert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }

    let fromCount = 0
    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockImplementation(() => {
        fromCount++
        if (fromCount === 1) return adminCheckChain
        if (fromCount === 2) return userProfileChain
        return upsertChain
      }),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const req = makeRequest('http://localhost/api/projects/proj-1/roles', {
      method: 'POST',
      body: JSON.stringify({ user_id: 'user-2', role: 'verifier' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await postRole(req, makeParams('proj-1'))
    const body = await res.json()
    // Should return 201 with fallback data (not crash)
    expect(res.status).toBe(201)
    expect(body.data).toEqual(
      expect.objectContaining({ user_id: 'user-2', role: 'verifier', project_id: 'proj-1' })
    )
  })
})

// ─── DELETE /api/projects/[id]/roles ─────────────────────────────────────────

describe('DELETE /api/projects/[id]/roles', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 401 if not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null)
    const req = makeRequest('http://localhost/api/projects/proj-1/roles', {
      method: 'DELETE',
      body: JSON.stringify({ user_id: 'user-2', role: 'applicant' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await deleteRole(req, makeParams('proj-1'))
    const body = await res.json()
    expect(res.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  // Fix 7: DELETE also validates role value
  it('returns 400 if role is invalid', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)

    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(makeIsOrgAdminChain(true)),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const req = makeRequest('http://localhost/api/projects/proj-1/roles', {
      method: 'DELETE',
      body: JSON.stringify({ user_id: 'user-2', role: 'superuser' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await deleteRole(req, makeParams('proj-1'))
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toBe('Invalid role')
  })

  it('deletes role assignment and returns ok', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)

    const adminCheckChain = makeIsOrgAdminChain(true)

    const deleteChain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    }
    let deleteEqCount = 0
    deleteChain.eq.mockImplementation(() => {
      deleteEqCount++
      if (deleteEqCount === 3) return Promise.resolve({ error: null })
      return deleteChain
    })

    let fromCount = 0
    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockImplementation(() => {
        fromCount++
        return fromCount === 1 ? adminCheckChain : deleteChain
      }),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const req = makeRequest('http://localhost/api/projects/proj-1/roles', {
      method: 'DELETE',
      body: JSON.stringify({ user_id: 'user-2', role: 'applicant' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await deleteRole(req, makeParams('proj-1'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data).toEqual({ ok: true })
    expect(deleteChain.delete).toHaveBeenCalled()
    expect(deleteChain.eq).toHaveBeenCalledWith('user_id', 'user-2')
    expect(deleteChain.eq).toHaveBeenCalledWith('project_id', 'proj-1')
    expect(deleteChain.eq).toHaveBeenCalledWith('role', 'applicant')
  })
})

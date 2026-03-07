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
import { GET as getProjects, POST as postProjects } from '@/app/api/projects/route'
import { GET as getProject, PATCH as patchProject, DELETE as deleteProject } from '@/app/api/projects/[id]/route'
import { GET as getRoles, POST as postRole, DELETE as deleteRole } from '@/app/api/projects/[id]/roles/route'

const mockGetCurrentUser = vi.mocked(getCurrentUser)
const mockCreateServiceClient = vi.mocked(createServiceRoleClient)

const mockNonAdminUser = {
  id: 'user-1',
  email: 'user@example.com',
  phone: null,
  name: 'Regular User',
  organization_id: 'org-1',
  is_admin: false,
  created_at: '2024-01-01T00:00:00Z',
}

const mockAdminUser = {
  ...mockNonAdminUser,
  email: 'admin@example.com',
  name: 'Admin User',
  is_admin: true,
}

function makeRequest(url: string, options?: ConstructorParameters<typeof NextRequest>[1]): NextRequest {
  return new NextRequest(url, options)
}

function makeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
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

  it('returns all org projects for admin user', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)

    const projects = [
      { id: 'proj-1', name: 'Project Alpha', address: 'Singapore', status: 'active', created_at: '2024-01-01T00:00:00Z' },
    ]

    const projectsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: projects, error: null }),
    }

    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(projectsChain),
    } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

    const res = await getProjects()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data).toEqual(projects)
  })

  it('returns empty array for non-admin with no project roles', async () => {
    mockGetCurrentUser.mockResolvedValue(mockNonAdminUser)

    const rolesChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    }
    // Terminal eq for is_active returns data
    let eqCount = 0
    rolesChain.eq.mockImplementation(() => {
      eqCount++
      if (eqCount === 2) return Promise.resolve({ data: [], error: null })
      return rolesChain
    })

    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(rolesChain),
    } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

    const res = await getProjects()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data).toEqual([])
  })

  it('returns projects accessible to non-admin user', async () => {
    mockGetCurrentUser.mockResolvedValue(mockNonAdminUser)

    const projects = [
      { id: 'proj-1', name: 'Project Alpha', address: 'Singapore', status: 'active', created_at: '2024-01-01T00:00:00Z' },
    ]

    const rolesChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    }
    let rolesEqCount = 0
    rolesChain.eq.mockImplementation(() => {
      rolesEqCount++
      if (rolesEqCount === 2) return Promise.resolve({ data: [{ project_id: 'proj-1' }], error: null })
      return rolesChain
    })

    const projectsChain = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: projects, error: null }),
    }

    let fromCount = 0
    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn().mockImplementation(() => {
        fromCount++
        return fromCount === 1 ? rolesChain : projectsChain
      }),
    } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

    const res = await getProjects()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data).toEqual(projects)
    expect(projectsChain.in).toHaveBeenCalledWith('id', ['proj-1'])
  })

  it('returns 500 on database error when fetching roles', async () => {
    mockGetCurrentUser.mockResolvedValue(mockNonAdminUser)

    const rolesChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    }
    let eqCount = 0
    rolesChain.eq.mockImplementation(() => {
      eqCount++
      if (eqCount === 2) return Promise.resolve({ data: null, error: { message: 'DB error' } })
      return rolesChain
    })

    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(rolesChain),
    } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

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
    mockGetCurrentUser.mockResolvedValue({ ...mockAdminUser, organization_id: null })
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
    mockGetCurrentUser.mockResolvedValue(mockNonAdminUser)

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

    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn(),
    } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

    const req = makeRequest('http://localhost/api/projects', {
      method: 'POST',
      body: JSON.stringify({ address: 'Singapore' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await postProjects(req)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toBe('name is required')
  })

  it('returns 400 if JSON is malformed', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)

    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn(),
    } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

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
      address: 'Jurong',
      status: 'active',
      created_at: '2024-01-01T00:00:00Z',
    }

    const insertChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: newProject, error: null }),
    }

    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(insertChain),
    } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

    const req = makeRequest('http://localhost/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Project', address: 'Jurong' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await postProjects(req)
    const body = await res.json()
    expect(res.status).toBe(201)
    expect(body.data).toEqual(newProject)
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ organization_id: 'org-1', name: 'New Project', address: 'Jurong' })
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
    mockGetCurrentUser.mockResolvedValue(mockNonAdminUser)

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
      address: 'Singapore',
      status: 'active',
      created_at: '2024-01-01T00:00:00Z',
      user_project_roles: [],
    }

    const projectDataChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: project, error: null }),
    }

    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(projectDataChain),
    } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

    const req = makeRequest('http://localhost/api/projects/proj-1')
    const res = await getProject(req, makeParams('proj-1'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data).toEqual(project)
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
    mockGetCurrentUser.mockResolvedValue(mockNonAdminUser)

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
      id: 'proj-1', name: 'Updated Name', address: 'Woodlands', status: 'archived', created_at: '2024-01-01T00:00:00Z',
    }

    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updatedProject, error: null }),
    }

    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(updateChain),
    } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

    const req = makeRequest('http://localhost/api/projects/proj-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated Name', address: 'Woodlands', status: 'archived' }),
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

    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn(),
    } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

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

  it('returns 400 if status value is invalid', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)

    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn(),
    } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

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
    mockGetCurrentUser.mockResolvedValue(mockNonAdminUser)

    const req = makeRequest('http://localhost/api/projects/proj-1/roles')
    const res = await getRoles(req, makeParams('proj-1'))
    const body = await res.json()
    expect(res.status).toBe(403)
    expect(body.error).toBe('Admin access required')
  })

  it('returns role assignments for project', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)

    const roleAssignments = [
      { id: 'r-1', user_id: 'user-2', role: 'applicant', is_active: true, user_profiles: { id: 'user-2', name: 'Bob', email: 'bob@test.com', organization_id: 'org-1' } },
    ]

    const rolesDataChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: roleAssignments, error: null }),
    }

    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(rolesDataChain),
    } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

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

    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn(),
    } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

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

  it('returns 400 if external user assigned non-applicant role', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)

    const projectChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { organization_id: 'org-1' }, error: null }),
    }

    const userProfileChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { organization_id: 'other-org' }, error: null }),
    }

    let fromCount = 0
    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn().mockImplementation(() => {
        fromCount++
        return fromCount === 1 ? projectChain : userProfileChain
      }),
    } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

    const req = makeRequest('http://localhost/api/projects/proj-1/roles', {
      method: 'POST',
      body: JSON.stringify({ user_id: 'user-other', role: 'verifier' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await postRole(req, makeParams('proj-1'))
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toBe('External users can only be assigned the applicant role')
  })

  it('allows external user to be assigned applicant role', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)

    const projectChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { organization_id: 'org-1' }, error: null }),
    }

    const userProfileChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { organization_id: 'other-org' }, error: null }),
    }

    const upsertChain = {
      upsert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'r-new', user_id: 'user-other', role: 'applicant', is_active: true }, error: null }),
    }

    let fromCount = 0
    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn().mockImplementation(() => {
        fromCount++
        if (fromCount === 1) return projectChain
        if (fromCount === 2) return userProfileChain
        return upsertChain
      }),
    } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

    const req = makeRequest('http://localhost/api/projects/proj-1/roles', {
      method: 'POST',
      body: JSON.stringify({ user_id: 'user-other', role: 'applicant' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await postRole(req, makeParams('proj-1'))
    const body = await res.json()
    expect(res.status).toBe(201)
    expect(body.data.role).toBe('applicant')
  })

  it('creates a role assignment and returns 201', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)

    const newRole = { id: 'r-new', user_id: 'user-2', role: 'verifier', is_active: true }

    const projectChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { organization_id: 'org-1' }, error: null }),
    }

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
    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn().mockImplementation(() => {
        fromCount++
        if (fromCount === 1) return projectChain
        if (fromCount === 2) return userProfileChain
        return upsertChain
      }),
    } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

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

  it('returns 201 without error when role already exists (duplicate upsert)', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)

    const projectChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { organization_id: 'org-1' }, error: null }),
    }

    const userProfileChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { organization_id: 'org-1' }, error: null }),
    }

    const upsertChain = {
      upsert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }

    let fromCount = 0
    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn().mockImplementation(() => {
        fromCount++
        if (fromCount === 1) return projectChain
        if (fromCount === 2) return userProfileChain
        return upsertChain
      }),
    } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

    const req = makeRequest('http://localhost/api/projects/proj-1/roles', {
      method: 'POST',
      body: JSON.stringify({ user_id: 'user-2', role: 'verifier' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await postRole(req, makeParams('proj-1'))
    const body = await res.json()
    expect(res.status).toBe(201)
    expect(body.data).toEqual(
      expect.objectContaining({ user_id: 'user-2', role: 'verifier', project_id: 'proj-1' })
    )
  })
})

// ─── DELETE /api/projects/[id] ───────────────────────────────────────────────

describe('DELETE /api/projects/[id]', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 401 if not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null)
    const req = makeRequest('http://localhost/api/projects/proj-1', { method: 'DELETE' })
    const res = await deleteProject(req, makeParams('proj-1'))
    const body = await res.json()
    expect(res.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 403 if not org admin', async () => {
    mockGetCurrentUser.mockResolvedValue(mockNonAdminUser)

    const req = makeRequest('http://localhost/api/projects/proj-1', { method: 'DELETE' })
    const res = await deleteProject(req, makeParams('proj-1'))
    const body = await res.json()
    expect(res.status).toBe(403)
    expect(body.error).toBe('Admin access required')
  })

  it('returns 409 if project has permits', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)

    let fromCallCount = 0

    const projectLookupChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'proj-1' }, error: null }),
    }

    const permitsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [{ id: 'permit-1' }], error: null }),
    }

    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn().mockImplementation(() => {
        fromCallCount++
        if (fromCallCount === 1) return projectLookupChain
        return permitsChain
      }),
    } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

    const req = makeRequest('http://localhost/api/projects/proj-1', { method: 'DELETE' })
    const res = await deleteProject(req, makeParams('proj-1'))
    const body = await res.json()
    expect(res.status).toBe(409)
    expect(body.error).toContain('Cannot delete a project that has permits')
  })

  it('deletes project successfully and returns ok', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)

    let fromCallCount = 0

    const projectLookupChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'proj-1' }, error: null }),
    }

    const permitsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    }

    const deleteChain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    }
    let deleteEqCount = 0
    deleteChain.eq.mockImplementation(() => {
      deleteEqCount++
      if (deleteEqCount === 2) return Promise.resolve({ error: null })
      return deleteChain
    })

    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn().mockImplementation(() => {
        fromCallCount++
        if (fromCallCount === 1) return projectLookupChain
        if (fromCallCount === 2) return permitsChain
        return deleteChain
      }),
    } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

    const req = makeRequest('http://localhost/api/projects/proj-1', { method: 'DELETE' })
    const res = await deleteProject(req, makeParams('proj-1'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data).toEqual({ ok: true })
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

  it('returns 400 if role is invalid', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)

    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn(),
    } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

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

    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(deleteChain),
    } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

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

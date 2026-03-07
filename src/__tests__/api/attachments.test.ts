import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock getCurrentUser
vi.mock('@/lib/auth/get-user', () => ({
  getCurrentUser: vi.fn(),
}))

// Mock both Supabase client factories
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
  createServiceRoleClient: vi.fn(),
}))

// Mock getUserRolesForProject
vi.mock('@/lib/auth/get-user-roles', () => ({
  getUserRolesForProject: vi.fn(),
}))

import { getCurrentUser } from '@/lib/auth/get-user'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getUserRolesForProject } from '@/lib/auth/get-user-roles'
import { POST, GET } from '@/app/api/permits/[id]/attachments/route'

const mockGetCurrentUser = vi.mocked(getCurrentUser)
const mockCreateClient = vi.mocked(createServerSupabaseClient)
const mockCreateServiceClient = vi.mocked(createServiceRoleClient)
const mockGetUserRoles = vi.mocked(getUserRolesForProject)

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  phone: null,
  name: 'Test User',
  organization_id: 'org-1',
  is_admin: false,
  created_at: '2024-01-01T00:00:00Z',
}

const mockPermit = {
  id: 'permit-1',
  project_id: 'project-1',
  applicant_id: 'user-1',
}

function makeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

function makeUploadRequest(permitId: string, file?: File): NextRequest {
  const formData = new FormData()
  if (file) formData.append('file', file)
  return new NextRequest(`http://localhost/api/permits/${permitId}/attachments`, {
    method: 'POST',
    body: formData,
  })
}

function makeGetRequest(permitId: string): NextRequest {
  return new NextRequest(`http://localhost/api/permits/${permitId}/attachments`)
}

function makeJpegFile(name: string, sizeBytes: number): File {
  const buffer = new ArrayBuffer(sizeBytes)
  return new File([buffer], name, { type: 'image/jpeg' })
}

// Supabase storage mock factory
function makeStorageMock(uploadResult: { error: unknown } = { error: null }) {
  return {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue(uploadResult),
      createSignedUrl: vi.fn().mockResolvedValue({
        data: { signedUrl: 'https://storage.example.com/signed-url' },
        error: null,
      }),
    }),
  }
}

// Supabase DB chain for permit lookup (single)
function makePermitChain(result: { data: unknown; error: unknown }) {
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(result),
    }),
  }
}

describe('POST /api/permits/[id]/attachments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 if not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const req = makeUploadRequest('permit-1')
    const res = await POST(req, makeParams('permit-1'))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 404 if permit not found', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)
    mockCreateClient.mockResolvedValue(
      makePermitChain({ data: null, error: null }) as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>
    )

    const req = makeUploadRequest('permit-999')
    const res = await POST(req, makeParams('permit-999'))
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error).toBe('Permit not found')
  })

  it('returns 404 if user has no project roles (membership check)', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)
    mockCreateClient.mockResolvedValue(
      makePermitChain({ data: mockPermit, error: null }) as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>
    )
    mockGetUserRoles.mockResolvedValue([])

    const req = makeUploadRequest('permit-1')
    const res = await POST(req, makeParams('permit-1'))
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error).toBe('Permit not found')
  })

  it('returns 400 if no file provided', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)
    mockCreateClient.mockResolvedValue(
      makePermitChain({ data: mockPermit, error: null }) as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>
    )
    mockGetUserRoles.mockResolvedValue(['applicant'])

    // FormData with no file
    const formData = new FormData()
    const req = new NextRequest('http://localhost/api/permits/permit-1/attachments', {
      method: 'POST',
      body: formData,
    })
    const res = await POST(req, makeParams('permit-1'))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe('No file provided')
  })

  it('returns 400 for disallowed file type (text/plain)', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)
    mockCreateClient.mockResolvedValue(
      makePermitChain({ data: mockPermit, error: null }) as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>
    )
    mockGetUserRoles.mockResolvedValue(['applicant'])

    const textFile = new File(['hello world'], 'notes.txt', { type: 'text/plain' })
    const req = makeUploadRequest('permit-1', textFile)
    const res = await POST(req, makeParams('permit-1'))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe('File type not allowed. Accepted: JPG, PNG, WebP, PDF')
  })

  it('returns 400 if file exceeds 10MB', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)
    mockCreateClient.mockResolvedValue(
      makePermitChain({ data: mockPermit, error: null }) as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>
    )
    mockGetUserRoles.mockResolvedValue(['applicant'])

    // jsdom multipart parsing does not preserve binary file sizes, so we create a
    // File whose .size property reports 11MB and spy on formData() to return it directly.
    const oversizedFile = new File(['x'], 'big-image.jpg', { type: 'image/jpeg' })
    Object.defineProperty(oversizedFile, 'size', { value: 11 * 1024 * 1024 })

    const formData = new FormData()
    formData.append('file', oversizedFile)

    const req = new NextRequest('http://localhost/api/permits/permit-1/attachments', {
      method: 'POST',
      body: formData,
    })
    vi.spyOn(req, 'formData').mockResolvedValue(formData)

    const res = await POST(req, makeParams('permit-1'))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe('File size exceeds 10MB limit')
  })

  it('returns 201 on successful upload', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)

    const newAttachment = {
      id: 'att-1',
      permit_id: 'permit-1',
      file_url: 'org-1/project-1/permit-1/123-photo.jpg',
      file_name: 'photo.jpg',
      file_type: 'image/jpeg',
      uploaded_by: 'user-1',
      created_at: '2024-01-01T00:00:00Z',
    }

    // supabase (authenticated) handles permits lookup only
    mockCreateClient.mockResolvedValue(
      makePermitChain({ data: mockPermit, error: null }) as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>
    )
    mockGetUserRoles.mockResolvedValue(['applicant'])
    // serviceClient handles storage upload + permit_attachments insert
    const storageMock = makeStorageMock()
    const dbFromMock = vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: newAttachment, error: null }),
    })
    mockCreateServiceClient.mockResolvedValue(
      { storage: storageMock, from: dbFromMock } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>
    )

    const file = makeJpegFile('photo.jpg', 1024)
    const req = makeUploadRequest('permit-1', file)
    const res = await POST(req, makeParams('permit-1'))
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.data).toEqual(newAttachment)
  })

  it('removes uploaded file from storage when DB insert fails', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)

    // supabase (authenticated) handles permits lookup only
    mockCreateClient.mockResolvedValue(
      makePermitChain({ data: mockPermit, error: null }) as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>
    )
    mockGetUserRoles.mockResolvedValue(['applicant'])

    const removeMock = vi.fn().mockResolvedValue({ error: null })
    // serviceClient handles storage + permit_attachments insert (which fails)
    const dbFromMock = vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB insert failed' } }),
    })
    mockCreateServiceClient.mockResolvedValue({
      storage: {
        from: vi.fn().mockReturnValue({
          upload: vi.fn().mockResolvedValue({ error: null }),
          remove: removeMock,
        }),
      },
      from: dbFromMock,
    } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

    const file = makeJpegFile('photo.jpg', 1024)
    const req = makeUploadRequest('permit-1', file)
    const res = await POST(req, makeParams('permit-1'))
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe('DB insert failed')
    // Verify storage cleanup was called with an array containing the orphaned file path
    expect(removeMock).toHaveBeenCalledOnce()
    const [removedPaths] = removeMock.mock.calls[0]
    expect(Array.isArray(removedPaths)).toBe(true)
    expect(removedPaths).toHaveLength(1)
    // Path should be scoped under org/project/permit
    expect(removedPaths[0]).toMatch(/^org-1\/project-1\/permit-1\/\d+-/)
  })
})

describe('GET /api/permits/[id]/attachments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 if not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const req = makeGetRequest('permit-1')
    const res = await GET(req, makeParams('permit-1'))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 404 if permit not found', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)
    mockCreateClient.mockResolvedValue(
      makePermitChain({ data: null, error: null }) as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>
    )

    const req = makeGetRequest('permit-999')
    const res = await GET(req, makeParams('permit-999'))
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error).toBe('Permit not found')
  })

  it('returns 404 if user has no project roles', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)
    mockCreateClient.mockResolvedValue(
      makePermitChain({ data: mockPermit, error: null }) as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>
    )
    mockGetUserRoles.mockResolvedValue([])

    const req = makeGetRequest('permit-1')
    const res = await GET(req, makeParams('permit-1'))
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error).toBe('Permit not found')
  })

  it('returns list of attachments with signed URLs', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)

    const attachments = [
      {
        id: 'att-1',
        permit_id: 'permit-1',
        file_url: 'org-1/project-1/permit-1/123-photo.jpg',
        file_name: 'photo.jpg',
        file_type: 'image/jpeg',
        uploaded_by: 'user-1',
        created_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'att-2',
        permit_id: 'permit-1',
        file_url: 'org-1/project-1/permit-1/456-plan.pdf',
        file_name: 'plan.pdf',
        file_type: 'application/pdf',
        uploaded_by: 'user-1',
        created_at: '2024-01-02T00:00:00Z',
      },
    ]

    // First call: permit lookup (single), second call: attachments list (order)
    let callCount = 0
    const fromMock = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // permits lookup
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'permit-1', project_id: 'project-1' }, error: null }),
        }
      } else {
        // permit_attachments list
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: attachments, error: null }),
        }
      }
    })
    mockCreateClient.mockResolvedValue({ from: fromMock } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)
    mockGetUserRoles.mockResolvedValue(['applicant'])

    const signedUrl = 'https://storage.example.com/signed-url'
    mockCreateServiceClient.mockResolvedValue(
      { storage: makeStorageMock() } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>
    )

    const req = makeGetRequest('permit-1')
    const res = await GET(req, makeParams('permit-1'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toHaveLength(2)
    expect(body.data[0]).toMatchObject({
      id: 'att-1',
      file_name: 'photo.jpg',
      signed_url: signedUrl,
    })
    expect(body.data[1]).toMatchObject({
      id: 'att-2',
      file_name: 'plan.pdf',
      signed_url: signedUrl,
    })
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth/get-user', () => ({ getCurrentUser: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
  createServiceRoleClient: vi.fn(),
}))
vi.mock('@/lib/auth/check-admin', () => ({ isOrgAdmin: vi.fn() }))
vi.mock('@/lib/crypto', () => ({
  decrypt: vi.fn(),
  encrypt: vi.fn(),
}))

import { getCurrentUser } from '@/lib/auth/get-user'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { isOrgAdmin } from '@/lib/auth/check-admin'
import { decrypt } from '@/lib/crypto'
import { GET } from '@/app/api/workers/[id]/sensitive/route'

const mockGetCurrentUser = vi.mocked(getCurrentUser)
const mockCreateServiceClient = vi.mocked(createServiceRoleClient)
const mockIsOrgAdmin = vi.mocked(isOrgAdmin)
const mockDecrypt = vi.mocked(decrypt)

const mockUser = {
  id: 'user-1', email: 'test@example.com', phone: null, name: 'Test User',
  organization_id: 'org-1', organization_name: null, is_admin: false, is_active: true, created_at: '2024-01-01T00:00:00Z',
}
const mockAdminUser = { ...mockUser, is_admin: true }

function makeRequest(url: string): NextRequest {
  return new NextRequest(url)
}
function makeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

describe('GET /api/workers/[id]/sensitive', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 if not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null)
    const res = await GET(makeRequest('http://localhost/api/workers/w-1/sensitive?reason=test'), makeParams('w-1'))
    expect(res.status).toBe(401)
  })

  it('returns 403 if not admin', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)
    mockIsOrgAdmin.mockReturnValue(false)

    const res = await GET(makeRequest('http://localhost/api/workers/w-1/sensitive?reason=test'), makeParams('w-1'))
    expect(res.status).toBe(403)
  })

  it('returns 400 if reason not provided', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)
    mockIsOrgAdmin.mockReturnValue(true)

    const res = await GET(makeRequest('http://localhost/api/workers/w-1/sensitive'), makeParams('w-1'))
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toBe('reason query parameter is required')
  })

  it('returns decrypted NRIC and logs access', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)
    mockIsOrgAdmin.mockReturnValue(true)
    mockDecrypt.mockReturnValue('S1234567A')

    let callCount = 0
    const fromMock = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // Worker select
        return {
          select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'w-1', nric_fin_encrypted: 'encrypted-data', nric_fin_type: 'nric' }, error: null }),
        }
      }
      // Audit log insert
      return {
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
    })
    mockCreateServiceClient.mockResolvedValue({ from: fromMock } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

    const res = await GET(makeRequest('http://localhost/api/workers/w-1/sensitive?reason=accident+investigation'), makeParams('w-1'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.nric_fin_full).toBe('S1234567A')
    expect(body.data.nric_fin_type).toBe('nric')
    expect(mockDecrypt).toHaveBeenCalledWith('encrypted-data')
    // Verify audit log was written
    expect(fromMock).toHaveBeenCalledWith('sensitive_data_access_log')
  })

  it('returns 404 if no NRIC data on file', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAdminUser)
    mockIsOrgAdmin.mockReturnValue(true)

    const fromMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'w-1', nric_fin_encrypted: null, nric_fin_type: null }, error: null }),
    })
    mockCreateServiceClient.mockResolvedValue({ from: fromMock } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

    const res = await GET(makeRequest('http://localhost/api/workers/w-1/sensitive?reason=test'), makeParams('w-1'))
    const body = await res.json()
    expect(res.status).toBe(404)
    expect(body.error).toBe('No NRIC/FIN data on file')
  })
})

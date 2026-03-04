import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock createServiceRoleClient
vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: vi.fn(),
}))

// Mock sendPermitNotifications
vi.mock('@/lib/notifications/send', () => ({
  sendPermitNotifications: vi.fn(),
}))

import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendPermitNotifications } from '@/lib/notifications/send'
import { POST } from '@/app/api/cron/expiry-check/route'

const mockCreateServiceClient = vi.mocked(createServiceRoleClient)
const mockSendPermitNotifications = vi.mocked(sendPermitNotifications)

function makeRequest(authHeader?: string): NextRequest {
  const headers: Record<string, string> = {}
  if (authHeader !== undefined) {
    headers['authorization'] = authHeader
  }
  return new NextRequest('http://localhost/api/cron/expiry-check', {
    method: 'POST',
    headers,
  })
}

function makeSupabaseChain(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    gte: vi.fn().mockResolvedValue(result),
  }
  return chain
}

describe('POST /api/cron/expiry-check', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = 'test-secret'
  })

  it('returns 401 when authorization header is missing', async () => {
    const req = makeRequest()
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 401 when authorization header is wrong', async () => {
    const req = makeRequest('Bearer wrong-secret')
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 200 with { checked: 0 } when no expiring permits', async () => {
    const chain = makeSupabaseChain({ data: [], error: null })
    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(chain),
    } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

    const req = makeRequest('Bearer test-secret')
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toEqual({ checked: 0 })
    expect(mockSendPermitNotifications).not.toHaveBeenCalled()
  })

  it('returns 200 with { checked: N } when N permits are expiring and calls sendPermitNotifications for each', async () => {
    const expiringPermits = [
      {
        id: 'permit-1',
        permit_number: 'PTW-2024-0001',
        project_id: 'project-1',
        applicant_id: 'user-1',
        verifier_id: 'user-2',
        approver_id: 'user-3',
      },
      {
        id: 'permit-2',
        permit_number: 'PTW-2024-0002',
        project_id: 'project-2',
        applicant_id: 'user-4',
        verifier_id: null,
        approver_id: 'user-5',
      },
    ]

    const chain = makeSupabaseChain({ data: expiringPermits, error: null })
    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(chain),
    } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

    mockSendPermitNotifications.mockResolvedValue(undefined)

    const req = makeRequest('Bearer test-secret')
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toEqual({ checked: 2 })

    expect(mockSendPermitNotifications).toHaveBeenCalledTimes(2)

    expect(mockSendPermitNotifications).toHaveBeenCalledWith({
      permitId: 'permit-1',
      permitNumber: 'PTW-2024-0001',
      projectId: 'project-1',
      newStatus: 'active',
      parties: {
        applicant_id: 'user-1',
        verifier_id: 'user-2',
        approver_id: 'user-3',
      },
    })

    expect(mockSendPermitNotifications).toHaveBeenCalledWith({
      permitId: 'permit-2',
      permitNumber: 'PTW-2024-0002',
      projectId: 'project-2',
      newStatus: 'active',
      parties: {
        applicant_id: 'user-4',
        verifier_id: null,
        approver_id: 'user-5',
      },
    })
  })
})

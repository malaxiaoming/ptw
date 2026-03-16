import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import { getNotificationRecipients } from '@/lib/notifications/recipients'

describe('getNotificationRecipients', () => {
  const parties = {
    applicant_id: 'user-1',
    verifier_id: 'user-2',
    approver_id: 'user-3',
  }

  it('returns verifiers when permit is submitted', () => {
    const result = getNotificationRecipients('submitted', { ...parties, verifier_id: null, approver_id: null })
    expect(result.targetRoles).toEqual(['verifier'])
  })

  it('returns verifiers when closure is submitted', () => {
    const result = getNotificationRecipients('closure_submitted', parties)
    expect(result.targetRoles).toEqual(['verifier'])
  })

  it('returns approvers when permit is verified', () => {
    const result = getNotificationRecipients('verified', { ...parties, approver_id: null })
    expect(result.targetRoles).toEqual(['approver'])
  })

  it('returns applicant when permit is rejected', () => {
    const result = getNotificationRecipients('rejected', parties)
    expect(result.targetUserIds).toEqual(['user-1'])
  })

  it('returns applicant when permit is closed', () => {
    const result = getNotificationRecipients('closed', parties)
    expect(result.targetUserIds).toEqual(['user-1'])
  })

  it('returns applicant and verifier when permit is revoked', () => {
    const result = getNotificationRecipients('revoked', parties)
    expect(result.targetUserIds).toEqual(['user-1', 'user-2'])
  })

  it('returns only applicant when revoked and no verifier', () => {
    const result = getNotificationRecipients('revoked', { ...parties, verifier_id: null })
    expect(result.targetUserIds).toEqual(['user-1'])
  })

  it('returns applicant when permit is returned to draft', () => {
    const result = getNotificationRecipients('draft', parties)
    expect(result.targetUserIds).toEqual(['user-1'])
  })

  it('returns applicant when permit becomes active', () => {
    const result = getNotificationRecipients('active', parties)
    expect(result.targetUserIds).toEqual(['user-1'])
  })
})

// ---------------------------------------------------------------------------
// sendPermitNotifications
// ---------------------------------------------------------------------------

vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: vi.fn(),
}))

const mockSend = vi.fn()
vi.mock('resend', () => {
  return {
    Resend: class {
      emails = { send: mockSend }
    },
  }
})

import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendPermitNotifications } from '@/lib/notifications/send'

const mockCreateServiceClient = vi.mocked(createServiceRoleClient)

const baseParams = {
  permitId: 'permit-1',
  permitNumber: 'PTW-2024-0001',
  projectId: 'project-1',
  parties: {
    applicant_id: 'user-1',
    verifier_id: 'user-2',
    approver_id: 'user-3',
  },
}

describe('sendPermitNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('skips insert when getNotificationRecipients returns empty object (no template match path)', async () => {
    // Force a situation where template is undefined by using a status not in STATUS_MESSAGES.
    // All PermitStatus values have templates, so we simulate this by casting an unknown value.
    // This test verifies the guard: if template is falsy, we return early without calling supabase.
    const insertMock = vi.fn()
    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn().mockReturnValue({ insert: insertMock }),
    } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

    // Cast to bypass TypeScript — 'unknown_status' has no template entry
    await sendPermitNotifications({ ...baseParams, newStatus: 'unknown_status' as never })

    expect(insertMock).not.toHaveBeenCalled()
  })

  it('inserts notifications directly for targetUserIds statuses', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null })
    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn().mockReturnValue({ insert: insertMock }),
    } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

    await sendPermitNotifications({ ...baseParams, newStatus: 'active' })

    expect(insertMock).toHaveBeenCalledOnce()
    const [rows] = insertMock.mock.calls[0]
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      user_id: 'user-1',
      permit_id: 'permit-1',
      type: 'active',
      title: 'Permit Approved & Active — PTW-2024-0001',
      message: 'Your permit has been approved and is now active.',
    })
  })

  it('fetches role users and inserts for targetRoles statuses', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null })
    const inMock = vi.fn().mockResolvedValue({ data: [{ user_id: 'verifier-1' }, { user_id: 'verifier-2' }], error: null })
    const roleChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: inMock,
    }

    let fromCallCount = 0
    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn().mockImplementation(() => {
        fromCallCount++
        if (fromCallCount === 1) return roleChain
        return { insert: insertMock }
      }),
    } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

    await sendPermitNotifications({ ...baseParams, newStatus: 'submitted' })

    expect(inMock).toHaveBeenCalledWith('role', ['verifier'])
    expect(insertMock).toHaveBeenCalledOnce()
    const [rows] = insertMock.mock.calls[0]
    expect(rows).toHaveLength(2)
    expect(rows.map((r: { user_id: string }) => r.user_id)).toEqual(['verifier-1', 'verifier-2'])
  })

  it('deduplicates recipients when same user appears in both targetUserIds and role query', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null })
    // For 'revoked', targetUserIds = [applicant_id, verifier_id] — no role lookup
    // To test dedup we use a targetRoles status where the role query returns a user
    // already in targetUserIds. We use 'submitted' with no targetUserIds but
    // the role query returns a duplicate.
    const inMock = vi.fn().mockResolvedValue({
      data: [{ user_id: 'verifier-1' }, { user_id: 'verifier-1' }],
      error: null,
    })
    const roleChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: inMock,
    }

    let fromCallCount = 0
    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn().mockImplementation(() => {
        fromCallCount++
        if (fromCallCount === 1) return roleChain
        return { insert: insertMock }
      }),
    } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

    await sendPermitNotifications({ ...baseParams, newStatus: 'submitted' })

    expect(insertMock).toHaveBeenCalledOnce()
    const [rows] = insertMock.mock.calls[0]
    // Duplicates must be removed — only one row for verifier-1
    expect(rows).toHaveLength(1)
    expect(rows[0].user_id).toBe('verifier-1')
  })

  it('logs error when insert fails but does not throw', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const insertMock = vi.fn().mockResolvedValue({ error: { message: 'DB write failed' } })
    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn().mockReturnValue({ insert: insertMock }),
    } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

    await expect(
      sendPermitNotifications({ ...baseParams, newStatus: 'active' })
    ).resolves.toBeUndefined()

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[sendPermitNotifications] Failed to insert notifications:',
      'DB write failed'
    )
    consoleErrorSpy.mockRestore()
  })

  it('logs error when role lookup fails and falls through with empty list', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const inMock = vi.fn().mockResolvedValue({ data: null, error: { message: 'Role query failed' } })
    const roleChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: inMock,
    }
    const insertMock = vi.fn().mockResolvedValue({ error: null })

    let fromCallCount = 0
    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn().mockImplementation(() => {
        fromCallCount++
        if (fromCallCount === 1) return roleChain
        return { insert: insertMock }
      }),
    } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

    // 'submitted' targets verifiers via role lookup — if that fails, recipientIds stays empty,
    // so insert should not be called
    await sendPermitNotifications({ ...baseParams, newStatus: 'submitted' })

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[sendPermitNotifications] Failed to fetch role users:',
      'Role query failed'
    )
    // No recipients resolved, so insert must not be called
    expect(insertMock).not.toHaveBeenCalled()
    consoleErrorSpy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// Email notifications via Resend
// ---------------------------------------------------------------------------

describe('sendPermitNotifications — email', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  function mockSupabaseWithEmail(profiles: { id: string; email: string }[]) {
    const insertMock = vi.fn().mockResolvedValue({ error: null })
    const profilesInMock = vi.fn().mockResolvedValue({ data: profiles, error: null })
    const profilesChain = {
      select: vi.fn().mockReturnThis(),
      in: profilesInMock,
    }

    let fromCallCount = 0
    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn().mockImplementation(() => {
        fromCallCount++
        // 1st call: notifications insert
        if (fromCallCount === 1) return { insert: insertMock }
        // 2nd call: user_profiles select
        return profilesChain
      }),
    } as unknown as Awaited<ReturnType<typeof createServiceRoleClient>>)

    return { insertMock, profilesInMock }
  }

  it('sends emails when RESEND_API_KEY is set', async () => {
    process.env.RESEND_API_KEY = 'test-api-key'
    process.env.NEXT_PUBLIC_APP_URL = 'https://ptw.example.com'
    mockSend.mockResolvedValue({ data: { id: 'email-1' }, error: null })

    mockSupabaseWithEmail([{ id: 'user-1', email: 'applicant@example.com' }])

    await sendPermitNotifications({ ...baseParams, newStatus: 'active' })

    expect(mockSend).toHaveBeenCalledOnce()
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'onboarding@resend.dev',
        to: 'applicant@example.com',
        subject: 'Permit Approved & Active — PTW-2024-0001',
        html: expect.stringContaining('https://ptw.example.com/permits/permit-1'),
      })
    )
  })

  it('skips email when RESEND_API_KEY is not set', async () => {
    delete process.env.RESEND_API_KEY
    mockSupabaseWithEmail([{ id: 'user-1', email: 'applicant@example.com' }])

    await sendPermitNotifications({ ...baseParams, newStatus: 'active' })

    expect(mockSend).not.toHaveBeenCalled()
  })

  it('logs error and does not throw when Resend call fails', async () => {
    process.env.RESEND_API_KEY = 'test-api-key'
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockSend.mockRejectedValue(new Error('Rate limit exceeded'))

    mockSupabaseWithEmail([{ id: 'user-1', email: 'applicant@example.com' }])

    await expect(
      sendPermitNotifications({ ...baseParams, newStatus: 'active' })
    ).resolves.toBeUndefined()

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[sendPermitNotifications] Failed to send email to applicant@example.com:',
      expect.any(Error)
    )
    consoleErrorSpy.mockRestore()
  })

  it('sends correct subject and body content', async () => {
    process.env.RESEND_API_KEY = 'test-api-key'
    process.env.NEXT_PUBLIC_APP_URL = 'https://ptw.example.com'
    process.env.EMAIL_FROM = 'noreply@ptw.com'
    mockSend.mockResolvedValue({ data: { id: 'email-1' }, error: null })

    mockSupabaseWithEmail([{ id: 'user-1', email: 'applicant@example.com' }])

    await sendPermitNotifications({ ...baseParams, newStatus: 'rejected' })

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'noreply@ptw.com',
        to: 'applicant@example.com',
        subject: 'Permit Rejected — PTW-2024-0001',
        html: expect.stringContaining('Your permit has been rejected.'),
      })
    )
  })
})

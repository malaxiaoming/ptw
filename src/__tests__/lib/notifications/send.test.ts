import { describe, it, expect } from 'vitest'
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

  it('returns applicant when permit is approved', () => {
    const result = getNotificationRecipients('approved', parties)
    expect(result.targetUserIds).toEqual(['user-1'])
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

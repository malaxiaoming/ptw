import { describe, it, expect } from 'vitest'
import { validateTransition } from '@/lib/permits/transition'
import { validateChecklist } from '@/lib/permits/checklist-validation'
import { getNotificationRecipients } from '@/lib/notifications/recipients'

describe('Full permit lifecycle', () => {
  const applicant = { userId: 'applicant-1', roles: ['applicant'] as import('@/lib/auth/permissions').Role[] }
  const verifier = { userId: 'verifier-1', roles: ['verifier'] as import('@/lib/auth/permissions').Role[] }
  const approver = { userId: 'approver-1', roles: ['approver'] as import('@/lib/auth/permissions').Role[] }

  const permit = {
    id: 'permit-1',
    applicant_id: 'applicant-1',
    project_id: 'project-1',
  }

  it('follows complete happy path: draft -> submitted -> verified -> active -> closure_submitted -> closed', () => {
    // Submit
    let result = validateTransition({ ...permit, status: 'draft' }, 'submit', applicant)
    expect(result.valid).toBe(true)
    expect(result.newStatus).toBe('submitted')

    // Verify
    result = validateTransition({ ...permit, status: 'submitted' }, 'verify', verifier)
    expect(result.valid).toBe(true)
    expect(result.newStatus).toBe('verified')

    // Approve (goes directly to active)
    result = validateTransition({ ...permit, status: 'verified' }, 'approve', approver)
    expect(result.valid).toBe(true)
    expect(result.newStatus).toBe('active')

    // Submit closure
    result = validateTransition({ ...permit, status: 'active' }, 'submit_closure', applicant)
    expect(result.valid).toBe(true)
    expect(result.newStatus).toBe('closure_submitted')

    // Verify closure
    result = validateTransition({ ...permit, status: 'closure_submitted' }, 'verify_closure', verifier)
    expect(result.valid).toBe(true)
    expect(result.newStatus).toBe('closed')
  })

  it('follows rejection path: draft -> submitted -> verified -> rejected', () => {
    let result = validateTransition({ ...permit, status: 'draft' }, 'submit', applicant)
    expect(result.valid).toBe(true)

    result = validateTransition({ ...permit, status: 'submitted' }, 'verify', verifier)
    expect(result.valid).toBe(true)

    result = validateTransition({ ...permit, status: 'verified' }, 'reject', approver)
    expect(result.valid).toBe(true)
    expect(result.newStatus).toBe('rejected')
    expect(result.requiresComment).toBe(true)
  })

  it('follows revocation path: active -> revoked', () => {
    const result = validateTransition({ ...permit, status: 'active' }, 'revoke', approver)
    expect(result.valid).toBe(true)
    expect(result.newStatus).toBe('revoked')
    expect(result.requiresComment).toBe(true)
  })

  it('prevents skipping: draft cannot jump to approved', () => {
    const result = validateTransition({ ...permit, status: 'draft' }, 'approve', approver)
    expect(result.valid).toBe(false)
  })

  it('prevents self-action: applicant cannot verify own permit', () => {
    const result = validateTransition(
      { ...permit, status: 'submitted' },
      'verify',
      { userId: 'applicant-1', roles: ['verifier'] }
    )
    expect(result.valid).toBe(false)
  })

  it('notifications go to correct recipients at each step', () => {
    const parties = {
      applicant_id: 'applicant-1',
      verifier_id: 'verifier-1',
      approver_id: 'approver-1',
    }

    expect(getNotificationRecipients('submitted', parties).targetRoles).toEqual(['verifier'])
    expect(getNotificationRecipients('verified', parties).targetRoles).toEqual(['approver'])
    expect(getNotificationRecipients('active', parties).targetUserIds).toEqual(['applicant-1'])
    expect(getNotificationRecipients('rejected', parties).targetUserIds).toEqual(['applicant-1'])
    expect(getNotificationRecipients('revoked', parties).targetUserIds).toEqual(['applicant-1', 'verifier-1'])
  })
})

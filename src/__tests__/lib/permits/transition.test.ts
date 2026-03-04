import { describe, it, expect } from 'vitest'
import { validateTransition } from '@/lib/permits/transition'

describe('validateTransition', () => {
  const basePermit = {
    id: 'permit-1',
    status: 'draft' as const,
    applicant_id: 'user-1',
    project_id: 'project-1',
  }

  it('allows applicant to submit their own draft permit', () => {
    const result = validateTransition(basePermit, 'submit', {
      userId: 'user-1',
      roles: ['applicant'],
    })
    expect(result.valid).toBe(true)
  })

  it('denies verifier from submitting a permit', () => {
    const result = validateTransition(basePermit, 'submit', {
      userId: 'user-2',
      roles: ['verifier'],
    })
    expect(result.valid).toBe(false)
    expect(result.error).toContain('permission')
  })

  it('denies applicant from verifying their own permit', () => {
    const permit = { ...basePermit, status: 'submitted' as const }
    const result = validateTransition(permit, 'verify', {
      userId: 'user-1',
      roles: ['verifier'],
    })
    expect(result.valid).toBe(false)
    expect(result.error).toContain('own permit')
  })

  it('allows verifier to verify someone else permit', () => {
    const permit = { ...basePermit, status: 'submitted' as const }
    const result = validateTransition(permit, 'verify', {
      userId: 'user-2',
      roles: ['verifier'],
    })
    expect(result.valid).toBe(true)
  })

  it('denies invalid transition', () => {
    const result = validateTransition(basePermit, 'approve', {
      userId: 'user-3',
      roles: ['approver'],
    })
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Cannot')
  })

  it('requires comment when rejecting', () => {
    const permit = { ...basePermit, status: 'verified' as const }
    const result = validateTransition(permit, 'reject', {
      userId: 'user-3',
      roles: ['approver'],
    })
    expect(result.valid).toBe(true)
    expect(result.requiresComment).toBe(true)
  })

  it('denies applicant from revoking their own permit', () => {
    const permit = { ...basePermit, status: 'active' as const }
    const result = validateTransition(permit, 'revoke', {
      userId: 'user-1',
      roles: ['approver'],
    })
    expect(result.valid).toBe(false)
    expect(result.error).toContain('own permit')
  })

  it('requires comment when returning permit to draft', () => {
    const permit = { ...basePermit, status: 'submitted' as const }
    const result = validateTransition(permit, 'return', {
      userId: 'user-2',
      roles: ['verifier'],
    })
    expect(result.valid).toBe(true)
    expect(result.requiresComment).toBe(true)
  })

  it('denies user with no roles', () => {
    const result = validateTransition(basePermit, 'submit', {
      userId: 'user-2',
      roles: [],
    })
    expect(result.valid).toBe(false)
    expect(result.error).toContain('permission')
  })
})

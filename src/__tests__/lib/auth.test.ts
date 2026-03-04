import { describe, it, expect } from 'vitest'
import { canPerformAction, canPerformActionWithRoles, ROLE_PERMISSIONS } from '@/lib/auth/permissions'

describe('permissions', () => {
  it('allows applicant to create permit', () => {
    expect(canPerformAction('applicant', 'create_permit')).toBe(true)
  })

  it('denies verifier from creating permit', () => {
    expect(canPerformAction('verifier', 'create_permit')).toBe(false)
  })

  it('allows verifier to verify permit', () => {
    expect(canPerformAction('verifier', 'verify_permit')).toBe(true)
  })

  it('allows approver to approve permit', () => {
    expect(canPerformAction('approver', 'approve_permit')).toBe(true)
  })

  it('allows approver to revoke permit', () => {
    expect(canPerformAction('approver', 'revoke_permit')).toBe(true)
  })

  it('denies applicant from approving permit', () => {
    expect(canPerformAction('applicant', 'approve_permit')).toBe(false)
  })

  it('allows admin to manage users', () => {
    expect(canPerformAction('admin', 'manage_users')).toBe(true)
  })

  it('denies verifier from managing users', () => {
    expect(canPerformAction('verifier', 'manage_users')).toBe(false)
  })
})

describe('canPerformActionWithRoles', () => {
  it('returns true when one of multiple roles has the action', () => {
    expect(canPerformActionWithRoles(['applicant', 'verifier'], 'verify_permit')).toBe(true)
  })

  it('returns false when no role has the action', () => {
    expect(canPerformActionWithRoles(['applicant', 'verifier'], 'approve_permit')).toBe(false)
  })

  it('returns false for empty roles array', () => {
    expect(canPerformActionWithRoles([], 'create_permit')).toBe(false)
  })
})

describe('critical permission denials', () => {
  it('denies admin from workflow actions (approve_permit)', () => {
    expect(canPerformAction('admin', 'approve_permit')).toBe(false)
  })

  it('denies applicant from verifying permit', () => {
    expect(canPerformAction('applicant', 'verify_permit')).toBe(false)
  })

  it('denies verifier from approving permit', () => {
    expect(canPerformAction('verifier', 'approve_permit')).toBe(false)
  })

  it('denies approver from creating permit', () => {
    expect(canPerformAction('approver', 'create_permit')).toBe(false)
  })
})

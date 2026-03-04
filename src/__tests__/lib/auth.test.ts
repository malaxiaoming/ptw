import { describe, it, expect } from 'vitest'
import { canPerformAction, ROLE_PERMISSIONS } from '@/lib/auth/permissions'

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

import { describe, it, expect } from 'vitest'
import { canPerformAction, canPerformActionWithRoles } from '@/lib/auth/permissions'
import { isOrgAdmin } from '@/lib/auth/check-admin'
import type { UserProfile } from '@/lib/auth/get-user'

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

describe('isOrgAdmin', () => {
  const baseUser: UserProfile = {
    id: 'user-1',
    email: 'test@example.com',
    phone: null,
    name: 'Test User',
    organization_id: 'org-1',
    is_admin: false,
    created_at: '2024-01-01T00:00:00Z',
  }

  it('returns true when user.is_admin is true', () => {
    expect(isOrgAdmin({ ...baseUser, is_admin: true })).toBe(true)
  })

  it('returns false when user.is_admin is false', () => {
    expect(isOrgAdmin({ ...baseUser, is_admin: false })).toBe(false)
  })
})

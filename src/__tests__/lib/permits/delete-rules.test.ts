import { describe, it, expect, vi, afterEach } from 'vitest'
import { canDeletePermit } from '@/lib/permits/delete-rules'

const applicant = { userId: 'user-1', isAdmin: false }
const admin = { userId: 'admin-1', isAdmin: true }
const otherUser = { userId: 'user-2', isAdmin: false }

const pastDate = '2025-01-01T00:00:00Z'
const futureDate = '2099-12-31T23:59:59Z'

describe('canDeletePermit', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows applicant to delete draft', () => {
    const result = canDeletePermit(
      { status: 'draft', applicant_id: 'user-1', scheduled_end: null },
      applicant
    )
    expect(result).toEqual({ allowed: true })
  })

  it('allows admin to delete draft', () => {
    const result = canDeletePermit(
      { status: 'draft', applicant_id: 'user-1', scheduled_end: null },
      admin
    )
    expect(result).toEqual({ allowed: true })
  })

  it('rejects other user deleting draft', () => {
    const result = canDeletePermit(
      { status: 'draft', applicant_id: 'user-1', scheduled_end: null },
      otherUser
    )
    expect(result.allowed).toBe(false)
    expect(result.reason).toBeDefined()
  })

  it('rejects submitted permit that has not expired', () => {
    const result = canDeletePermit(
      { status: 'submitted', applicant_id: 'user-1', scheduled_end: futureDate },
      applicant
    )
    expect(result.allowed).toBe(false)
  })

  it('allows applicant to delete expired submitted permit', () => {
    const result = canDeletePermit(
      { status: 'submitted', applicant_id: 'user-1', scheduled_end: pastDate },
      applicant
    )
    expect(result).toEqual({ allowed: true })
  })

  it('allows admin to delete expired submitted permit', () => {
    const result = canDeletePermit(
      { status: 'submitted', applicant_id: 'user-1', scheduled_end: pastDate },
      admin
    )
    expect(result).toEqual({ allowed: true })
  })

  it('allows applicant to delete expired verified permit', () => {
    const result = canDeletePermit(
      { status: 'verified', applicant_id: 'user-1', scheduled_end: pastDate },
      applicant
    )
    expect(result).toEqual({ allowed: true })
  })

  it('rejects submitted permit without scheduled_end', () => {
    const result = canDeletePermit(
      { status: 'submitted', applicant_id: 'user-1', scheduled_end: null },
      applicant
    )
    expect(result.allowed).toBe(false)
  })

  it('rejects approved permit', () => {
    const result = canDeletePermit(
      { status: 'approved', applicant_id: 'user-1', scheduled_end: pastDate },
      applicant
    )
    expect(result.allowed).toBe(false)
  })

  it('rejects active permit', () => {
    const result = canDeletePermit(
      { status: 'active', applicant_id: 'user-1', scheduled_end: pastDate },
      applicant
    )
    expect(result.allowed).toBe(false)
  })

  it('rejects closed permit', () => {
    const result = canDeletePermit(
      { status: 'closed', applicant_id: 'user-1', scheduled_end: pastDate },
      applicant
    )
    expect(result.allowed).toBe(false)
  })

  it('rejects rejected permit', () => {
    const result = canDeletePermit(
      { status: 'rejected', applicant_id: 'user-1', scheduled_end: pastDate },
      applicant
    )
    expect(result.allowed).toBe(false)
  })

  it('rejects revoked permit', () => {
    const result = canDeletePermit(
      { status: 'revoked', applicant_id: 'user-1', scheduled_end: pastDate },
      applicant
    )
    expect(result.allowed).toBe(false)
  })
})

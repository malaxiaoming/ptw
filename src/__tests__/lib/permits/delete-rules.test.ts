import { describe, it, expect } from 'vitest'
import { canDeletePermit } from '@/lib/permits/delete-rules'

const applicant = { userId: 'user-1', isAdmin: false }
const admin = { userId: 'admin-1', isAdmin: true }
const otherUser = { userId: 'user-2', isAdmin: false }

describe('canDeletePermit', () => {
  it('allows applicant to delete draft', () => {
    const result = canDeletePermit(
      { status: 'draft', applicant_id: 'user-1' },
      applicant
    )
    expect(result).toEqual({ allowed: true })
  })

  it('allows admin to delete draft', () => {
    const result = canDeletePermit(
      { status: 'draft', applicant_id: 'user-1' },
      admin
    )
    expect(result).toEqual({ allowed: true })
  })

  it('rejects other user deleting draft', () => {
    const result = canDeletePermit(
      { status: 'draft', applicant_id: 'user-1' },
      otherUser
    )
    expect(result.allowed).toBe(false)
    expect(result.reason).toBeDefined()
  })

  it('allows applicant to delete submitted permit', () => {
    const result = canDeletePermit(
      { status: 'submitted', applicant_id: 'user-1' },
      applicant
    )
    expect(result).toEqual({ allowed: true })
  })

  it('allows admin to delete submitted permit', () => {
    const result = canDeletePermit(
      { status: 'submitted', applicant_id: 'user-1' },
      admin
    )
    expect(result).toEqual({ allowed: true })
  })

  it('allows applicant to delete verified permit', () => {
    const result = canDeletePermit(
      { status: 'verified', applicant_id: 'user-1' },
      applicant
    )
    expect(result).toEqual({ allowed: true })
  })

  it('allows admin to delete verified permit', () => {
    const result = canDeletePermit(
      { status: 'verified', applicant_id: 'user-1' },
      admin
    )
    expect(result).toEqual({ allowed: true })
  })

  it('rejects active permit', () => {
    const result = canDeletePermit(
      { status: 'active', applicant_id: 'user-1' },
      applicant
    )
    expect(result.allowed).toBe(false)
  })

  it('rejects closed permit', () => {
    const result = canDeletePermit(
      { status: 'closed', applicant_id: 'user-1' },
      applicant
    )
    expect(result.allowed).toBe(false)
  })

  it('rejects rejected permit', () => {
    const result = canDeletePermit(
      { status: 'rejected', applicant_id: 'user-1' },
      applicant
    )
    expect(result.allowed).toBe(false)
  })

  it('rejects revoked permit', () => {
    const result = canDeletePermit(
      { status: 'revoked', applicant_id: 'user-1' },
      applicant
    )
    expect(result.allowed).toBe(false)
  })

  it('rejects closure_submitted permit', () => {
    const result = canDeletePermit(
      { status: 'closure_submitted', applicant_id: 'user-1' },
      applicant
    )
    expect(result.allowed).toBe(false)
  })
})

import { describe, it, expect } from 'vitest'
import {
  canTransition,
  getAvailableTransitions,
  type PermitStatus,
} from '@/lib/permits/state-machine'

describe('canTransition', () => {
  it('allows draft -> submitted', () => {
    expect(canTransition('draft', 'submit')).toBe(true)
  })

  it('allows submitted -> verified', () => {
    expect(canTransition('submitted', 'verify')).toBe(true)
  })

  it('allows submitted -> draft (return)', () => {
    expect(canTransition('submitted', 'return')).toBe(true)
  })

  it('allows verified -> approved', () => {
    expect(canTransition('verified', 'approve')).toBe(true)
  })

  it('allows verified -> rejected', () => {
    expect(canTransition('verified', 'reject')).toBe(true)
  })

  it('allows approved -> active', () => {
    expect(canTransition('approved', 'activate')).toBe(true)
  })

  it('allows active -> closure_submitted', () => {
    expect(canTransition('active', 'submit_closure')).toBe(true)
  })

  it('allows active -> revoked', () => {
    expect(canTransition('active', 'revoke')).toBe(true)
  })

  it('allows closure_submitted -> closed', () => {
    expect(canTransition('closure_submitted', 'verify_closure')).toBe(true)
  })

  it('allows closure_submitted -> active (return_closure)', () => {
    expect(canTransition('closure_submitted', 'return_closure')).toBe(true)
  })

  it('denies draft -> approved (skip)', () => {
    expect(canTransition('draft', 'approve')).toBe(false)
  })

  it('denies closed -> any transition', () => {
    expect(canTransition('closed', 'submit')).toBe(false)
    expect(canTransition('closed', 'revoke')).toBe(false)
  })

  it('denies rejected -> any transition', () => {
    expect(canTransition('rejected', 'approve')).toBe(false)
  })

  it('denies revoked -> any transition', () => {
    expect(canTransition('revoked', 'submit')).toBe(false)
  })
})

describe('getAvailableTransitions', () => {
  it('returns submit for draft', () => {
    expect(getAvailableTransitions('draft')).toEqual(['submit'])
  })

  it('returns verify and return for submitted', () => {
    expect(getAvailableTransitions('submitted')).toEqual(['verify', 'return'])
  })

  it('returns approve and reject for verified', () => {
    expect(getAvailableTransitions('verified')).toEqual(['approve', 'reject'])
  })

  it('returns activate for approved', () => {
    expect(getAvailableTransitions('approved')).toEqual(['activate'])
  })

  it('returns submit_closure and revoke for active', () => {
    expect(getAvailableTransitions('active')).toEqual(['submit_closure', 'revoke'])
  })

  it('returns verify_closure and return_closure for closure_submitted', () => {
    expect(getAvailableTransitions('closure_submitted')).toEqual(['verify_closure', 'return_closure'])
  })

  it('returns nothing for closed', () => {
    expect(getAvailableTransitions('closed')).toEqual([])
  })

  it('returns nothing for rejected', () => {
    expect(getAvailableTransitions('rejected')).toEqual([])
  })

  it('returns nothing for revoked', () => {
    expect(getAvailableTransitions('revoked')).toEqual([])
  })
})

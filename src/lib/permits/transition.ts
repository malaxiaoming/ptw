import { getTransition, type PermitAction, type PermitStatus } from './state-machine'
import type { Role } from '@/lib/auth/permissions'

export interface PermitContext {
  id: string
  status: PermitStatus
  applicant_id: string
  project_id: string
}

export interface UserContext {
  userId: string
  roles: Role[]
}

export interface TransitionResult {
  valid: boolean
  error?: string
  requiresComment?: boolean
  newStatus?: PermitStatus
}

export function validateTransition(
  permit: PermitContext,
  action: PermitAction,
  user: UserContext
): TransitionResult {
  // Check if transition is valid for current status
  const transition = getTransition(permit.status, action)
  if (!transition) {
    return { valid: false, error: `Cannot ${action} a permit in ${permit.status} status` }
  }

  // Check role permission (system actions skip role check)
  if (transition.role !== 'system') {
    // transition.role is one of: 'applicant' | 'verifier' | 'approver'
    // These are all valid Role values (Role includes 'admin' too, but transitions never require 'admin')
    const requiredRole = transition.role  // TransitionRequiredRole (excluding 'system')
    const hasRole = user.roles.some((r) => r === requiredRole)
    if (!hasRole) {
      return { valid: false, error: `You do not have permission to ${action} this permit` }
    }
  }

  // Self-action prevention: applicant cannot review, approve, reject, or revoke their own permit.
  // NOTE: 'submit' and 'submit_closure' are intentionally excluded — an applicant
  // must be able to submit and close their own permit.
  const selfPreventedActions: PermitAction[] = [
    'verify',
    'return',
    'approve',
    'reject',
    'revoke',
    'verify_closure',
    'return_closure',
  ]
  if (selfPreventedActions.includes(action) && user.userId === permit.applicant_id) {
    return { valid: false, error: 'You cannot perform this action on your own permit' }
  }

  return {
    valid: true,
    requiresComment: transition.requiresComment,
    newStatus: transition.to,
  }
}

import { getTransition, canTransition, type PermitAction, type PermitStatus } from './state-machine'
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
  if (!canTransition(permit.status, action)) {
    return { valid: false, error: `Cannot ${action} a permit in ${permit.status} status` }
  }

  const transition = getTransition(permit.status, action)!

  // Check role permission (system actions skip role check)
  if (transition.role !== 'system') {
    const hasRole = user.roles.includes(transition.role as Role)
    if (!hasRole) {
      return { valid: false, error: `You do not have permission to ${action} this permit` }
    }
  }

  // Self-action prevention: applicant cannot verify or approve their own permit
  const selfPreventedActions: PermitAction[] = ['verify', 'return', 'approve', 'reject', 'verify_closure', 'return_closure']
  if (selfPreventedActions.includes(action) && user.userId === permit.applicant_id) {
    return { valid: false, error: 'You cannot perform this action on your own permit' }
  }

  return {
    valid: true,
    requiresComment: transition.requiresComment,
    newStatus: transition.to,
  }
}

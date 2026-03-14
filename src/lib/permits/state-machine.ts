export type PermitStatus =
  | 'draft'
  | 'submitted'
  | 'verified'
  | 'active'
  | 'closure_submitted'
  | 'closed'
  | 'rejected'
  | 'revoked'

export type PermitAction =
  | 'submit'
  | 'verify'
  | 'return'
  | 'approve'
  | 'reject'
  | 'submit_closure'
  | 'revoke'
  | 'verify_closure'
  | 'return_closure'

export type TransitionRequiredRole = 'applicant' | 'verifier' | 'approver' | 'system'

export interface Transition {
  from: PermitStatus
  action: PermitAction
  to: PermitStatus
  role: TransitionRequiredRole
  requiresComment: boolean
}

export const TRANSITIONS: Transition[] = [
  { from: 'draft', action: 'submit', to: 'submitted', role: 'applicant', requiresComment: false },
  { from: 'submitted', action: 'verify', to: 'verified', role: 'verifier', requiresComment: false },
  { from: 'submitted', action: 'return', to: 'draft', role: 'verifier', requiresComment: true },
  { from: 'verified', action: 'approve', to: 'active', role: 'approver', requiresComment: false },
  { from: 'verified', action: 'reject', to: 'rejected', role: 'approver', requiresComment: true },
  { from: 'active', action: 'submit_closure', to: 'closure_submitted', role: 'applicant', requiresComment: false },
  { from: 'active', action: 'revoke', to: 'revoked', role: 'approver', requiresComment: true },
  { from: 'closure_submitted', action: 'verify_closure', to: 'closed', role: 'verifier', requiresComment: false },
  { from: 'closure_submitted', action: 'return_closure', to: 'active', role: 'verifier', requiresComment: true },
]

export function canTransition(from: PermitStatus, action: PermitAction): boolean {
  return TRANSITIONS.some((t) => t.from === from && t.action === action)
}

export function getTransition(from: PermitStatus, action: PermitAction): Transition | undefined {
  return TRANSITIONS.find((t) => t.from === from && t.action === action)
}

export function getAvailableTransitions(status: PermitStatus): PermitAction[] {
  return TRANSITIONS.filter((t) => t.from === status).map((t) => t.action)
}

export type Role = 'applicant' | 'verifier' | 'approver'

export type Action =
  | 'create_permit'
  | 'edit_permit'
  | 'submit_permit'
  | 'verify_permit'
  | 'return_permit'
  | 'approve_permit'
  | 'reject_permit'
  | 'revoke_permit'
  | 'submit_closure'
  | 'verify_closure'
  | 'return_closure'
  | 'view_permits'
  | 'view_dashboard'
  | 'create_toolbox_meeting'
  | 'view_toolbox_meetings'

export const ROLE_PERMISSIONS: Record<Role, Action[]> = {
  applicant: [
    'create_permit',
    'edit_permit',
    'submit_permit',
    'submit_closure',
    'view_permits',
    'view_dashboard',
    'create_toolbox_meeting',
    'view_toolbox_meetings',
  ],
  verifier: [
    'verify_permit',
    'return_permit',
    'verify_closure',
    'return_closure',
    'view_permits',
    'view_dashboard',
    'create_toolbox_meeting',
    'view_toolbox_meetings',
  ],
  approver: [
    'approve_permit',
    'reject_permit',
    'revoke_permit',
    'view_permits',
    'view_dashboard',
    'create_toolbox_meeting',
    'view_toolbox_meetings',
  ],
}

export function canPerformAction(role: Role, action: Action): boolean {
  return ROLE_PERMISSIONS[role]?.includes(action) ?? false
}

export function canPerformActionWithRoles(roles: Role[], action: Action): boolean {
  return roles.some((role) => canPerformAction(role, action))
}

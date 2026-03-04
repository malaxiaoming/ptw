export type Role = 'applicant' | 'verifier' | 'approver' | 'admin'

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
  | 'manage_users'
  | 'manage_projects'
  | 'manage_permit_types'
  | 'manage_workers'
  | 'view_dashboard'

export const ROLE_PERMISSIONS: Record<Role, Action[]> = {
  applicant: [
    'create_permit',
    'edit_permit',
    'submit_permit',
    'submit_closure',
    'view_permits',
    'manage_workers',
    'view_dashboard',
  ],
  verifier: [
    'verify_permit',
    'return_permit',
    'verify_closure',
    'return_closure',
    'view_permits',
    'view_dashboard',
  ],
  approver: [
    'approve_permit',
    'reject_permit',
    'revoke_permit',
    'view_permits',
    'view_dashboard',
  ],
  admin: [
    'manage_users',
    'manage_projects',
    'manage_permit_types',
    'manage_workers',
    'view_permits',
    'view_dashboard',
  ],
}

export function canPerformAction(role: Role, action: Action): boolean {
  return ROLE_PERMISSIONS[role]?.includes(action) ?? false
}

export function canPerformActionWithRoles(roles: Role[], action: Action): boolean {
  return roles.some((role) => canPerformAction(role, action))
}

import type { UserProfile } from './get-user'

/**
 * Returns true if the user is an org-level admin.
 * Admin status is stored directly on user_profiles.is_admin.
 */
export function isOrgAdmin(user: UserProfile): boolean {
  return user.is_admin === true
}

export function isSuperAdmin(user: UserProfile): boolean {
  return user.system_role === 'super_admin'
}

export function isRegionalAdmin(user: UserProfile): boolean {
  return user.system_role === 'regional_admin'
}

export function isPlatformAdmin(user: UserProfile): boolean {
  return user.system_role === 'super_admin' || user.system_role === 'regional_admin'
}

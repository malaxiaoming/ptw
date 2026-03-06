import type { UserProfile } from './get-user'

/**
 * Returns true if the user is an org-level admin.
 * Admin status is stored directly on user_profiles.is_admin.
 */
export function isOrgAdmin(user: UserProfile): boolean {
  return user.is_admin === true
}

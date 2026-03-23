import { getCurrentUser } from './get-user'
import { isPlatformAdmin, isSuperAdmin } from './check-admin'
import { error } from '@/lib/api/response'
import type { UserProfile } from './get-user'
import type { NextResponse } from 'next/server'

type GuardResult =
  | { user: UserProfile; errorResponse: null }
  | { user: null; errorResponse: NextResponse }

export async function requirePlatformAdmin(): Promise<GuardResult> {
  const user = await getCurrentUser()
  if (!user) return { user: null, errorResponse: error('Unauthorized', 401) }
  if (!isPlatformAdmin(user)) return { user: null, errorResponse: error('Platform admin access required', 403) }
  return { user, errorResponse: null }
}

export async function requireSuperAdmin(): Promise<GuardResult> {
  const user = await getCurrentUser()
  if (!user) return { user: null, errorResponse: error('Unauthorized', 401) }
  if (!isSuperAdmin(user)) return { user: null, errorResponse: error('Super admin access required', 403) }
  return { user, errorResponse: null }
}

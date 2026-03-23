import { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requirePlatformAdmin, requireSuperAdmin } from '@/lib/auth/require-platform-admin'
import { success, error } from '@/lib/api/response'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireSuperAdmin()
  if (guard.errorResponse) return guard.errorResponse

  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return error('Invalid JSON', 400)
  }

  const serviceClient = await createServiceRoleClient()

  // Fetch target user
  const { data: target, error: fetchError } = await serviceClient
    .from('user_profiles')
    .select('id, system_role, is_admin')
    .eq('id', id)
    .single()

  if (fetchError || !target) return error('User not found', 404)

  const updates: Record<string, unknown> = {}

  if ('system_role' in body) {
    if (body.system_role !== null && body.system_role !== 'super_admin' && body.system_role !== 'regional_admin') {
      return error('system_role must be super_admin, regional_admin, or null', 400)
    }
    updates.system_role = body.system_role
  }

  if ('is_admin' in body) {
    if (typeof body.is_admin !== 'boolean') {
      return error('is_admin must be a boolean', 400)
    }
    updates.is_admin = body.is_admin
  }

  if (Object.keys(updates).length === 0) {
    return error('No valid fields to update', 400)
  }

  const { data: updated, error: updateError } = await serviceClient
    .from('user_profiles')
    .update(updates)
    .eq('id', id)
    .select('id, name, email, system_role, is_admin, organization_id, created_at')
    .single()

  if (updateError) return error(`Failed to update admin: ${updateError.message}`, 500)

  return success(updated)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requirePlatformAdmin()
  if (guard.errorResponse) return guard.errorResponse

  const { id } = await params

  // Cannot demote yourself
  if (id === guard.user.id) {
    return error('Cannot demote yourself', 400)
  }

  const serviceClient = await createServiceRoleClient()

  // Fetch target user
  const { data: target, error: fetchError } = await serviceClient
    .from('user_profiles')
    .select('id, system_role, is_admin')
    .eq('id', id)
    .single()

  if (fetchError || !target) return error('User not found', 404)

  // Super admin required to demote system_role users
  if (target.system_role) {
    const superGuard = await requireSuperAdmin()
    if (superGuard.errorResponse) return superGuard.errorResponse
  }

  const updates: Record<string, unknown> = {}
  if (target.system_role) updates.system_role = null
  if (target.is_admin) updates.is_admin = false

  if (Object.keys(updates).length === 0) {
    return error('User is not an admin', 400)
  }

  const { error: updateError } = await serviceClient
    .from('user_profiles')
    .update(updates)
    .eq('id', id)

  if (updateError) return error(`Failed to demote admin: ${updateError.message}`, 500)

  return success({ demoted: true })
}

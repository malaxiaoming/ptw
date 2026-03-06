import { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { isOrgAdmin } from '@/lib/auth/check-admin'
import { success, error } from '@/lib/api/response'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)
  if (!isOrgAdmin(user)) return error('Admin access required', 403)

  const { id } = await params
  const serviceClient = await createServiceRoleClient()

  const { data, error: dbError } = await serviceClient
    .from('user_project_roles')
    .select(`
      id, user_id, role, is_active,
      user_profiles(id, name, email, organization_id)
    `)
    .eq('project_id', id)
    .order('role', { ascending: true })

  if (dbError) return error(dbError.message, 500)

  return success(data)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)
  if (!isOrgAdmin(user)) return error('Admin access required', 403)

  const { id } = await params
  const serviceClient = await createServiceRoleClient()

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return error('Invalid JSON', 400)
  }

  if (!body.user_id || typeof body.user_id !== 'string') {
    return error('user_id is required', 400)
  }
  if (!body.role || typeof body.role !== 'string') {
    return error('role is required', 400)
  }

  const validRoles = ['applicant', 'verifier', 'approver']
  if (!validRoles.includes(body.role)) {
    return error('Invalid role', 400)
  }

  // Fetch the project to know its org
  const { data: project } = await serviceClient
    .from('projects')
    .select('organization_id')
    .eq('id', id)
    .single()

  if (!project) return error('Project not found', 404)

  // Fetch the target user's org
  const { data: targetUser } = await serviceClient
    .from('user_profiles')
    .select('organization_id')
    .eq('id', body.user_id)
    .single()

  if (!targetUser) {
    return error('User not found', 404)
  }

  // Cross-org constraint: external users can only be assigned applicant
  if (targetUser.organization_id !== project.organization_id) {
    if (body.role !== 'applicant') {
      return error('External users can only be assigned the applicant role', 400)
    }
  }

  // Upsert semantics: insert, on conflict do nothing
  const { data, error: dbError } = await serviceClient
    .from('user_project_roles')
    .upsert(
      { user_id: body.user_id, project_id: id, role: body.role },
      { onConflict: 'user_id,project_id,role', ignoreDuplicates: true }
    )
    .select('id, user_id, role, is_active')
    .maybeSingle()  // returns null on duplicate (no-op upsert)

  if (dbError) return error(dbError.message, 500)
  // data is null when duplicate (already assigned) - that's OK
  return success(data ?? { user_id: body.user_id, role: body.role, project_id: id }, 201)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)
  if (!isOrgAdmin(user)) return error('Admin access required', 403)

  const { id } = await params
  const serviceClient = await createServiceRoleClient()

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return error('Invalid JSON', 400)
  }

  if (!body.user_id || typeof body.user_id !== 'string') {
    return error('user_id is required', 400)
  }
  if (!body.role || typeof body.role !== 'string') {
    return error('role is required', 400)
  }
  if (typeof body.is_active !== 'boolean') {
    return error('is_active (boolean) is required', 400)
  }

  const { data, error: dbError } = await serviceClient
    .from('user_project_roles')
    .update({ is_active: body.is_active })
    .eq('user_id', body.user_id)
    .eq('project_id', id)
    .eq('role', body.role)
    .select('id, user_id, role, is_active')
    .single()

  if (dbError) return error(dbError.message, 500)
  if (!data) return error('Role assignment not found', 404)

  return success(data)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)
  if (!isOrgAdmin(user)) return error('Admin access required', 403)

  const { id } = await params
  const serviceClient = await createServiceRoleClient()

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return error('Invalid JSON', 400)
  }

  if (!body.user_id || typeof body.user_id !== 'string') {
    return error('user_id is required', 400)
  }
  if (!body.role || typeof body.role !== 'string') {
    return error('role is required', 400)
  }

  const validRoles = ['applicant', 'verifier', 'approver']
  if (!validRoles.includes(body.role as string)) {
    return error('Invalid role', 400)
  }

  const { error: dbError } = await serviceClient
    .from('user_project_roles')
    .delete()
    .eq('user_id', body.user_id)
    .eq('project_id', id)
    .eq('role', body.role)

  if (dbError) return error(dbError.message, 500)

  return success({ ok: true })
}

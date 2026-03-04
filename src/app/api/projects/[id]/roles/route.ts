import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { isOrgAdmin } from '@/lib/auth/check-admin'
import { success, error } from '@/lib/api/response'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  const { id } = await params
  const supabase = await createServerSupabaseClient()

  let adminAccess: boolean
  try {
    adminAccess = await isOrgAdmin(supabase, user.id, user.organization_id!)
  } catch {
    return error('Service unavailable', 503)
  }
  if (!adminAccess) return error('Admin access required', 403)

  const { data, error: dbError } = await supabase
    .from('user_project_roles')
    .select(`
      id, user_id, role,
      user_profiles(id, name, email)
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

  const { id } = await params
  const supabase = await createServerSupabaseClient()

  let adminAccess: boolean
  try {
    adminAccess = await isOrgAdmin(supabase, user.id, user.organization_id!)
  } catch {
    return error('Service unavailable', 503)
  }
  if (!adminAccess) return error('Admin access required', 403)

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

  const validRoles = ['applicant', 'verifier', 'approver', 'admin']
  if (!validRoles.includes(body.role)) {
    return error('Invalid role', 400)
  }

  // Verify the target user is in the same org
  const { data: targetUser } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('id', body.user_id)
    .single()

  if (!targetUser || targetUser.organization_id !== user.organization_id) {
    return error('User not found in your organization', 403)
  }

  // Upsert semantics: insert, on conflict do nothing
  const { data, error: dbError } = await supabase
    .from('user_project_roles')
    .upsert(
      { user_id: body.user_id, project_id: id, role: body.role },
      { onConflict: 'user_id,project_id,role', ignoreDuplicates: true }
    )
    .select('id, user_id, role')
    .maybeSingle()  // returns null on duplicate (no-op upsert)

  if (dbError) return error(dbError.message, 500)
  // data is null when duplicate (already assigned) - that's OK
  return success(data ?? { user_id: body.user_id, role: body.role, project_id: id }, 201)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  const { id } = await params
  const supabase = await createServerSupabaseClient()

  let adminAccess: boolean
  try {
    adminAccess = await isOrgAdmin(supabase, user.id, user.organization_id!)
  } catch {
    return error('Service unavailable', 503)
  }
  if (!adminAccess) return error('Admin access required', 403)

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

  const validRoles = ['applicant', 'verifier', 'approver', 'admin']
  if (!validRoles.includes(body.role as string)) {
    return error('Invalid role', 400)
  }

  const { error: dbError } = await supabase
    .from('user_project_roles')
    .delete()
    .eq('user_id', body.user_id)
    .eq('project_id', id)
    .eq('role', body.role)

  if (dbError) return error(dbError.message, 500)

  return success({ ok: true })
}

import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { success, error } from '@/lib/api/response'

async function checkAdminAccess(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, userId: string): Promise<boolean> {
  const { data: adminRoles } = await supabase
    .from('user_project_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')

  return Boolean(adminRoles && adminRoles.length > 0)
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const isAdmin = await checkAdminAccess(supabase, user.id)
  if (!isAdmin) return error('Admin access required', 403)

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

  const isAdmin = await checkAdminAccess(supabase, user.id)
  if (!isAdmin) return error('Admin access required', 403)

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

  // Upsert semantics: insert, on conflict do nothing
  const { data, error: dbError } = await supabase
    .from('user_project_roles')
    .upsert(
      { user_id: body.user_id, project_id: id, role: body.role },
      { onConflict: 'user_id,project_id,role', ignoreDuplicates: true }
    )
    .select('id, user_id, role')
    .single()

  if (dbError) return error(dbError.message, 500)

  return success(data, 201)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const isAdmin = await checkAdminAccess(supabase, user.id)
  if (!isAdmin) return error('Admin access required', 403)

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

  const { error: dbError } = await supabase
    .from('user_project_roles')
    .delete()
    .eq('user_id', body.user_id)
    .eq('project_id', id)
    .eq('role', body.role)

  if (dbError) return error(dbError.message, 500)

  return success({ ok: true })
}

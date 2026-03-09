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

  const { id } = await params
  const serviceClient = await createServiceRoleClient()

  const { data, error: dbError } = await serviceClient
    .from('project_companies')
    .select('id, name, role, trade, is_active, created_at')
    .eq('project_id', id)
    .eq('is_active', true)
    .order('role', { ascending: true })
    .order('name', { ascending: true })

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

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return error('Invalid JSON', 400)
  }

  if (!body.name || typeof body.name !== 'string') {
    return error('name is required', 400)
  }

  const role = typeof body.role === 'string' && ['main_contractor', 'subcontractor'].includes(body.role)
    ? body.role
    : 'subcontractor'

  const serviceClient = await createServiceRoleClient()
  const { data, error: dbError } = await serviceClient
    .from('project_companies')
    .insert({
      project_id: id,
      name: body.name.trim(),
      role,
      trade: typeof body.trade === 'string' ? body.trade.trim() || null : null,
    })
    .select('id, name, role, trade, is_active, created_at')
    .single()

  if (dbError) {
    if (dbError.code === '23505') return error('A company with this name already exists in the project', 409)
    return error(dbError.message, 500)
  }

  return success(data, 201)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)
  if (!isOrgAdmin(user)) return error('Admin access required', 403)

  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return error('Invalid JSON', 400)
  }

  if (!body.id || typeof body.id !== 'string') {
    return error('id is required', 400)
  }

  const updates: Record<string, unknown> = {}
  if (typeof body.name === 'string') updates.name = body.name.trim()
  if (typeof body.role === 'string' && ['main_contractor', 'subcontractor'].includes(body.role)) {
    updates.role = body.role
  }
  if (typeof body.trade === 'string') updates.trade = body.trade.trim() || null
  if (typeof body.is_active === 'boolean') updates.is_active = body.is_active

  const serviceClient = await createServiceRoleClient()
  const { data, error: dbError } = await serviceClient
    .from('project_companies')
    .update(updates)
    .eq('id', body.id)
    .eq('project_id', id)
    .select('id, name, role, trade, is_active, created_at')
    .single()

  if (dbError) return error(dbError.message, 500)
  if (!data) return error('Company not found', 404)

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

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return error('Invalid JSON', 400)
  }

  if (!body.id || typeof body.id !== 'string') {
    return error('id is required', 400)
  }

  const serviceClient = await createServiceRoleClient()

  // Check if workers reference this company
  const { count } = await serviceClient
    .from('workers')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', body.id)

  if (count && count > 0) {
    return error('Cannot delete company: workers are assigned to it', 409)
  }

  const { error: dbError } = await serviceClient
    .from('project_companies')
    .delete()
    .eq('id', body.id)
    .eq('project_id', id)

  if (dbError) return error(dbError.message, 500)

  return success({ ok: true })
}

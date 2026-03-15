import { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { isOrgAdmin } from '@/lib/auth/check-admin'
import { success, error } from '@/lib/api/response'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  const { id: workerId } = await params
  const projectId = request.nextUrl.searchParams.get('project_id')
  const supabase = await createServiceRoleClient()

  let query = supabase
    .from('worker_sic_records')
    .select('id, worker_id, project_id, sic_number, sic_issuer, issued_at, is_active, created_at')
    .eq('worker_id', workerId)
    .eq('organization_id', user.organization_id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error: dbError } = await query
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

  const { id: workerId } = await params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return error('Invalid JSON', 400)
  }

  if (!body.project_id || typeof body.project_id !== 'string') {
    return error('project_id is required', 400)
  }
  const supabase = await createServiceRoleClient()

  // Verify worker belongs to this org
  const { data: worker } = await supabase
    .from('workers')
    .select('id')
    .eq('id', workerId)
    .eq('organization_id', user.organization_id)
    .single()

  if (!worker) return error('Worker not found', 404)

  // Auto-generate SIC number if not provided
  let sicNumber = typeof body.sic_number === 'string' && body.sic_number.trim() ? body.sic_number.trim() : null
  if (!sicNumber) {
    const { data: generated, error: rpcError } = await supabase.rpc('generate_next_sic_number', { p_project_id: body.project_id })
    if (rpcError || !generated) return error('Failed to generate SIC number', 500)
    sicNumber = generated as string
  }

  const { data, error: dbError } = await supabase
    .from('worker_sic_records')
    .insert({
      worker_id: workerId,
      project_id: body.project_id,
      sic_number: sicNumber,
      sic_issuer: typeof body.sic_issuer === 'string' ? body.sic_issuer : null,
      issued_at: typeof body.issued_at === 'string' && body.issued_at ? body.issued_at : null,
      organization_id: user.organization_id,
    })
    .select('id, worker_id, project_id, sic_number, sic_issuer, issued_at, is_active, created_at')
    .single()

  if (dbError) {
    if (dbError.code === '23505') {
      return error('SIC record already exists for this worker and project', 409)
    }
    return error(dbError.message, 500)
  }

  return success(data, 201)
}

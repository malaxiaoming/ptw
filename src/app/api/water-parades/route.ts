import { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { success, error } from '@/lib/api/response'

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  const projectId = request.nextUrl.searchParams.get('project_id')
  if (!projectId) return error('project_id is required', 400)

  const supabase = await createServiceRoleClient()

  const { data, error: dbError } = await supabase
    .from('water_parades')
    .select(`
      id, notes, created_at,
      creator:user_profiles!created_by(id, name),
      water_parade_photos(id),
      water_parade_workers(id, worker_name)
    `)
    .eq('project_id', projectId)
    .eq('organization_id', user.organization_id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (dbError) return error(dbError.message, 500)

  // Flatten counts
  const entries = (data ?? []).map((d) => ({
    id: d.id,
    notes: d.notes,
    created_at: d.created_at,
    creator_name: ((d.creator as unknown) as { name: string } | null)?.name ?? 'Unknown',
    photo_count: (d.water_parade_photos as { id: string }[])?.length ?? 0,
    worker_count: (d.water_parade_workers as { id: string; worker_name: string }[])?.length ?? 0,
  }))

  return success(entries)
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return error('Invalid JSON', 400)
  }

  const projectId = body.project_id
  if (!projectId || typeof projectId !== 'string') {
    return error('project_id is required', 400)
  }

  const supabase = await createServiceRoleClient()

  // Create the water parade entry
  const { data: parade, error: insertError } = await supabase
    .from('water_parades')
    .insert({
      organization_id: user.organization_id,
      project_id: projectId,
      created_by: user.id,
      notes: typeof body.notes === 'string' ? body.notes : null,
    })
    .select('id')
    .single()

  if (insertError) return error(insertError.message, 500)

  // Insert workers
  const workerIds = Array.isArray(body.worker_ids) ? body.worker_ids : []
  const manualWorkers = Array.isArray(body.manual_workers) ? body.manual_workers : []

  const workerRows: { water_parade_id: string; worker_id?: string; worker_name: string }[] = []

  // Fetch registered worker names
  if (workerIds.length > 0) {
    const { data: registeredWorkers } = await supabase
      .from('workers')
      .select('id, name')
      .in('id', workerIds)

    for (const w of registeredWorkers ?? []) {
      workerRows.push({ water_parade_id: parade.id, worker_id: w.id, worker_name: w.name })
    }
  }

  // Add manual workers
  for (const name of manualWorkers) {
    if (typeof name === 'string' && name.trim()) {
      workerRows.push({ water_parade_id: parade.id, worker_name: name.trim() })
    }
  }

  if (workerRows.length > 0) {
    const { error: workerError } = await supabase
      .from('water_parade_workers')
      .insert(workerRows)

    if (workerError) return error(workerError.message, 500)
  }

  return success({ id: parade.id }, 201)
}

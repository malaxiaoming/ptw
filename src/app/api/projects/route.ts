import { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { isOrgAdmin } from '@/lib/auth/check-admin'
import { success, error } from '@/lib/api/response'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  const serviceClient = await createServiceRoleClient()

  // Admin sees all org projects; non-admin sees only projects they have roles on
  if (isOrgAdmin(user)) {
    const { data, error: dbError } = await serviceClient
      .from('projects')
      .select('id, name, description, reference_number, address, postal_code, status, created_at')
      .eq('organization_id', user.organization_id!)
      .order('name', { ascending: true })

    if (dbError) return error(dbError.message, 500)
    return success(data)
  }

  // Non-admin: return ALL projects user has roles on (active + disabled)
  const { data: roleRows, error: rolesError } = await serviceClient
    .from('user_project_roles')
    .select('project_id, is_active')
    .eq('user_id', user.id)

  if (rolesError) return error(rolesError.message, 500)

  if (!roleRows || roleRows.length === 0) {
    return success([])
  }

  // Build map: projectId -> true if ANY role is active
  const activeMap = new Map<string, boolean>()
  for (const r of roleRows as { project_id: string; is_active: boolean }[]) {
    if (activeMap.get(r.project_id) === true) continue
    activeMap.set(r.project_id, r.is_active)
  }

  const projectIds = [...activeMap.keys()]

  const { data, error: dbError } = await serviceClient
    .from('projects')
    .select('id, name, description, reference_number, address, postal_code, status, created_at')
    .in('id', projectIds)
    .order('name', { ascending: true })

  if (dbError) return error(dbError.message, 500)

  // Attach is_role_active flag to each project
  const projectsWithFlag = (data ?? []).map((p: { id: string }) => ({
    ...p,
    is_role_active: activeMap.get(p.id) ?? false,
  }))

  return success(projectsWithFlag)
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  if (!user.organization_id) {
    return error('User has no organization', 403)
  }

  if (!isOrgAdmin(user)) return error('Admin access required', 403)

  const serviceClient = await createServiceRoleClient()

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return error('Invalid JSON', 400)
  }

  if (!body.name || typeof body.name !== 'string') {
    return error('name is required', 400)
  }

  const { data, error: dbError } = await serviceClient
    .from('projects')
    .insert({
      organization_id: user.organization_id,
      name: body.name,
      description: typeof body.description === 'string' ? body.description : null,
      reference_number: typeof body.reference_number === 'string' ? body.reference_number : null,
      address: typeof body.address === 'string' ? body.address : null,
      postal_code: typeof body.postal_code === 'string' ? body.postal_code : null,
      status: 'active',
    })
    .select('id, name, description, reference_number, address, postal_code, status, created_at')
    .single()

  if (dbError) return error(dbError.message, 500)

  return success(data, 201)
}

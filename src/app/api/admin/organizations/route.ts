import { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requirePlatformAdmin } from '@/lib/auth/require-platform-admin'
import { success, error } from '@/lib/api/response'

export async function GET() {
  const guard = await requirePlatformAdmin()
  if (guard.errorResponse) return guard.errorResponse

  const serviceClient = await createServiceRoleClient()

  const { data: orgs, error: dbError } = await serviceClient
    .from('organizations')
    .select('id, name, created_at, user_profiles(count), projects(count)')
    .order('created_at', { ascending: false })

  if (dbError) return error(`Failed to fetch organizations: ${dbError.message}`, 500)

  const result = (orgs ?? []).map((org) => ({
    id: org.id,
    name: org.name,
    created_at: org.created_at,
    user_count: (org.user_profiles as unknown as { count: number }[])?.[0]?.count ?? 0,
    project_count: (org.projects as unknown as { count: number }[])?.[0]?.count ?? 0,
  }))

  return success(result)
}

export async function POST(request: NextRequest) {
  const guard = await requirePlatformAdmin()
  if (guard.errorResponse) return guard.errorResponse

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return error('Invalid JSON', 400)
  }

  if (!body.name || typeof body.name !== 'string') {
    return error('name is required', 400)
  }

  const serviceClient = await createServiceRoleClient()

  const { data: org, error: dbError } = await serviceClient
    .from('organizations')
    .insert({ name: body.name })
    .select('id, name, created_at')
    .single()

  if (dbError) return error(`Failed to create organization: ${dbError.message}`, 500)

  return success(org, 201)
}

import { NextRequest } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { getUserRolesForProject } from '@/lib/auth/get-user-roles'
import { error } from '@/lib/api/response'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data: permit } = await supabase
    .from('permits')
    .select('id, project_id, pdf_path, permit_number')
    .eq('id', id)
    .single()

  if (!permit) return error('Permit not found', 404)

  const roles = await getUserRolesForProject(user.id, permit.project_id)
  if (roles.length === 0) return error('Permit not found', 404)

  if (!permit.pdf_path) return error('PDF not yet generated', 404)

  const serviceClient = await createServiceRoleClient()
  const { data: urlData, error: urlError } = await serviceClient.storage
    .from('permit-attachments')
    .createSignedUrl(permit.pdf_path, 3600)

  if (urlError || !urlData?.signedUrl) {
    return error('Failed to generate download URL', 500)
  }

  return Response.redirect(urlData.signedUrl)
}

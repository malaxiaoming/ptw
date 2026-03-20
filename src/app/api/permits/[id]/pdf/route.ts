import { NextRequest } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { getUserRolesForProject } from '@/lib/auth/get-user-roles'
import { success, error } from '@/lib/api/response'
import { generateAndStorePermitPdf } from '@/lib/permits/pdf-generate'

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

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data: permit } = await supabase
    .from('permits')
    .select('id, project_id, status, permit_number')
    .eq('id', id)
    .single()

  if (!permit) return error('Permit not found', 404)

  // Must be active or closed
  if (!['active', 'closed'].includes(permit.status)) {
    return error('PDF can only be generated for active or closed permits', 400)
  }

  // Must have verifier/approver role or be org admin
  const roles = await getUserRolesForProject(user.id, permit.project_id)
  const canRegenerate = roles.includes('verifier') || roles.includes('approver') || user.is_admin
  if (!canRegenerate) {
    return error('Insufficient permissions to regenerate PDF', 403)
  }

  if (!user.organization_id) {
    return error('Organization not found', 400)
  }

  const pdfResult = await generateAndStorePermitPdf(id, user.organization_id, user.id)
  if (!pdfResult) {
    return error('Failed to generate PDF', 500)
  }

  // Return signed URL of the newly generated PDF
  const serviceClient = await createServiceRoleClient()
  const { data: urlData, error: urlError } = await serviceClient.storage
    .from('permit-attachments')
    .createSignedUrl(pdfResult.storagePath, 3600)

  if (urlError || !urlData?.signedUrl) {
    return error('PDF generated but failed to create download URL', 500)
  }

  return success({
    file_name: `${permit.permit_number}.pdf`,
    signed_url: urlData.signedUrl,
  })
}

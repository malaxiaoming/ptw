import { NextRequest } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { getUserRolesForProject } from '@/lib/auth/get-user-roles'
import { success, error } from '@/lib/api/response'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)
  if (!user.organization_id) return error('User has no organization', 403)

  const { id } = await params
  const supabase = await createServerSupabaseClient()

  // Verify permit exists and user has project access
  const { data: permit } = await supabase
    .from('permits')
    .select('id, project_id, applicant_id')
    .eq('id', id)
    .single()

  if (!permit) return error('Permit not found', 404)

  const roles = await getUserRolesForProject(user.id, permit.project_id)
  if (roles.length === 0) return error('Permit not found', 404)

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return error('No file provided', 400)

  // Validate file type and size
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  if (!allowedTypes.includes(file.type)) {
    return error('File type not allowed. Accepted: JPG, PNG, WebP, PDF', 400)
  }
  if (file.size > 10 * 1024 * 1024) {
    return error('File size exceeds 10MB limit', 400)
  }

  // Sanitize filename to prevent path traversal
  const safeName = file.name
    .replace(/.*[/\\]/, '')             // strip any directory prefix
    .replace(/[^a-zA-Z0-9._-]/g, '_')  // allow only safe characters

  // Upload to Supabase Storage using service role (private bucket)
  const filePath = `${user.organization_id}/${permit.project_id}/${id}/${Date.now()}-${safeName}`
  const serviceClient = await createServiceRoleClient()

  const { error: uploadError } = await serviceClient.storage
    .from('permit-attachments')
    .upload(filePath, file)

  if (uploadError) return error(uploadError.message, 500)

  // Save attachment record
  const { data, error: dbError } = await supabase
    .from('permit_attachments')
    .insert({
      permit_id: id,
      file_url: filePath,
      file_name: file.name,
      file_type: file.type,
      uploaded_by: user.id,
    })
    .select('id, permit_id, file_url, file_name, file_type, uploaded_by, created_at')
    .single()

  if (dbError) {
    // Clean up orphaned file from storage
    await serviceClient.storage.from('permit-attachments').remove([filePath])
    return error(dbError.message, 500)
  }

  return success(data, 201)
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  const { id } = await params
  const supabase = await createServerSupabaseClient()

  // Verify permit exists and user has project access
  const { data: permit } = await supabase
    .from('permits')
    .select('id, project_id')
    .eq('id', id)
    .single()

  if (!permit) return error('Permit not found', 404)

  const roles = await getUserRolesForProject(user.id, permit.project_id)
  if (roles.length === 0) return error('Permit not found', 404)

  const { data, error: dbError } = await supabase
    .from('permit_attachments')
    .select('id, permit_id, file_url, file_name, file_type, uploaded_by, created_at')
    .eq('permit_id', id)
    .order('created_at')

  if (dbError) return error(dbError.message, 500)

  // Generate signed URLs (1-hour expiry)
  const serviceClient = await createServiceRoleClient()
  const withUrls = await Promise.all(
    (data ?? []).map(async (att) => {
      const { data: urlData } = await serviceClient.storage
        .from('permit-attachments')
        .createSignedUrl(att.file_url, 3600)
      return { ...att, signed_url: urlData?.signedUrl ?? null }
    })
  )

  return success(withUrls)
}

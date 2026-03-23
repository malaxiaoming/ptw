import { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { success, error } from '@/lib/api/response'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)
  if (!user.organization_id) return error('User has no organization', 403)

  const { id } = await params
  const supabase = await createServiceRoleClient()

  // Verify water parade exists and belongs to user's org
  const { data: parade } = await supabase
    .from('water_parades')
    .select('id, project_id')
    .eq('id', id)
    .eq('organization_id', user.organization_id)
    .eq('is_active', true)
    .single()

  if (!parade) return error('Entry not found', 404)

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return error('No file provided', 400)

  // Validate file type and size
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return error('File type not allowed. Accepted: JPG, PNG, WebP', 400)
  }
  if (file.size > 10 * 1024 * 1024) {
    return error('File size exceeds 10MB limit', 400)
  }

  // Sanitize filename
  const safeName = file.name
    .replace(/.*[/\\]/, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')

  const filePath = `${user.organization_id}/${parade.project_id}/${id}/${Date.now()}-${safeName}`

  const { error: uploadError } = await supabase.storage
    .from('water-parade-photos')
    .upload(filePath, file)

  if (uploadError) return error(uploadError.message, 500)

  // Save record
  const { data, error: dbError } = await supabase
    .from('water_parade_photos')
    .insert({
      water_parade_id: id,
      file_path: filePath,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      uploaded_by: user.id,
    })
    .select('id, file_path, file_name, file_type, file_size, created_at')
    .single()

  if (dbError) {
    // Clean up orphaned file
    await supabase.storage.from('water-parade-photos').remove([filePath])
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
  const supabase = await createServiceRoleClient()

  // Verify water parade exists
  const { data: parade } = await supabase
    .from('water_parades')
    .select('id')
    .eq('id', id)
    .eq('organization_id', user.organization_id)
    .eq('is_active', true)
    .single()

  if (!parade) return error('Entry not found', 404)

  const { data, error: dbError } = await supabase
    .from('water_parade_photos')
    .select('id, file_path, file_name, file_type, file_size, created_at')
    .eq('water_parade_id', id)
    .order('created_at')

  if (dbError) return error(dbError.message, 500)

  // Generate signed URLs
  const withUrls = await Promise.all(
    (data ?? []).map(async (p) => {
      const { data: urlData } = await supabase.storage
        .from('water-parade-photos')
        .createSignedUrl(p.file_path, 3600)
      return { ...p, signed_url: urlData?.signedUrl ?? null }
    })
  )

  return success(withUrls)
}

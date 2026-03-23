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
  const supabase = await createServiceRoleClient()

  const { data, error: dbError } = await supabase
    .from('water_parades')
    .select(`
      id, notes, created_at, created_by,
      creator:user_profiles!created_by(id, name),
      water_parade_workers(id, worker_id, worker_name),
      water_parade_photos(id, file_path, file_name, file_type, file_size, created_at)
    `)
    .eq('id', id)
    .eq('organization_id', user.organization_id)
    .eq('is_active', true)
    .single()

  if (dbError || !data) return error('Entry not found', 404)

  // Generate signed URLs for photos
  const photos = await Promise.all(
    ((data.water_parade_photos as { id: string; file_path: string; file_name: string; file_type: string; file_size: number; created_at: string }[]) ?? []).map(async (p) => {
      const { data: urlData } = await supabase.storage
        .from('water-parade-photos')
        .createSignedUrl(p.file_path, 3600)
      return { ...p, signed_url: urlData?.signedUrl ?? null }
    })
  )

  return success({
    ...data,
    water_parade_photos: photos,
  })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  const { id } = await params
  const supabase = await createServiceRoleClient()

  // Verify entry exists and check permission
  const { data: existing } = await supabase
    .from('water_parades')
    .select('id, created_by')
    .eq('id', id)
    .eq('organization_id', user.organization_id)
    .eq('is_active', true)
    .single()

  if (!existing) return error('Entry not found', 404)
  if (existing.created_by !== user.id && !isOrgAdmin(user)) {
    return error('Only the creator or an admin can delete this entry', 403)
  }

  // Clean up storage files
  const { data: photos } = await supabase
    .from('water_parade_photos')
    .select('file_path')
    .eq('water_parade_id', id)

  if (photos && photos.length > 0) {
    await supabase.storage
      .from('water-parade-photos')
      .remove(photos.map((p) => p.file_path))
  }

  // Soft delete
  const { error: dbError } = await supabase
    .from('water_parades')
    .update({ is_active: false })
    .eq('id', id)

  if (dbError) return error(dbError.message, 500)

  return success({ message: 'Entry deleted' })
}

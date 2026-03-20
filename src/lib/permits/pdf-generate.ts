import { renderToBuffer } from '@react-pdf/renderer'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { PermitPdfDocument, type PermitPdfData } from './pdf-template'

interface PdfResult {
  buffer: Buffer
  storagePath: string
}

export async function generateAndStorePermitPdf(
  permitId: string,
  organizationId: string,
  userId?: string
): Promise<PdfResult | null> {
  const supabase = await createServiceRoleClient()

  try {
    // Fetch full permit data (same query shape as the detail API)
    const { data: permit, error: fetchError } = await supabase
      .from('permits')
      .select(`
        id, permit_number, status, project_id,
        work_location, work_description, gps_lat, gps_lng,
        scheduled_start, scheduled_end,
        checklist_data, personnel,
        submitted_at, verified_at, approved_at, activated_at, closed_at,
        created_at,
        permit_types(name, code, checklist_template),
        applicant:user_profiles!applicant_id(name),
        verifier:user_profiles!verifier_id(name),
        approver:user_profiles!approver_id(name),
        project:projects!project_id(name)
      `)
      .eq('id', permitId)
      .single()

    if (fetchError || !permit) return null

    // Render PDF to buffer
    const rendered = await renderToBuffer(
      PermitPdfDocument({ data: permit as unknown as PermitPdfData })
    )
    const buffer = Buffer.from(rendered)

    // Upload to Supabase Storage
    const fileName = `${permit.permit_number}.pdf`
    const storagePath = `${organizationId}/${permit.project_id}/${permitId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('permit-attachments')
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      throw new Error(uploadError.message)
    }

    // Save path on permit record
    const { error: updateError } = await supabase
      .from('permits')
      .update({ pdf_path: storagePath })
      .eq('id', permitId)

    if (updateError) {
      console.error('[generateAndStorePermitPdf] Failed to update pdf_path:', updateError.message)
    }

    // Log successful PDF generation
    if (userId) {
      await supabase.from('permit_activity_log').insert({
        permit_id: permitId,
        action: 'pdf_generated',
        performed_by: userId,
      })
    }

    return { buffer, storagePath }
  } catch (err) {
    // Log failed PDF generation
    if (userId) {
      await supabase.from('permit_activity_log').insert({
        permit_id: permitId,
        action: 'pdf_failed',
        performed_by: userId,
        comments: err instanceof Error ? err.message : 'Unknown error',
      })
    }
    throw err
  }
}

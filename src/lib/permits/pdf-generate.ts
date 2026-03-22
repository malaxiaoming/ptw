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
        rejection_reason, revocation_reason,
        submitted_at, verified_at, approved_at, activated_at, closed_at,
        created_at,
        applicant_signature, verifier_signature, approver_signature,
        permit_types(name, code, checklist_template),
        applicant:user_profiles!applicant_id(name),
        verifier:user_profiles!verifier_id(name),
        approver:user_profiles!approver_id(name),
        project:projects!project_id(name)
      `)
      .eq('id', permitId)
      .single()

    if (fetchError || !permit) return null

    // Resolve photo attachment UUIDs to signed URLs
    let photoUrls: Record<string, string> = {}
    const template = (permit as Record<string, unknown>).permit_types as { checklist_template?: { sections?: Array<{ fields: Array<{ id: string; type: string }> }> } } | null
    if (template?.checklist_template?.sections) {
      const checklistData = (permit.checklist_data ?? {}) as Record<string, unknown>
      const allUuids: string[] = []
      for (const section of template.checklist_template.sections) {
        for (const field of section.fields) {
          if (field.type === 'photo') {
            const val = checklistData[field.id]
            if (Array.isArray(val)) {
              allUuids.push(...(val as string[]))
            }
          }
        }
      }

      if (allUuids.length > 0) {
        const { data: attachments } = await supabase
          .from('permit_attachments')
          .select('id, file_url')
          .in('id', allUuids)

        if (attachments) {
          for (const att of attachments) {
            const { data: signed } = await supabase.storage
              .from('permit-attachments')
              .createSignedUrl(att.file_url, 3600)
            if (signed?.signedUrl) {
              photoUrls[att.id] = signed.signedUrl
            }
          }
        }
      }
    }

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

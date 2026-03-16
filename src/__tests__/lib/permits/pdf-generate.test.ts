import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: vi.fn(),
}))

vi.mock('@react-pdf/renderer', () => ({
  renderToBuffer: vi.fn(),
  Document: 'Document',
  Page: 'Page',
  View: 'View',
  Text: 'Text',
  Link: 'Link',
  Font: { register: vi.fn() },
  StyleSheet: { create: (s: Record<string, unknown>) => s },
}))

import { createServiceRoleClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { generateAndStorePermitPdf } from '@/lib/permits/pdf-generate'

const mockRenderToBuffer = vi.mocked(renderToBuffer)
const mockCreateServiceClient = vi.mocked(createServiceRoleClient)

describe('generateAndStorePermitPdf', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches permit, renders PDF, uploads to storage, and updates permit record', async () => {
    const pdfBuffer = Buffer.from('fake-pdf-content')
    mockRenderToBuffer.mockResolvedValue(pdfBuffer as never)

    const permitData = {
      id: 'permit-1',
      permit_number: 'PTW-2024-0001',
      status: 'active',
      project_id: 'project-1',
      work_location: 'Site A',
      work_description: 'Test work',
      created_at: '2024-01-01T00:00:00Z',
      permit_types: { name: 'Hot Work', code: 'HW', checklist_template: { sections: [], personnel: [] } },
      applicant: { name: 'John' },
      verifier: { name: 'Jane' },
      approver: { name: 'Boss' },
      project: { name: 'Test Project' },
    }

    const singleMock = vi.fn().mockResolvedValue({ data: permitData, error: null })
    const uploadMock = vi.fn().mockResolvedValue({ error: null })
    const updateEqMock = vi.fn().mockResolvedValue({ error: null })
    const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock })

    let fromCallCount = 0
    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn().mockImplementation(() => {
        fromCallCount++
        if (fromCallCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({ single: singleMock }),
            }),
          }
        }
        return { update: updateMock }
      }),
      storage: { from: vi.fn().mockReturnValue({ upload: uploadMock }) },
    } as never)

    const result = await generateAndStorePermitPdf('permit-1', 'org-1')

    expect(mockRenderToBuffer).toHaveBeenCalledOnce()
    expect(uploadMock).toHaveBeenCalledOnce()
    expect(result).toEqual(expect.objectContaining({
      buffer: expect.any(Buffer),
      storagePath: expect.stringContaining('PTW-2024-0001'),
    }))
  })

  it('returns null when permit is not found', async () => {
    const singleMock = vi.fn().mockResolvedValue({ data: null, error: null })
    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: singleMock }) }),
      }),
    } as never)

    const result = await generateAndStorePermitPdf('missing-id', 'org-1')
    expect(result).toBeNull()
  })

  it('throws when storage upload fails', async () => {
    const pdfBuffer = Buffer.from('fake-pdf')
    mockRenderToBuffer.mockResolvedValue(pdfBuffer as never)

    const singleMock = vi.fn().mockResolvedValue({
      data: {
        id: 'permit-1', permit_number: 'PTW-2024-0001', status: 'active',
        project_id: 'project-1', work_location: 'A', work_description: 'B',
        created_at: '2024-01-01T00:00:00Z',
      },
      error: null,
    })
    const uploadMock = vi.fn().mockResolvedValue({ error: { message: 'Storage full' } })

    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: singleMock }) }),
      }),
      storage: { from: vi.fn().mockReturnValue({ upload: uploadMock }) },
    } as never)

    await expect(generateAndStorePermitPdf('permit-1', 'org-1')).rejects.toThrow('Storage full')
  })
})

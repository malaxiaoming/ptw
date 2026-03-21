'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { compressImage } from '@/lib/utils/image-compression'
import { formatFileSize } from '@/lib/utils/format-file-size'
import { AttachmentPreview } from './attachment-preview'

interface Attachment {
  id: string
  file_name: string
  file_type: string
  file_size?: number | null
  signed_url?: string | null
  uploaded_by?: string
  created_at: string
}

interface FileUploadProps {
  permitId: string
  attachments: Attachment[]
  onUploadComplete: () => void
  disabled?: boolean
}

export function FileUpload({ permitId, attachments, onUploadComplete, disabled }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fetchedAttachments, setFetchedAttachments] = useState<Attachment[] | null>(null)
  const [loadingAttachments, setLoadingAttachments] = useState(true)
  const [previewAtt, setPreviewAtt] = useState<{ url: string; fileName: string; fileType: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const loadAttachments = useCallback(async () => {
    try {
      const res = await fetch(`/api/permits/${permitId}/attachments`)
      if (res.ok) {
        const json = await res.json()
        setFetchedAttachments(json.data ?? [])
      }
    } catch {
      // Fall back to prop attachments
    } finally {
      setLoadingAttachments(false)
    }
  }, [permitId])

  useEffect(() => {
    loadAttachments()
  }, [loadAttachments])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const rawFile = e.target.files?.[0]
    if (!rawFile) return

    setUploading(true)
    setError(null)

    try {
      // Compress images client-side before upload
      const file = await compressImage(rawFile)

      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/permits/${permitId}/attachments`, {
        method: 'POST',
        body: formData,
      })

      const result = await res.json()
      if (!res.ok) {
        setError(result.error ?? 'Upload failed')
      } else {
        await loadAttachments()
        onUploadComplete()
      }
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      {!disabled && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Upload Attachment
            <span className="text-gray-500 font-normal ml-1">(JPG, PNG, PDF — max 10MB, images auto-compressed)</span>
          </label>
          <input
            ref={inputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            onChange={handleUpload}
            disabled={uploading || disabled}
            className="text-sm"
            aria-label="Upload attachment"
          />
          {uploading && <p className="text-sm text-gray-500 mt-1">Uploading and compressing...</p>}
          {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
        </div>
      )}

      {loadingAttachments ? (
        <p className="text-sm text-gray-400 italic">Loading attachments...</p>
      ) : (fetchedAttachments ?? attachments).length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(fetchedAttachments ?? attachments).map((att) => {
            const isImage = att.file_type.startsWith('image/')
            return (
              <div key={att.id} className="flex gap-3 p-3 border border-gray-200 rounded-lg">
                {/* Thumbnail */}
                <button
                  type="button"
                  onClick={() => att.signed_url && setPreviewAtt({ url: att.signed_url, fileName: att.file_name, fileType: att.file_type })}
                  disabled={!att.signed_url}
                  className="w-16 h-16 flex-shrink-0 rounded-md overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center cursor-pointer disabled:cursor-default"
                >
                  {isImage && att.signed_url ? (
                    <img src={att.signed_url} alt={att.file_name} className="w-full h-full object-cover" />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-gray-400">
                      <path d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625Z" />
                      <path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z" />
                    </svg>
                  )}
                </button>
                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{att.file_name}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(att.created_at).toLocaleDateString()}
                    {formatFileSize(att.file_size) && ` \u00B7 ${formatFileSize(att.file_size)}`}
                  </p>
                  {att.signed_url && (
                    <button
                      type="button"
                      onClick={() => setPreviewAtt({ url: att.signed_url!, fileName: att.file_name, fileType: att.file_type })}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-sm text-gray-400 italic">No attachments yet.</p>
      )}

      {previewAtt && <AttachmentPreview {...previewAtt} onClose={() => setPreviewAtt(null)} />}
    </div>
  )
}

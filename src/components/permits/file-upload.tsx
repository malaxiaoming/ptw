'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { compressImage } from '@/lib/utils/image-compression'

interface Attachment {
  id: string
  file_name: string
  file_type: string
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
        <ul className="divide-y divide-gray-200 border border-gray-200 rounded-md">
          {(fetchedAttachments ?? attachments).map((att) => (
            <li key={att.id} className="py-3 px-4 flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-gray-900">{att.file_name}</p>
                <p className="text-xs text-gray-500">
                  {new Date(att.created_at).toLocaleDateString()}
                </p>
              </div>
              {att.signed_url && (
                <a
                  href={att.signed_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline ml-4 flex-shrink-0"
                >
                  Download
                </a>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-400 italic">No attachments yet.</p>
      )}
    </div>
  )
}

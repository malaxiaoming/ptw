'use client'

import { useState, useRef, useEffect } from 'react'
import { compressImage } from '@/lib/utils/image-compression'
import { formatFileSize } from '@/lib/utils/format-file-size'
import { AttachmentPreview } from './attachment-preview'
import type { ChecklistField } from '@/lib/permits/checklist-validation'

interface ChecklistPhotoFieldProps {
  field: ChecklistField
  value: unknown
  onChange: (value: unknown) => void
  permitId?: string
  disabled?: boolean
}

export function ChecklistPhotoField({ field, value, onChange, permitId, disabled }: ChecklistPhotoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrls, setPreviewUrls] = useState<Map<File, string>>(new Map())
  const [signedUrls, setSignedUrls] = useState<Map<string, string>>(new Map())
  const [previewAtt, setPreviewAtt] = useState<{ url: string; fileName: string; fileType: string } | null>(null)

  // Current value: either File[] (staged) or string[] (attachment IDs)
  const items: Array<File | string> = Array.isArray(value) ? value : []
  const atMax = field.max ? items.length >= field.max : false

  // Generate preview URLs for staged File objects
  useEffect(() => {
    const files = items.filter((item): item is File => item instanceof File)
    const newUrls = new Map<File, string>()
    for (const file of files) {
      const existing = previewUrls.get(file)
      if (existing) {
        newUrls.set(file, existing)
      } else {
        newUrls.set(file, URL.createObjectURL(file))
      }
    }
    // Revoke old URLs no longer in use
    for (const [file, url] of previewUrls) {
      if (!newUrls.has(file)) {
        URL.revokeObjectURL(url)
      }
    }
    setPreviewUrls(newUrls)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  // Fetch signed URLs for attachment IDs (edit mode)
  useEffect(() => {
    if (!permitId) return
    const ids = items.filter((item): item is string => typeof item === 'string')
    const missing = ids.filter((id) => !signedUrls.has(id))
    if (missing.length === 0) return

    fetch(`/api/permits/${permitId}/attachments`)
      .then((r) => r.json())
      .then((json) => {
        if (!json.data) return
        const newSigned = new Map(signedUrls)
        for (const att of json.data as Array<{ id: string; signed_url?: string | null }>) {
          if (att.signed_url) {
            newSigned.set(att.id, att.signed_url)
          }
        }
        setSignedUrls(newSigned)
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permitId, value])

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (inputRef.current) inputRef.current.value = ''

    setError(null)

    if (permitId) {
      // Immediate mode: compress and upload
      setUploading(true)
      try {
        const compressed = await compressImage(file)
        const formData = new FormData()
        formData.append('file', compressed)

        const res = await fetch(`/api/permits/${permitId}/attachments`, {
          method: 'POST',
          body: formData,
        })
        const result = await res.json()
        if (!res.ok) {
          setError(result.error ?? 'Upload failed')
          return
        }
        onChange([...items, result.data.id])
      } catch {
        setError('Upload failed. Please try again.')
      } finally {
        setUploading(false)
      }
    } else {
      // Staged mode: store File object
      onChange([...items, file])
    }
  }

  function handleRemove(index: number) {
    const removed = items[index]
    if (removed instanceof File) {
      const url = previewUrls.get(removed)
      if (url) URL.revokeObjectURL(url)
    }
    const next = items.filter((_, i) => i !== index)
    onChange(next.length > 0 ? next : [])
  }

  function getThumbnailSrc(item: File | string): string | undefined {
    if (item instanceof File) {
      return previewUrls.get(item)
    }
    return signedUrls.get(item)
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* Thumbnails */}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {items.map((item, i) => {
            const src = getThumbnailSrc(item)
            return (
              <div key={i} className="relative group w-20 h-20 rounded-md overflow-hidden border border-gray-200 bg-gray-50">
                <button
                  type="button"
                  onClick={() => {
                    if (src) {
                      const name = item instanceof File ? item.name : 'Photo'
                      const type = item instanceof File ? item.type : 'image/jpeg'
                      setPreviewAtt({ url: src, fileName: name, fileType: type })
                    }
                  }}
                  disabled={!src}
                  className="w-full h-full cursor-pointer disabled:cursor-default"
                >
                  {src ? (
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                      {item instanceof File ? item.name.slice(0, 8) : 'Loading...'}
                    </div>
                  )}
                </button>
                {item instanceof File && formatFileSize(item.size) && (
                  <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-center" style={{ fontSize: '10px', lineHeight: '16px' }}>
                    {formatFileSize(item.size)}
                  </span>
                )}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleRemove(i)}
                    className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 text-white rounded-full flex items-center justify-center text-xs leading-none hover:bg-black/80"
                    aria-label={`Remove photo ${i + 1}`}
                  >
                    &times;
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add Photo button */}
      {!disabled && !atMax && (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
            aria-label={`Upload photo for ${field.label}`}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M1 8a2 2 0 0 1 2-2h.93a2 2 0 0 0 1.664-.89l.812-1.22A2 2 0 0 1 8.07 3h3.86a2 2 0 0 1 1.664.89l.812 1.22A2 2 0 0 0 16.07 6H17a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8Zm13.5 3a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM10 14a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
            </svg>
            {uploading ? 'Uploading...' : 'Add Photo'}
          </button>
          {field.max && (
            <span className="text-xs text-gray-400 ml-2">
              {items.length}/{field.max}
            </span>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}

      {previewAtt && <AttachmentPreview {...previewAtt} onClose={() => setPreviewAtt(null)} />}
    </div>
  )
}

'use client'

import { useEffect } from 'react'

interface AttachmentPreviewProps {
  url: string
  fileName: string
  fileType: string
  onClose: () => void
}

export function AttachmentPreview({ url, fileName, fileType, onClose }: AttachmentPreviewProps) {
  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Lock body scroll
  useEffect(() => {
    document.body.classList.add('overflow-hidden')
    return () => document.body.classList.remove('overflow-hidden')
  }, [])

  const isImage = fileType.startsWith('image/')
  const isPdf = fileType === 'application/pdf'

  return (
    <div className="fixed inset-0 z-50 flex flex-col" role="dialog" aria-label={`Preview: ${fileName}`}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3 text-white">
        <p className="text-sm font-medium truncate max-w-[60%]">{fileName}</p>
        <div className="flex items-center gap-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 rounded-md transition-colors"
          >
            Download
          </a>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
            aria-label="Close preview"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-4 overflow-auto">
        {isImage && (
          <img
            src={url}
            alt={fileName}
            className="max-h-[85vh] max-w-full object-contain"
          />
        )}
        {isPdf && (
          <iframe
            src={url}
            title={fileName}
            className="w-full h-[85vh] max-w-4xl rounded bg-white"
          />
        )}
        {!isImage && !isPdf && (
          <div className="text-white text-center">
            <p className="mb-2">Preview not available for this file type.</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-300 hover:underline"
            >
              Download file
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

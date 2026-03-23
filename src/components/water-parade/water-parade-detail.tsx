'use client'

import { useState, useEffect } from 'react'
import { AttachmentPreview } from '@/components/permits/attachment-preview'
import { BilingualText } from '@/components/ui/bilingual'

interface Photo {
  id: string
  file_name: string
  file_type: string
  file_size: number
  signed_url: string | null
  created_at: string
}

interface Worker {
  id: string
  worker_id: string | null
  worker_name: string
}

interface WaterParadeEntry {
  id: string
  notes: string | null
  created_at: string
  created_by: string
  creator: { id: string; name: string } | null
  water_parade_photos: Photo[]
  water_parade_workers: Worker[]
}

interface WaterParadeDetailProps {
  entryId: string
  onClose: () => void
}

export function WaterParadeDetail({ entryId, onClose }: WaterParadeDetailProps) {
  const [entry, setEntry] = useState<WaterParadeEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [previewPhoto, setPreviewPhoto] = useState<Photo | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/water-parades/${entryId}`)
        const json = await res.json()
        if (res.ok) setEntry(json.data)
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [entryId])

  if (loading) {
    return <div className="text-sm text-gray-400 py-4">Loading...</div>
  }

  if (!entry) {
    return <div className="text-sm text-red-500 py-4">Failed to load entry</div>
  }

  const photos = entry.water_parade_photos ?? []
  const workers = entry.water_parade_workers ?? []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Water Parade &mdash; {new Date(entry.created_at).toLocaleDateString()}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            By {(entry.creator as { name: string } | null)?.name ?? 'Unknown'}
            {' at '}
            {new Date(entry.created_at).toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl leading-none"
        >
          &times;
        </button>
      </div>

      {/* Photos */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-2">
          <BilingualText en="Photos" /> ({photos.length})
        </h4>
        {photos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photos.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPreviewPhoto(p)}
                className="relative group cursor-pointer"
              >
                <img
                  src={p.signed_url ?? ''}
                  alt={p.file_name}
                  className="w-full h-32 object-cover rounded-md border border-gray-200"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-md transition-colors" />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No photos</p>
        )}
      </div>

      {/* Workers */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-2">
          <BilingualText en="Workers Present" /> ({workers.length})
        </h4>
        {workers.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {workers.map((w) => (
              <span key={w.id} className="px-2 py-1 bg-gray-100 rounded text-sm text-gray-700">
                {w.worker_name}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No workers recorded</p>
        )}
      </div>

      {/* Notes */}
      {entry.notes && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-2"><BilingualText en="Notes" /></h4>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{entry.notes}</p>
        </div>
      )}

      {/* Photo preview modal */}
      {previewPhoto && previewPhoto.signed_url && (
        <AttachmentPreview
          url={previewPhoto.signed_url}
          fileName={previewPhoto.file_name}
          fileType={previewPhoto.file_type}
          onClose={() => setPreviewPhoto(null)}
        />
      )}
    </div>
  )
}

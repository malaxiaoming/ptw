'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { BilingualText } from '@/components/ui/bilingual'
import { compressImage } from '@/lib/utils/image-compression'

interface Worker {
  id: string
  name: string
  company: string | null
}

interface WaterParadeFormProps {
  projectId: string
  onSubmit: (data: { project_id: string; worker_ids: string[]; manual_workers: string[]; notes: string }, files: File[]) => Promise<void>
  onCancel: () => void
}

export function WaterParadeForm({ projectId, onSubmit, onCancel }: WaterParadeFormProps) {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([])
  const [manualWorkers, setManualWorkers] = useState<string[]>([])
  const [manualName, setManualName] = useState('')
  const [notes, setNotes] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/workers?project_id=${projectId}`)
      .then((r) => r.json())
      .then((json) => setWorkers(json.data ?? []))
      .catch(() => {})
  }, [projectId])

  function toggleWorker(id: string) {
    setSelectedWorkerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function addManualWorker() {
    const name = manualName.trim()
    if (!name || manualWorkers.includes(name)) return
    setManualWorkers([...manualWorkers, name])
    setManualName('')
  }

  function removeManualWorker(index: number) {
    setManualWorkers(manualWorkers.filter((_, i) => i !== index))
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? [])
    if (selected.length === 0) return

    const compressed: File[] = []
    const urls: string[] = []

    for (const f of selected) {
      const c = await compressImage(f)
      compressed.push(c)
      urls.push(URL.createObjectURL(c))
    }

    setFiles((prev) => [...prev, ...compressed])
    setPreviews((prev) => [...prev, ...urls])
    e.target.value = ''
  }

  function removeFile(index: number) {
    URL.revokeObjectURL(previews[index])
    setFiles(files.filter((_, i) => i !== index))
    setPreviews(previews.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    if (files.length === 0) {
      setFormError('At least one photo is required')
      return
    }
    if (selectedWorkerIds.length === 0 && manualWorkers.length === 0) {
      setFormError('At least one worker must be selected')
      return
    }

    setSubmitting(true)
    try {
      await onSubmit(
        { project_id: projectId, worker_ids: selectedWorkerIds, manual_workers: manualWorkers, notes },
        files
      )
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save entry')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {formError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {formError}
        </div>
      )}

      {/* Photos */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3"><BilingualText en="Photos" /></h4>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        {previews.length > 0 && (
          <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-3">
            {previews.map((url, i) => (
              <div key={i} className="relative group">
                <img src={url} alt={`Photo ${i + 1}`} className="w-full h-24 object-cover rounded-md border border-gray-200" />
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Workers */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">
          <BilingualText en="Workers Present" /> ({selectedWorkerIds.length + manualWorkers.length})
        </h4>

        {workers.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-2"><BilingualText en="Select from worker registry:" /></p>
            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md divide-y divide-gray-100">
              {workers.map((w) => {
                const selected = selectedWorkerIds.includes(w.id)
                return (
                  <label
                    key={w.id}
                    className={`flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 ${
                      selected ? 'bg-blue-50' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleWorker(w.id)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-medium">{w.name}</span>
                    {w.company && <span className="text-gray-400">({w.company})</span>}
                  </label>
                )
              })}
            </div>
          </div>
        )}

        {/* Manual entry */}
        <div className="flex gap-2">
          <Input
            placeholder="Add unregistered worker name"
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addManualWorker()
              }
            }}
          />
          <Button type="button" variant="outline" size="sm" onClick={addManualWorker}>
            Add
          </Button>
        </div>

        {manualWorkers.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {manualWorkers.map((name, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm"
              >
                {name}
                <button
                  type="button"
                  onClick={() => removeManualWorker(i)}
                  className="text-gray-400 hover:text-red-500"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <Textarea
        label={<BilingualText en="Notes (optional)" />}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
        placeholder="Any observations..."
      />

      {/* Actions */}
      <div className="flex gap-3">
        <Button type="submit" loading={submitting}>
          Create Entry
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

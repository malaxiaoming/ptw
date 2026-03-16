'use client'

import { useState, useEffect } from 'react'
import { type PersonnelRequirement, type PersonnelEntry } from '@/lib/permits/checklist-validation'
import { BilingualText } from '@/components/ui/bilingual'

interface Worker {
  id: string
  name: string
  company: string | null
  trade: string | null
}

interface PersonnelPickerProps {
  requirements: PersonnelRequirement[]
  personnel: PersonnelEntry[]
  onChange: (personnel: PersonnelEntry[]) => void
  disabled?: boolean
  companyId?: string | null
  projectId?: string
}

export function PersonnelPicker({ requirements, personnel, onChange, disabled, companyId, projectId }: PersonnelPickerProps) {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [manualNames, setManualNames] = useState<Record<string, string>>({})

  useEffect(() => {
    const params = new URLSearchParams()
    if (projectId) params.set('project_id', projectId)
    if (companyId) params.set('company_id', companyId)
    const url = `/api/workers${params.toString() ? '?' + params.toString() : ''}`
    fetch(url)
      .then((r) => r.json())
      .then((res) => setWorkers(res.data ?? []))
      .catch(() => {/* non-fatal, manual entry still works */})
  }, [companyId, projectId])

  // --- Shared helpers ---

  function addPerson(role: string) {
    onChange([...personnel, { role, name: '' }])
  }

  function removePerson(index: number) {
    onChange(personnel.filter((_, i) => i !== index))
  }

  function updatePerson(index: number, updates: Partial<PersonnelEntry>) {
    const updated = [...personnel]
    updated[index] = { ...updated[index], ...updates }
    onChange(updated)
  }

  function selectFromRegistry(index: number, workerId: string) {
    if (!workerId) {
      updatePerson(index, { worker_id: undefined, name: '' })
      return
    }
    const worker = workers.find((w) => w.id === workerId)
    if (!worker) return
    updatePerson(index, { worker_id: worker.id, name: worker.name })
  }

  // --- Worker role: checkbox multi-select ---

  function toggleWorker(role: string, worker: Worker) {
    const exists = personnel.find((p) => p.role === role && p.worker_id === worker.id)
    if (exists) {
      onChange(personnel.filter((p) => !(p.role === role && p.worker_id === worker.id)))
    } else {
      onChange([...personnel, { role, worker_id: worker.id, name: worker.name }])
    }
  }

  function addManualWorker(role: string) {
    const name = (manualNames[role] ?? '').trim()
    if (!name) return
    // Prevent duplicate manual names for same role
    if (personnel.find((p) => p.role === role && !p.worker_id && p.name === name)) return
    onChange([...personnel, { role, name }])
    setManualNames({ ...manualNames, [role]: '' })
  }

  function removeWorkerEntry(role: string, index: number) {
    // index is within the role-filtered list; find the actual index
    const roleEntries = personnel
      .map((p, i) => ({ ...p, _index: i }))
      .filter((p) => p.role === role)
    const actualIndex = roleEntries[index]?._index
    if (actualIndex !== undefined) {
      onChange(personnel.filter((_, i) => i !== actualIndex))
    }
  }

  function renderWorkerRole(req: PersonnelRequirement) {
    const rolePersonnel = personnel.filter((p) => p.role === req.role)
    const manualEntries = rolePersonnel.filter((p) => !p.worker_id)

    return (
      <div key={req.role} className="border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium mb-3">
          <BilingualText en={req.label} zh={req.label_zh} />
          <span className="text-sm text-gray-500 ml-2">
            ({rolePersonnel.length}{req.max < 99 ? ` / max ${req.max}` : ''})
          </span>
        </h4>

        {/* Registry checkbox list */}
        {workers.length > 0 && !disabled && (
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-2">
              <BilingualText en="Select from worker registry:" />
            </p>
            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md divide-y divide-gray-100">
              {workers.map((w) => {
                const selected = personnel.some((p) => p.role === req.role && p.worker_id === w.id)
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
                      onChange={() => toggleWorker(req.role, w)}
                      disabled={!selected && rolePersonnel.length >= req.max}
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
        {!disabled && rolePersonnel.length < req.max && (
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              placeholder="Add unregistered worker name"
              value={manualNames[req.role] ?? ''}
              onChange={(e) => setManualNames({ ...manualNames, [req.role]: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addManualWorker(req.role)
                }
              }}
              className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm"
            />
            <button
              type="button"
              onClick={() => addManualWorker(req.role)}
              className="px-3 py-1.5 text-sm font-medium border border-gray-300 rounded hover:bg-gray-50"
            >
              Add
            </button>
          </div>
        )}

        {/* Manual entries list (registry workers show as checked above) */}
        {manualEntries.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {manualEntries.map((entry, i) => {
              const roleIndex = rolePersonnel.filter((p) => !p.worker_id).indexOf(entry)
              const actualRoleIndex = rolePersonnel.indexOf(entry)
              return (
                <span
                  key={`manual-${roleIndex}`}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm"
                >
                  {entry.name}
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => removeWorkerEntry(req.role, actualRoleIndex)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      &times;
                    </button>
                  )}
                </span>
              )
            })}
          </div>
        )}

        {rolePersonnel.length === 0 && (
          <p className="text-sm text-gray-400 italic">No {req.label.toLowerCase()} added yet.</p>
        )}
      </div>
    )
  }

  // --- Specialized roles: existing dropdown-per-row UI ---

  function renderSpecializedRole(req: PersonnelRequirement) {
    const rolePersonnel = personnel
      .map((p, i) => ({ ...p, _index: i }))
      .filter((p) => p.role === req.role)

    return (
      <div key={req.role} className="border border-gray-200 rounded-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-medium">
            <BilingualText en={req.label} zh={req.label_zh} />
            <span className="text-sm text-gray-500 ml-2">
              (min: {req.min}{req.max < 99 ? `, max: ${req.max}` : ''})
            </span>
          </h4>
          {!disabled && rolePersonnel.length < req.max && (
            <button
              type="button"
              onClick={() => addPerson(req.role)}
              className="text-sm text-blue-600 hover:underline"
            >
              + Add {req.label}
            </button>
          )}
        </div>
        {rolePersonnel.length === 0 && (
          <p className="text-sm text-gray-400 italic">No {req.label.toLowerCase()} added yet.</p>
        )}
        {rolePersonnel.map((person) => (
          <div key={person._index} className="flex gap-2 mb-2 items-start">
            <div className="flex-1 space-y-1">
              <select
                value={person.worker_id ?? ''}
                onChange={(e) => selectFromRegistry(person._index, e.target.value)}
                disabled={disabled}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                aria-label="Select from worker registry"
              >
                <option value="">-- Select from registry or enter manually --</option>
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}{w.company ? ` (${w.company})` : ''}
                  </option>
                ))}
              </select>
              {req.fields.map((field) => (
                <input
                  key={field}
                  type="text"
                  placeholder={field.replace(/_/g, ' ')}
                  value={String((person as Record<string, unknown>)[field] ?? '')}
                  onChange={(e) => updatePerson(person._index, { [field]: e.target.value })}
                  disabled={disabled}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  aria-label={field.replace(/_/g, ' ')}
                />
              ))}
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={() => removePerson(person._index)}
                className="text-red-500 text-sm px-2 py-1.5 hover:text-red-700"
                aria-label="Remove person"
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {requirements.map((req) =>
        req.role === 'worker' || req.role === 'workers'
          ? renderWorkerRole(req)
          : renderSpecializedRole(req)
      )}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { type PersonnelRequirement, type PersonnelEntry } from '@/lib/permits/checklist-validation'

interface Worker {
  id: string
  name: string
  company: string | null
  trade: string | null
  cert_number: string | null
  cert_expiry: string | null
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
      updatePerson(index, { worker_id: undefined, name: '', cert_number: '' })
      return
    }
    const worker = workers.find((w) => w.id === workerId)
    if (!worker) return
    updatePerson(index, {
      worker_id: worker.id,
      name: worker.name,
      cert_number: worker.cert_number ?? '',
    })
  }

  return (
    <div className="space-y-6">
      {requirements.map((req) => {
        const rolePersonnel = personnel
          .map((p, i) => ({ ...p, _index: i }))
          .filter((p) => p.role === req.role)

        return (
          <div key={req.role} className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium">
                {req.label}
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
      })}
    </div>
  )
}

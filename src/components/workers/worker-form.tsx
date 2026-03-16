'use client'

import { useState, useEffect } from 'react'

interface WorkerFormData {
  name: string
  phone: string
  company: string
  trade: string
  project_id: string
  company_id: string
  nric_fin_type: string
  nric_fin_full: string
  consent_given: boolean
  sic_number: string
}

interface Project {
  id: string
  name: string
}

interface ProjectCompany {
  id: string
  name: string
  role: string
  trade: string | null
}

export type { WorkerFormData }

interface WorkerFormProps {
  initialData?: Partial<WorkerFormData>
  onSubmit: (data: WorkerFormData) => Promise<void>
  onCancel: () => void
  submitLabel?: string
  projectId?: string
}

export function WorkerForm({ initialData, onSubmit, onCancel, submitLabel = 'Save', projectId }: WorkerFormProps) {
  const [form, setForm] = useState<WorkerFormData>({
    name: initialData?.name ?? '',
    phone: initialData?.phone ?? '',
    company: initialData?.company ?? '',
    trade: initialData?.trade ?? '',
    project_id: projectId ?? initialData?.project_id ?? '',
    company_id: initialData?.company_id ?? '',
    nric_fin_type: initialData?.nric_fin_type ?? '',
    nric_fin_full: initialData?.nric_fin_full ?? '',
    consent_given: initialData?.consent_given ?? false,
    sic_number: initialData?.sic_number ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nricError, setNricError] = useState<string | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [companies, setCompanies] = useState<ProjectCompany[]>([])
  const [sicPreview, setSicPreview] = useState<string | null>(null)

  useEffect(() => {
    if (projectId) return // No need to fetch projects when projectId is provided
    fetch('/api/projects')
      .then((r) => r.json())
      .then((json) => setProjects(json.data ?? []))
      .catch(() => {})
  }, [projectId])

  useEffect(() => {
    if (!form.project_id) {
      setCompanies([])
      setSicPreview(null)
      return
    }
    fetch(`/api/projects/${form.project_id}/companies`)
      .then((r) => r.json())
      .then((json) => setCompanies(json.data ?? []))
      .catch(() => setCompanies([]))
    // Fetch SIC preview from project settings
    fetch(`/api/projects/${form.project_id}`)
      .then((r) => r.json())
      .then((json) => {
        const prefix = json.data?.sic_number_prefix ?? 'SIC-'
        const next = json.data?.sic_number_next ?? 1
        setSicPreview(`${prefix}${String(next).padStart(4, '0')}`)
      })
      .catch(() => setSicPreview(null))
  }, [form.project_id])

  function validateNric(): string | null {
    if (!form.nric_fin_type || !form.nric_fin_full) return null
    const value = form.nric_fin_full
    if (form.nric_fin_type === 'nric') {
      if (!/^[ST]\d{7}[A-Z]$/i.test(value)) {
        return 'NRIC must be 1 letter (S/T) + 7 digits + 1 letter (e.g. S1234567A)'
      }
    } else if (form.nric_fin_type === 'fin') {
      if (!/^[FGM]\d{7}[A-Z]$/i.test(value)) {
        return 'FIN must be 1 letter (F/G/M) + 7 digits + 1 letter (e.g. G1234567A)'
      }
    } else if (form.nric_fin_type === 'work_permit') {
      if (value.length < 4) {
        return 'Work permit number must be at least 4 characters'
      }
    }
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required'); return }
    const nricValidation = validateNric()
    if (nricValidation) { setNricError(nricValidation); return }
    setNricError(null)
    setLoading(true)
    setError(null)
    try {
      await onSubmit(form)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  function handleChange(field: keyof WorkerFormData, value: string) {
    // Auto-uppercase NRIC/FIN input
    if (field === 'nric_fin_full' && (form.nric_fin_type === 'nric' || form.nric_fin_type === 'fin')) {
      value = value.toUpperCase()
    }
    // Clear NRIC error when user edits the field
    if (field === 'nric_fin_full' || field === 'nric_fin_type') {
      setNricError(null)
    }
    setForm((prev) => {
      const next = { ...prev, [field]: value }
      // Reset company_id when project changes
      if (field === 'project_id') {
        next.company_id = ''
        next.company = ''
        next.trade = ''
      }
      // Update company text and trade when company_id selected
      if (field === 'company_id') {
        const selected = companies.find((c) => c.id === value)
        if (selected) {
          next.company = selected.name
          next.trade = selected.trade ?? ''
        } else {
          next.trade = ''
        }
      }
      return next
    })
  }

  const inputClass = 'mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div>
        <label htmlFor="worker-name" className="block text-sm font-medium text-gray-700">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          id="worker-name"
          type="text"
          value={form.name}
          onChange={(e) => handleChange('name', e.target.value)}
          className={inputClass}
          required
        />
      </div>
      {!projectId && (
        <div>
          <label htmlFor="worker-project" className="block text-sm font-medium text-gray-700">Project</label>
          <select
            id="worker-project"
            value={form.project_id}
            onChange={(e) => handleChange('project_id', e.target.value)}
            className={inputClass}
          >
            <option value="">Select project...</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label htmlFor="worker-company" className="block text-sm font-medium text-gray-700">Company</label>
        {form.project_id && companies.length > 0 ? (
          <select
            id="worker-company"
            value={form.company_id}
            onChange={(e) => handleChange('company_id', e.target.value)}
            className={inputClass}
          >
            <option value="">Select company...</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.role === 'main_contractor' ? 'MC' : 'SC'})
              </option>
            ))}
          </select>
        ) : (
          <input
            id="worker-company"
            type="text"
            value={form.company}
            onChange={(e) => handleChange('company', e.target.value)}
            className={inputClass}
            placeholder={form.project_id ? 'No companies registered for this project' : 'Select a project first, or type company name'}
          />
        )}
      </div>
      {/* Trade is auto-populated from the selected company — no need to display */}
      <div>
        <label htmlFor="worker-phone" className="block text-sm font-medium text-gray-700">Phone</label>
        <input
          id="worker-phone"
          type="tel"
          value={form.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          className={inputClass}
        />
      </div>
      <div className="border-t border-gray-200 pt-4 mt-4">
        <p className="text-sm font-medium text-gray-700 mb-2">NRIC / FIN / Work Permit</p>
        <p className="text-xs text-gray-500 mb-3">Encrypted and stored securely. Only last 4 digits shown in daily operations.</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="worker-nric-type" className="block text-sm font-medium text-gray-700">ID Type</label>
            <select
              id="worker-nric-type"
              value={form.nric_fin_type}
              onChange={(e) => handleChange('nric_fin_type', e.target.value)}
              className={inputClass}
            >
              <option value="">Not provided</option>
              <option value="nric">NRIC</option>
              <option value="fin">FIN</option>
              <option value="work_permit">Work Permit</option>
            </select>
          </div>
          <div>
            <label htmlFor="worker-nric-number" className="block text-sm font-medium text-gray-700">ID Number</label>
            <input
              id="worker-nric-number"
              type="text"
              value={form.nric_fin_full}
              onChange={(e) => handleChange('nric_fin_full', e.target.value)}
              className={`${inputClass}${nricError ? ' border-red-500 focus:ring-red-500' : ''}`}
              placeholder={form.nric_fin_type === 'nric' || form.nric_fin_type === 'fin' ? 'e.g. S1234567A' : 'ID number'}
              disabled={!form.nric_fin_type}
            />
            {nricError && <p className="mt-1 text-xs text-red-600">{nricError}</p>}
            {!nricError && form.nric_fin_type === 'nric' && (
              <p className="mt-1 text-xs text-gray-500">Format: 1 letter (S/T) + 7 digits + 1 letter, e.g. S1234567A</p>
            )}
            {!nricError && form.nric_fin_type === 'fin' && (
              <p className="mt-1 text-xs text-gray-500">Format: 1 letter (F/G/M) + 7 digits + 1 letter, e.g. G1234567A</p>
            )}
            {!nricError && form.nric_fin_type === 'work_permit' && (
              <p className="mt-1 text-xs text-gray-500">Minimum 4 characters</p>
            )}
          </div>
        </div>
        {form.nric_fin_type && form.nric_fin_full && (
          <div className="mt-3">
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={form.consent_given}
                onChange={(e) => setForm((prev) => ({ ...prev, consent_given: e.target.checked }))}
                className="mt-0.5"
              />
              <span className="text-xs text-gray-600">
                I consent to the collection and encrypted storage of my identification data for workplace safety management under MOM WSH regulations.
              </span>
            </label>
          </div>
        )}
      </div>
      {form.project_id && (
        <div className="border-t border-gray-200 pt-4 mt-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Safety Induction Course (SIC)</p>
          <div>
            <label htmlFor="worker-sic" className="block text-sm font-medium text-gray-700">SIC Number</label>
            <input
              id="worker-sic"
              type="text"
              value={form.sic_number}
              onChange={(e) => handleChange('sic_number', e.target.value)}
              className={inputClass}
              placeholder={sicPreview ? `e.g. ${sicPreview}` : 'Auto-generated if blank'}
            />
            {!form.sic_number && sicPreview && (
              <p className="mt-1 text-xs text-gray-500">Next auto-generated number: <span className="font-medium text-gray-700">{sicPreview}</span></p>
            )}
            {form.sic_number && (
              <p className="mt-1 text-xs text-gray-500">Using manual override. Clear to auto-generate.</p>
            )}
          </div>
        </div>
      )}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

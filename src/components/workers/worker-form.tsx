'use client'

import { useState, useEffect } from 'react'

interface WorkerFormData {
  name: string
  phone: string
  company: string
  trade: string
  cert_number: string
  cert_expiry: string
  project_id: string
  company_id: string
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
    cert_number: initialData?.cert_number ?? '',
    cert_expiry: initialData?.cert_expiry ?? '',
    project_id: projectId ?? initialData?.project_id ?? '',
    company_id: initialData?.company_id ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [companies, setCompanies] = useState<ProjectCompany[]>([])

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
      return
    }
    fetch(`/api/projects/${form.project_id}/companies`)
      .then((r) => r.json())
      .then((json) => setCompanies(json.data ?? []))
      .catch(() => setCompanies([]))
  }, [form.project_id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required'); return }
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

  const selectedCompany = companies.find((c) => c.id === form.company_id)

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
      <div>
        <label htmlFor="worker-trade" className="block text-sm font-medium text-gray-700">Trade</label>
        {form.company_id && selectedCompany ? (
          <p id="worker-trade" className="mt-1 px-3 py-2 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-md">
            {selectedCompany.trade || 'Not set on company'}
          </p>
        ) : (
          <p id="worker-trade" className="mt-1 px-3 py-2 text-sm text-gray-400 bg-gray-50 border border-gray-200 rounded-md">
            Select a company first
          </p>
        )}
      </div>
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
      <div>
        <label htmlFor="worker-cert" className="block text-sm font-medium text-gray-700">Cert Number</label>
        <input
          id="worker-cert"
          type="text"
          value={form.cert_number}
          onChange={(e) => handleChange('cert_number', e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="worker-cert-expiry" className="block text-sm font-medium text-gray-700">Cert Expiry</label>
        <input
          id="worker-cert-expiry"
          type="date"
          value={form.cert_expiry}
          onChange={(e) => handleChange('cert_expiry', e.target.value)}
          className={inputClass}
        />
      </div>
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

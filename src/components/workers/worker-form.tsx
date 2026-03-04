'use client'

import { useState } from 'react'

interface WorkerFormData {
  name: string
  phone: string
  company: string
  trade: string
  cert_number: string
  cert_expiry: string
}

interface WorkerFormProps {
  initialData?: Partial<WorkerFormData>
  onSubmit: (data: WorkerFormData) => Promise<void>
  onCancel: () => void
  submitLabel?: string
}

export function WorkerForm({ initialData, onSubmit, onCancel, submitLabel = 'Save' }: WorkerFormProps) {
  const [form, setForm] = useState<WorkerFormData>({
    name: initialData?.name ?? '',
    phone: initialData?.phone ?? '',
    company: initialData?.company ?? '',
    trade: initialData?.trade ?? '',
    cert_number: initialData?.cert_number ?? '',
    cert_expiry: initialData?.cert_expiry ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    setForm((prev) => ({ ...prev, [field]: value }))
  }

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
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>
      <div>
        <label htmlFor="worker-company" className="block text-sm font-medium text-gray-700">Company</label>
        <input
          id="worker-company"
          type="text"
          value={form.company}
          onChange={(e) => handleChange('company', e.target.value)}
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label htmlFor="worker-trade" className="block text-sm font-medium text-gray-700">Trade</label>
        <input
          id="worker-trade"
          type="text"
          value={form.trade}
          onChange={(e) => handleChange('trade', e.target.value)}
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label htmlFor="worker-phone" className="block text-sm font-medium text-gray-700">Phone</label>
        <input
          id="worker-phone"
          type="tel"
          value={form.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label htmlFor="worker-cert" className="block text-sm font-medium text-gray-700">Cert Number</label>
        <input
          id="worker-cert"
          type="text"
          value={form.cert_number}
          onChange={(e) => handleChange('cert_number', e.target.value)}
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label htmlFor="worker-cert-expiry" className="block text-sm font-medium text-gray-700">Cert Expiry</label>
        <input
          id="worker-cert-expiry"
          type="date"
          value={form.cert_expiry}
          onChange={(e) => handleChange('cert_expiry', e.target.value)}
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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

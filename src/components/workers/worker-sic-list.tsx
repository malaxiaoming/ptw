'use client'

import { useState, useEffect } from 'react'

interface SicRecord {
  id: string
  worker_id: string
  project_id: string
  sic_number: string
  sic_issuer: string | null
  issued_at: string | null
  is_active: boolean
  created_at: string
}

interface Project {
  id: string
  name: string
}

interface WorkerSicListProps {
  workerId: string
  isAdmin: boolean
  projects?: Project[]
}

const inputClass = 'mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

export function WorkerSicList({ workerId, isAdmin, projects = [] }: WorkerSicListProps) {
  const [records, setRecords] = useState<SicRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ project_id: '', sic_number: '', sic_issuer: '', issued_at: '' })

  useEffect(() => {
    fetchRecords()
  }, [workerId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchRecords() {
    setLoading(true)
    try {
      const res = await fetch(`/api/workers/${workerId}/sic`)
      const json = await res.json()
      setRecords(json.data ?? [])
    } catch {
      setRecords([])
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.project_id) {
      setError('Project is required')
      return
    }

    try {
      const url = editingId
        ? `/api/workers/${workerId}/sic/${editingId}`
        : `/api/workers/${workerId}/sic`

      const res = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const json = await res.json()
        setError(json.error || 'Failed to save SIC record')
        return
      }

      setShowForm(false)
      setEditingId(null)
      setForm({ project_id: '', sic_number: '', sic_issuer: '', issued_at: '' })
      fetchRecords()
    } catch {
      setError('Failed to save SIC record')
    }
  }

  async function handleDeactivate(sicId: string) {
    if (!confirm('Deactivate this SIC record?')) return
    try {
      await fetch(`/api/workers/${workerId}/sic/${sicId}`, { method: 'DELETE' })
      fetchRecords()
    } catch {
      // ignore
    }
  }

  function startEdit(record: SicRecord) {
    setForm({
      project_id: record.project_id,
      sic_number: record.sic_number,
      sic_issuer: record.sic_issuer ?? '',
      issued_at: record.issued_at ?? '',
    })
    setEditingId(record.id)
    setShowForm(true)
  }

  function projectName(projectId: string): string {
    return projects.find((p) => p.id === projectId)?.name ?? projectId
  }

  if (loading) return <p className="text-sm text-gray-500 py-2">Loading SIC records...</p>

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Safety Induction Course (SIC) Records</h3>
        {isAdmin && !showForm && (
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setForm({ project_id: '', sic_number: '', sic_issuer: '', issued_at: '' }) }}
            className="text-sm text-blue-600 hover:underline"
          >
            + Add SIC
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-md p-4 space-y-3">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700">Project</label>
            <select value={form.project_id} onChange={(e) => setForm((f) => ({ ...f, project_id: e.target.value }))} className={inputClass} disabled={!!editingId}>
              <option value="">Select project...</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">SIC Number</label>
            <input type="text" value={form.sic_number} onChange={(e) => setForm((f) => ({ ...f, sic_number: e.target.value }))} className={inputClass} placeholder="Auto-generated if blank" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Issuer (Main Contractor)</label>
            <input type="text" value={form.sic_issuer} onChange={(e) => setForm((f) => ({ ...f, sic_issuer: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Issued Date</label>
            <input type="date" value={form.issued_at} onChange={(e) => setForm((f) => ({ ...f, issued_at: e.target.value }))} className={inputClass} />
          </div>
          <div className="flex gap-3">
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">
              {editingId ? 'Update' : 'Add'} SIC
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setError(null) }} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      )}

      {records.length === 0 ? (
        <p className="text-sm text-gray-500 py-2">No SIC records found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Project</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">SIC No.</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Issuer</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Issued</th>
                {isAdmin && <th className="px-3 py-2 text-right font-medium text-gray-500">Actions</th>}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {records.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2 text-gray-900">{projectName(r.project_id)}</td>
                    <td className="px-3 py-2 text-gray-600">{r.sic_number}</td>
                    <td className="px-3 py-2 text-gray-600">{r.sic_issuer ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-600">{r.issued_at ?? '—'}</td>
                    {isAdmin && (
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <button onClick={() => startEdit(r)} className="text-blue-600 hover:underline mr-3">Edit</button>
                        <button onClick={() => handleDeactivate(r.id)} className="text-red-500 hover:underline">Deactivate</button>
                      </td>
                    )}
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

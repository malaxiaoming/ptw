'use client'

import { useState, useEffect, useCallback } from 'react'
import { WorkerForm } from '@/components/workers/worker-form'
import { WorkerList } from '@/components/workers/worker-list'

interface Worker {
  id: string
  name: string
  company: string | null
  trade: string | null
  phone: string | null
  cert_number: string | null
  cert_expiry: string | null
}

export default function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null)

  const fetchWorkers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const url = search ? `/api/workers?search=${encodeURIComponent(search)}` : '/api/workers'
      const res = await fetch(url)
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Failed to load workers'); return }
      setWorkers(json.data ?? [])
    } catch {
      setError('Failed to load workers')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { fetchWorkers() }, [fetchWorkers])

  async function handleCreate(data: Omit<Worker, 'id'>) {
    const res = await fetch('/api/workers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error ?? 'Failed to create worker')
    setShowForm(false)
    await fetchWorkers()
  }

  async function handleEdit(data: Omit<Worker, 'id'>) {
    if (!editingWorker) return
    const res = await fetch(`/api/workers/${editingWorker.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error ?? 'Failed to update worker')
    setEditingWorker(null)
    await fetchWorkers()
  }

  async function handleDeactivate(id: string) {
    const res = await fetch(`/api/workers/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setError(json.error ?? 'Failed to deactivate worker')
      return
    }
    await fetchWorkers()
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Worker Registry</h1>
        <button
          onClick={() => { setShowForm(true); setEditingWorker(null) }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
        >
          Add Worker
        </button>
      </div>

      {(showForm || editingWorker) && (
        <div className="mb-6 p-6 border border-gray-200 rounded-lg bg-white">
          <h2 className="text-lg font-medium mb-4">{editingWorker ? 'Edit Worker' : 'New Worker'}</h2>
          <WorkerForm
            initialData={editingWorker ? {
              name: editingWorker.name,
              phone: editingWorker.phone ?? undefined,
              company: editingWorker.company ?? undefined,
              trade: editingWorker.trade ?? undefined,
              cert_number: editingWorker.cert_number ?? undefined,
              cert_expiry: editingWorker.cert_expiry ?? undefined,
            } : undefined}
            onSubmit={editingWorker ? handleEdit : handleCreate}
            onCancel={() => { setShowForm(false); setEditingWorker(null) }}
            submitLabel={editingWorker ? 'Update' : 'Add Worker'}
          />
        </div>
      )}

      <div className="mb-4">
        <input
          type="search"
          placeholder="Search by name, cert number, or company..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading workers...</p>
      ) : (
        <WorkerList
          workers={workers}
          onEdit={(w) => { setEditingWorker(w); setShowForm(false) }}
          onDeactivate={handleDeactivate}
        />
      )}
    </div>
  )
}

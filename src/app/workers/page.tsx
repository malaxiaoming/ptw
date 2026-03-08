'use client'

import { useState, useEffect, useCallback } from 'react'
import { WorkerForm, type WorkerFormData } from '@/components/workers/worker-form'
import { WorkerList } from '@/components/workers/worker-list'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { TableSkeleton } from '@/components/ui/skeleton'

interface Worker {
  id: string
  name: string
  company: string | null
  trade: string | null
  phone: string | null
  cert_number: string | null
  cert_expiry: string | null
  project_id: string | null
  company_id: string | null
}

export default function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetch('/api/me')
      .then((r) => r.json())
      .then((json) => setIsAdmin(json.data?.is_admin === true))
      .catch(() => {})
  }, [])

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

  async function handleCreate(data: WorkerFormData) {
    const res = await fetch('/api/workers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error ?? 'Failed to create worker')
    setShowForm(false)
    toast('Worker added successfully.', 'success')
    await fetchWorkers()
  }

  async function handleEdit(data: WorkerFormData) {
    if (!editingWorker) return
    const res = await fetch(`/api/workers/${editingWorker.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error ?? 'Failed to update worker')
    setEditingWorker(null)
    toast('Worker updated.', 'success')
    await fetchWorkers()
  }

  async function handleDeactivate(id: string) {
    const res = await fetch(`/api/workers/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      toast(json.error ?? 'Failed to deactivate worker', 'error')
      return
    }
    toast('Worker deactivated.', 'success')
    await fetchWorkers()
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Worker Registry</h1>
        {isAdmin && (
          <Button onClick={() => { setShowForm(true); setEditingWorker(null) }}>
            Add Worker
          </Button>
        )}
      </div>

      {isAdmin && (showForm || editingWorker) && (
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
              project_id: editingWorker.project_id ?? undefined,
              company_id: editingWorker.company_id ?? undefined,
            } : undefined}
            onSubmit={editingWorker ? handleEdit : handleCreate}
            onCancel={() => { setShowForm(false); setEditingWorker(null) }}
            submitLabel={editingWorker ? 'Update' : 'Add Worker'}
          />
        </div>
      )}

      <div className="mb-4">
        <Input
          type="search"
          placeholder="Search by name, cert number, or company..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {loading ? (
        <TableSkeleton rows={4} />
      ) : (
        <WorkerList
          workers={workers}
          onEdit={(w) => { setEditingWorker(w); setShowForm(false) }}
          onDeactivate={handleDeactivate}
          isAdmin={isAdmin}
        />
      )}
    </div>
  )
}

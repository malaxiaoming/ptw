'use client'

import { useState, useEffect, useCallback, use } from 'react'
import Link from 'next/link'
import ProjectSubNav from '@/components/projects/project-sub-nav'
import { WorkerForm, type WorkerFormData } from '@/components/workers/worker-form'
import { WorkerList } from '@/components/workers/worker-list'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { TableSkeleton } from '@/components/ui/skeleton'

interface Project {
  id: string
  name: string
}

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

export default function ProjectWorkersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const [project, setProject] = useState<Project | null>(null)
  const [workers, setWorkers] = useState<Worker[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    async function loadProject() {
      try {
        const [projectRes, meRes] = await Promise.all([
          fetch(`/api/projects/${id}`),
          fetch('/api/me'),
        ])
        const projectJson = await projectRes.json()
        const meJson = await meRes.json()
        if (!projectRes.ok) {
          setFetchError(projectJson.error ?? 'Failed to load project')
          return
        }
        setProject(projectJson.data)
        setIsAdmin(meJson.data?.is_admin === true)
      } catch {
        setFetchError('Failed to load project')
      }
    }
    loadProject()
  }, [id])

  const fetchWorkers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ project_id: id })
      if (search) params.set('search', search)
      const res = await fetch(`/api/workers?${params}`)
      const json = await res.json()
      if (!res.ok) { setFetchError(json.error ?? 'Failed to load workers'); return }
      setWorkers(json.data ?? [])
    } catch {
      setFetchError('Failed to load workers')
    } finally {
      setLoading(false)
    }
  }, [id, search])

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

  async function handleDeactivate(workerId: string) {
    const res = await fetch(`/api/workers/${workerId}`, { method: 'DELETE' })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      toast(json.error ?? 'Failed to deactivate worker', 'error')
      return
    }
    toast('Worker deactivated.', 'success')
    await fetchWorkers()
  }

  if (fetchError) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{fetchError}</p>
        <Link href="/projects" className="text-sm text-blue-600 hover:underline mt-2 block">
          Back to Projects
        </Link>
      </div>
    )
  }

  if (!project) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/projects" className="text-sm text-gray-500 hover:text-gray-700">
          &larr; Projects
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">{project.name}</h1>
      </div>

      <ProjectSubNav projectId={id} projectName={project.name} isAdmin={isAdmin} />

      <div className="max-w-5xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Worker Registry</h2>
          {isAdmin && (
            <Button onClick={() => { setShowForm(true); setEditingWorker(null) }}>
              Add Worker
            </Button>
          )}
        </div>

        {isAdmin && (showForm || editingWorker) && (
          <div className="mb-6 p-6 border border-gray-200 rounded-lg bg-white">
            <h3 className="text-lg font-medium mb-4">{editingWorker ? 'Edit Worker' : 'New Worker'}</h3>
            <WorkerForm
              projectId={id}
              initialData={editingWorker ? {
                name: editingWorker.name,
                phone: editingWorker.phone ?? undefined,
                company: editingWorker.company ?? undefined,
                trade: editingWorker.trade ?? undefined,
                cert_number: editingWorker.cert_number ?? undefined,
                cert_expiry: editingWorker.cert_expiry ?? undefined,
                project_id: id,
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
    </div>
  )
}

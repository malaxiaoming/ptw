'use client'

import { useState, useEffect, useCallback, use } from 'react'
import Link from 'next/link'
import ProjectSubNav from '@/components/projects/project-sub-nav'
import { WaterParadeForm } from '@/components/water-parade/water-parade-form'
import { WaterParadeDetail } from '@/components/water-parade/water-parade-detail'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { TableSkeleton } from '@/components/ui/skeleton'
import { BilingualText } from '@/components/ui/bilingual'

interface Project {
  id: string
  name: string
}

interface WaterParadeEntry {
  id: string
  notes: string | null
  created_at: string
  creator_name: string
  photo_count: number
  worker_count: number
}

export default function ProjectWaterParadePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const [project, setProject] = useState<Project | null>(null)
  const [entries, setEntries] = useState<WaterParadeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
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
        setCurrentUserId(meJson.data?.id ?? null)
      } catch {
        setFetchError('Failed to load project')
      }
    }
    loadProject()
  }, [id])

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/water-parades?project_id=${id}`)
      const json = await res.json()
      if (!res.ok) {
        setFetchError(json.error ?? 'Failed to load entries')
        return
      }
      setEntries(json.data ?? [])
    } catch {
      setFetchError('Failed to load entries')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  async function handleCreate(
    data: { project_id: string; worker_ids: string[]; manual_workers: string[]; notes: string },
    files: File[]
  ) {
    // Create entry
    const res = await fetch('/api/water-parades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error ?? 'Failed to create entry')

    const paradeId = json.data.id

    // Upload photos
    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file)
      const uploadRes = await fetch(`/api/water-parades/${paradeId}/photos`, {
        method: 'POST',
        body: formData,
      })
      if (!uploadRes.ok) {
        const uploadJson = await uploadRes.json().catch(() => ({}))
        throw new Error(uploadJson.error ?? 'Failed to upload photo')
      }
    }

    setShowForm(false)
    toast('Water parade entry created.', 'success')
    await fetchEntries()
  }

  async function handleDelete(entryId: string) {
    const res = await fetch(`/api/water-parades/${entryId}`, { method: 'DELETE' })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      toast(json.error ?? 'Failed to delete entry', 'error')
      return
    }
    toast('Entry deleted.', 'success')
    setSelectedEntryId(null)
    await fetchEntries()
  }

  // Filter by date range
  const filteredEntries = entries.filter((e) => {
    const date = e.created_at.split('T')[0]
    if (dateFrom && date < dateFrom) return false
    if (dateTo && date > dateTo) return false
    return true
  })

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
          <h2 className="text-lg font-semibold text-gray-900"><BilingualText en="Water Parade" /></h2>
          <Button onClick={() => { setShowForm(true); setSelectedEntryId(null) }}>
            <BilingualText en="New Entry" />
          </Button>
        </div>

        {showForm && !selectedEntryId && (
          <div className="mb-6 p-6 border border-gray-200 rounded-lg bg-white">
            <h3 className="text-lg font-medium mb-4"><BilingualText en="New Water Parade Entry" /></h3>
            <WaterParadeForm
              projectId={id}
              onSubmit={handleCreate}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        {selectedEntryId && (
          <div className="mb-6 p-6 border border-gray-200 rounded-lg bg-white">
            <WaterParadeDetail
              entryId={selectedEntryId}
              onClose={() => setSelectedEntryId(null)}
            />
            <div className="mt-4 flex gap-2">
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDelete(selectedEntryId)}
              >
                Delete
              </Button>
            </div>
          </div>
        )}

        {/* Date filter */}
        <div className="flex gap-4 mb-4">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            placeholder="From"
            className="max-w-[180px]"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            placeholder="To"
            className="max-w-[180px]"
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo('') }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          )}
        </div>

        {loading ? (
          <TableSkeleton rows={4} />
        ) : filteredEntries.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            {entries.length === 0
              ? <BilingualText en="No water parade entries yet. Create one to get started." />
              : <BilingualText en="No entries match the selected date range." />}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-2 font-medium"><BilingualText en="Date / Time" /></th>
                  <th className="pb-2 font-medium"><BilingualText en="Created By" /></th>
                  <th className="pb-2 font-medium"><BilingualText en="Photos" /></th>
                  <th className="pb-2 font-medium"><BilingualText en="Workers" /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEntries.map((e) => (
                  <tr
                    key={e.id}
                    onClick={() => { setSelectedEntryId(e.id); setShowForm(false) }}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    <td className="py-3 font-medium text-gray-900">
                      {new Date(e.created_at).toLocaleDateString()}{' '}
                      <span className="text-gray-400 font-normal">
                        {new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="py-3 text-gray-600">{e.creator_name}</td>
                    <td className="py-3 text-gray-600">{e.photo_count}</td>
                    <td className="py-3 text-gray-600">{e.worker_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

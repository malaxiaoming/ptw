'use client'

import { useState, useEffect, useCallback, use } from 'react'
import Link from 'next/link'
import ProjectSubNav from '@/components/projects/project-sub-nav'
import { ToolboxMeetingForm, type ToolboxMeetingFormData } from '@/components/toolbox/toolbox-meeting-form'
import { ToolboxMeetingDetail } from '@/components/toolbox/toolbox-meeting-detail'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { TableSkeleton } from '@/components/ui/skeleton'

interface Project {
  id: string
  name: string
}

interface ToolboxMeeting {
  id: string
  meeting_date: string
  meeting_time: string | null
  location: string | null
  checklist: Record<string, boolean>
  attendance: { worker_id?: string; name: string }[]
  notes: string | null
  signed_off: boolean
  signed_off_at: string | null
  conductor: { id: string; name: string } | null
  created_at: string
}

export default function ProjectToolboxPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const [project, setProject] = useState<Project | null>(null)
  const [meetings, setMeetings] = useState<ToolboxMeeting[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedMeeting, setSelectedMeeting] = useState<ToolboxMeeting | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
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
      } catch {
        setFetchError('Failed to load project')
      }
    }
    loadProject()
  }, [id])

  const fetchMeetings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/toolbox-meetings?project_id=${id}`)
      const json = await res.json()
      if (!res.ok) {
        setFetchError(json.error ?? 'Failed to load meetings')
        return
      }
      setMeetings(json.data ?? [])
    } catch {
      setFetchError('Failed to load meetings')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchMeetings()
  }, [fetchMeetings])

  async function handleCreate(data: ToolboxMeetingFormData) {
    const res = await fetch('/api/toolbox-meetings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error ?? 'Failed to create meeting')
    setShowForm(false)
    toast('Toolbox meeting created.', 'success')
    await fetchMeetings()
  }

  async function handleDelete(meetingId: string) {
    const res = await fetch(`/api/toolbox-meetings/${meetingId}`, { method: 'DELETE' })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      toast(json.error ?? 'Failed to delete meeting', 'error')
      return
    }
    toast('Meeting deleted.', 'success')
    setSelectedMeeting(null)
    await fetchMeetings()
  }

  // Filter meetings by date range
  const filteredMeetings = meetings.filter((m) => {
    if (dateFrom && m.meeting_date < dateFrom) return false
    if (dateTo && m.meeting_date > dateTo) return false
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
          <h2 className="text-lg font-semibold text-gray-900">Toolbox Meetings</h2>
          <Button onClick={() => { setShowForm(true); setSelectedMeeting(null) }}>
            New Meeting
          </Button>
        </div>

        {showForm && !selectedMeeting && (
          <div className="mb-6 p-6 border border-gray-200 rounded-lg bg-white">
            <h3 className="text-lg font-medium mb-4">New Toolbox Meeting</h3>
            <ToolboxMeetingForm
              projectId={id}
              onSubmit={handleCreate}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        {selectedMeeting && (
          <div className="mb-6 p-6 border border-gray-200 rounded-lg bg-white">
            <ToolboxMeetingDetail
              meeting={selectedMeeting}
              onClose={() => setSelectedMeeting(null)}
            />
            <div className="mt-4 flex gap-2">
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDelete(selectedMeeting.id)}
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
        ) : filteredMeetings.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            {meetings.length === 0
              ? 'No toolbox meetings yet. Create one to get started.'
              : 'No meetings match the selected date range.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Location</th>
                  <th className="pb-2 font-medium">Conducted By</th>
                  <th className="pb-2 font-medium">Attendance</th>
                  <th className="pb-2 font-medium">Sign-off</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredMeetings.map((m) => (
                  <tr
                    key={m.id}
                    onClick={() => { setSelectedMeeting(m); setShowForm(false) }}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    <td className="py-3 font-medium text-gray-900">{m.meeting_date}</td>
                    <td className="py-3 text-gray-600">{m.location ?? '\u2014'}</td>
                    <td className="py-3 text-gray-600">{m.conductor?.name ?? 'Unknown'}</td>
                    <td className="py-3 text-gray-600">{m.attendance?.length ?? 0}</td>
                    <td className="py-3">
                      {m.signed_off ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Signed off
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          Pending
                        </span>
                      )}
                    </td>
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

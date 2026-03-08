'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChecklistForm } from '@/components/permits/checklist-form'
import { PersonnelPicker } from '@/components/permits/personnel-picker'
import type { ChecklistTemplate, PersonnelEntry } from '@/lib/permits/checklist-validation'
import { createClient } from '@/lib/supabase/client'
import { defaultScheduledStart, defaultScheduledEnd, toDatetimeLocal, datetimeLocalToISO } from '@/lib/utils/date-defaults'

interface Permit {
  id: string
  permit_number: string
  status: string
  applicant_id: string
  work_location: string
  work_description: string
  gps_lat?: number | null
  gps_lng?: number | null
  scheduled_start?: string | null
  scheduled_end?: string | null
  checklist_data?: Record<string, unknown> | null
  personnel?: PersonnelEntry[] | null
  permit_types?: { name: string; code: string; checklist_template: ChecklistTemplate } | null
}

export default function EditPermitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [permit, setPermit] = useState<Permit | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Form state
  const [workLocation, setWorkLocation] = useState('')
  const [workDescription, setWorkDescription] = useState('')
  const [scheduledStart, setScheduledStart] = useState('')
  const [scheduledEnd, setScheduledEnd] = useState('')
  const [checklistData, setChecklistData] = useState<Record<string, unknown>>({})
  const [personnel, setPersonnel] = useState<PersonnelEntry[]>([])

  const loadPermit = useCallback(async () => {
    try {
      const supabase = createClient()
      const [res, { data: { user } }] = await Promise.all([
        fetch(`/api/permits/${id}`),
        supabase.auth.getUser(),
      ])
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed to load permit')
        return
      }
      const data: Permit = json.data
      setPermit(data)
      setCurrentUserId(user?.id ?? null)

      // Initialise form state from current permit values
      setWorkLocation(data.work_location ?? '')
      setWorkDescription(data.work_description ?? '')
      setScheduledStart(
        data.scheduled_start
          ? toDatetimeLocal(new Date(data.scheduled_start))
          : defaultScheduledStart()
      )
      setScheduledEnd(
        data.scheduled_end
          ? toDatetimeLocal(new Date(data.scheduled_end))
          : defaultScheduledEnd()
      )
      setChecklistData(data.checklist_data ?? {})
      setPersonnel(data.personnel ?? [])
    } catch {
      setError('Failed to load permit')
    }
  }, [id])

  useEffect(() => {
    setLoading(true)
    loadPermit().finally(() => setLoading(false))
  }, [loadPermit])

  async function handleSave() {
    if (!workLocation.trim() || !workDescription.trim()) {
      setSaveError('Work location and description are required')
      return
    }

    setSaving(true)
    setSaveError(null)

    try {
      const body: Record<string, unknown> = {
        work_location: workLocation,
        work_description: workDescription,
        checklist_data: checklistData,
        personnel,
      }
      if (scheduledStart) body.scheduled_start = datetimeLocalToISO(scheduledStart)
      if (scheduledEnd) body.scheduled_end = datetimeLocalToISO(scheduledEnd)

      const res = await fetch(`/api/permits/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const json = await res.json()
      if (!res.ok) {
        setSaveError(json.error ?? 'Failed to save changes')
        return
      }

      router.push(`/permits/${id}`)
    } catch {
      setSaveError('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Permit</h1>
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  if (error || !permit) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Permit</h1>
        <p className="text-red-600">{error ?? 'Permit not found'}</p>
        <Link href="/permits" className="text-sm text-blue-600 hover:underline">
          &larr; Back to Permits
        </Link>
      </div>
    )
  }

  if (permit.status !== 'draft') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Permit</h1>
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            Only draft permits can be edited. This permit is in <strong>{permit.status}</strong> status.
          </p>
        </div>
        <Link href={`/permits/${id}`} className="text-sm text-blue-600 hover:underline">
          &larr; Back to Permit
        </Link>
      </div>
    )
  }

  if (currentUserId !== permit.applicant_id) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Permit</h1>
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">
            You are not authorized to edit this permit.
          </p>
        </div>
        <Link href={`/permits/${id}`} className="text-sm text-blue-600 hover:underline">
          &larr; Back to Permit
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href={`/permits/${id}`} className="text-sm text-gray-500 hover:text-gray-700">
          &larr; Back to Permit
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Edit {permit.permit_number}</h1>
      </div>

      {saveError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{saveError}</p>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
        {/* Work Details */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Work Details</h2>

          <div>
            <label htmlFor="work-location" className="block text-sm font-medium text-gray-700 mb-1">
              Work Location <span className="text-red-500">*</span>
            </label>
            <input
              id="work-location"
              type="text"
              value={workLocation}
              onChange={(e) => setWorkLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="work-description" className="block text-sm font-medium text-gray-700 mb-1">
              Work Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="work-description"
              value={workDescription}
              onChange={(e) => setWorkDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="scheduled-start" className="block text-sm font-medium text-gray-700 mb-1">
                Scheduled Start
              </label>
              <input
                id="scheduled-start"
                type="datetime-local"
                value={scheduledStart}
                onChange={(e) => setScheduledStart(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="scheduled-end" className="block text-sm font-medium text-gray-700 mb-1">
                Scheduled End
              </label>
              <input
                id="scheduled-end"
                type="datetime-local"
                value={scheduledEnd}
                onChange={(e) => setScheduledEnd(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Checklist */}
        {permit.permit_types?.checklist_template?.sections?.length ? (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Checklist</h2>
            <ChecklistForm
              template={permit.permit_types.checklist_template}
              data={checklistData}
              onChange={setChecklistData}
              permitId={id}
            />
          </div>
        ) : null}

        {/* Personnel */}
        {permit.permit_types?.checklist_template?.personnel?.length ? (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Personnel</h2>
            <PersonnelPicker
              requirements={permit.permit_types.checklist_template.personnel}
              personnel={personnel}
              onChange={setPersonnel}
            />
          </div>
        ) : null}
      </div>

      <div className="flex justify-between">
        <Link
          href={`/permits/${id}`}
          className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </Link>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}

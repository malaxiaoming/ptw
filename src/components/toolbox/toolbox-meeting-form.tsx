'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { TOOLBOX_CHECKLIST_ITEMS } from '@/lib/toolbox/checklist-items'
import { BilingualText } from '@/components/ui/bilingual'

interface Worker {
  id: string
  name: string
  company: string | null
}

interface AttendanceEntry {
  worker_id?: string
  name: string
}

export interface ToolboxMeetingFormData {
  project_id: string
  meeting_date: string
  meeting_time: string
  location: string
  checklist: Record<string, boolean>
  attendance: AttendanceEntry[]
  notes: string
  signed_off: boolean
}

interface ToolboxMeetingFormProps {
  projectId: string
  initialData?: Partial<ToolboxMeetingFormData>
  onSubmit: (data: ToolboxMeetingFormData) => Promise<void>
  onCancel: () => void
  submitLabel?: string
}

export function ToolboxMeetingForm({
  projectId,
  initialData,
  onSubmit,
  onCancel,
  submitLabel = 'Create Meeting',
}: ToolboxMeetingFormProps) {
  const today = new Date().toISOString().split('T')[0]
  const [meetingDate, setMeetingDate] = useState(initialData?.meeting_date ?? today)
  const [meetingTime, setMeetingTime] = useState(initialData?.meeting_time ?? '')
  const [location, setLocation] = useState(initialData?.location ?? '')
  const [checklist, setChecklist] = useState<Record<string, boolean>>(
    initialData?.checklist ?? Object.fromEntries(TOOLBOX_CHECKLIST_ITEMS.map((i) => [i.key, false]))
  )
  const [attendance, setAttendance] = useState<AttendanceEntry[]>(initialData?.attendance ?? [])
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [signedOff, setSignedOff] = useState(initialData?.signed_off ?? false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Worker registry for multi-select
  const [workers, setWorkers] = useState<Worker[]>([])
  const [manualName, setManualName] = useState('')

  useEffect(() => {
    fetch(`/api/workers?project_id=${projectId}`)
      .then((r) => r.json())
      .then((json) => setWorkers(json.data ?? []))
      .catch(() => {})
  }, [projectId])

  const allChecked = TOOLBOX_CHECKLIST_ITEMS.every((i) => checklist[i.key])

  function toggleCheckAll() {
    const newVal = !allChecked
    setChecklist(Object.fromEntries(TOOLBOX_CHECKLIST_ITEMS.map((i) => [i.key, newVal])))
  }

  function toggleWorker(worker: Worker) {
    const exists = attendance.find((a) => a.worker_id === worker.id)
    if (exists) {
      setAttendance(attendance.filter((a) => a.worker_id !== worker.id))
    } else {
      setAttendance([...attendance, { worker_id: worker.id, name: worker.name }])
    }
  }

  function addManualAttendee() {
    const name = manualName.trim()
    if (!name) return
    if (attendance.find((a) => !a.worker_id && a.name === name)) return
    setAttendance([...attendance, { name }])
    setManualName('')
  }

  function removeAttendee(index: number) {
    setAttendance(attendance.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setSubmitting(true)
    try {
      await onSubmit({
        project_id: projectId,
        meeting_date: meetingDate,
        meeting_time: meetingTime,
        location,
        checklist,
        attendance,
        notes,
        signed_off: signedOff,
      })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save meeting')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {formError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {formError}
        </div>
      )}

      {/* Meeting Details */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3"><BilingualText en="Meeting Details" /></h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label={<BilingualText en="Date" />}
            type="date"
            value={meetingDate}
            onChange={(e) => setMeetingDate(e.target.value)}
            required
          />
          <Input
            label={<BilingualText en="Time" />}
            type="time"
            value={meetingTime}
            onChange={(e) => setMeetingTime(e.target.value)}
          />
          <Input
            label={<BilingualText en="Location / Zone" />}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Block A Level 3"
          />
        </div>
      </div>

      {/* Safety Checklist */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-900"><BilingualText en="Safety Checklist" /></h4>
          <button
            type="button"
            onClick={toggleCheckAll}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            {allChecked ? <BilingualText en="Uncheck All" /> : <BilingualText en="Check All" />}
          </button>
        </div>
        <div className="space-y-2">
          {TOOLBOX_CHECKLIST_ITEMS.map((item) => (
            <label key={item.key} className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={checklist[item.key] ?? false}
                onChange={(e) => setChecklist({ ...checklist, [item.key]: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <BilingualText en={item.label} zh={item.label_zh} />
            </label>
          ))}
        </div>
      </div>

      {/* Attendance */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">
          <BilingualText en="Attendance" /> ({attendance.length})
        </h4>

        {/* Worker registry selection */}
        {workers.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-2"><BilingualText en="Select from worker registry:" /></p>
            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md divide-y divide-gray-100">
              {workers.map((w) => {
                const selected = attendance.some((a) => a.worker_id === w.id)
                return (
                  <label
                    key={w.id}
                    className={`flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 ${
                      selected ? 'bg-blue-50' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleWorker(w)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-medium">{w.name}</span>
                    {w.company && <span className="text-gray-400">({w.company})</span>}
                  </label>
                )
              })}
            </div>
          </div>
        )}

        {/* Manual entry */}
        <div className="flex gap-2">
          <Input
            placeholder="Add unregistered worker name"
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addManualAttendee()
              }
            }}
          />
          <Button type="button" variant="outline" size="sm" onClick={addManualAttendee}>
            Add
          </Button>
        </div>

        {/* Manual attendees list */}
        {attendance.filter((a) => !a.worker_id).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {attendance.map((a, i) =>
              !a.worker_id ? (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm"
                >
                  {a.name}
                  <button
                    type="button"
                    onClick={() => removeAttendee(i)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    &times;
                  </button>
                </span>
              ) : null
            )}
          </div>
        )}
      </div>

      {/* Notes */}
      <Textarea
        label={<BilingualText en="Notes" />}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
        placeholder="Additional notes or topics discussed..."
      />

      {/* Sign-off */}
      <label className="flex items-center gap-3 text-sm font-medium text-gray-700 cursor-pointer">
        <input
          type="checkbox"
          checked={signedOff}
          onChange={(e) => setSignedOff(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <BilingualText en="I confirm this toolbox meeting was conducted" />
      </label>

      {/* Actions */}
      <div className="flex gap-3">
        <Button type="submit" loading={submitting}>
          {submitLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

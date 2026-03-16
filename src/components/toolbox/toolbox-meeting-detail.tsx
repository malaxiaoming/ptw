'use client'

import { TOOLBOX_CHECKLIST_ITEMS } from '@/lib/toolbox/checklist-items'
import { BilingualText } from '@/components/ui/bilingual'

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

interface ToolboxMeetingDetailProps {
  meeting: ToolboxMeeting
  onClose: () => void
}

export function ToolboxMeetingDetail({ meeting, onClose }: ToolboxMeetingDetailProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Toolbox Meeting &mdash; {meeting.meeting_date}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Conducted by {meeting.conductor?.name ?? 'Unknown'}
            {meeting.meeting_time && ` at ${meeting.meeting_time}`}
            {meeting.location && ` | ${meeting.location}`}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl leading-none"
        >
          &times;
        </button>
      </div>

      {/* Checklist */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-2">Safety Checklist</h4>
        <div className="space-y-1.5">
          {TOOLBOX_CHECKLIST_ITEMS.map((item) => {
            const checked = meeting.checklist?.[item.key] === true
            return (
              <div key={item.key} className="flex items-center gap-2 text-sm">
                <span className={checked ? 'text-green-600' : 'text-red-400'}>
                  {checked ? '\u2713' : '\u2717'}
                </span>
                <span className={checked ? 'text-gray-700' : 'text-gray-400'}>
                  <BilingualText en={item.label} zh={item.label_zh} />
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Attendance */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-2">
          Attendance ({meeting.attendance?.length ?? 0})
        </h4>
        {meeting.attendance?.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {meeting.attendance.map((a, i) => (
              <span key={i} className="px-2 py-1 bg-gray-100 rounded text-sm text-gray-700">
                {a.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No attendance recorded</p>
        )}
      </div>

      {/* Notes */}
      {meeting.notes && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Notes</h4>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{meeting.notes}</p>
        </div>
      )}

      {/* Sign-off */}
      <div className="pt-3 border-t border-gray-200">
        {meeting.signed_off ? (
          <p className="text-sm text-green-700 font-medium">
            Signed off
            {meeting.signed_off_at && (
              <span className="font-normal text-gray-500">
                {' '}on {new Date(meeting.signed_off_at).toLocaleString()}
              </span>
            )}
          </p>
        ) : (
          <p className="text-sm text-amber-600 font-medium">Not signed off</p>
        )}
      </div>
    </div>
  )
}

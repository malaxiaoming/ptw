'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FileText, CheckSquare, Users, Paperclip, Activity } from 'lucide-react'
import { StatusBadge } from '@/components/permits/status-badge'
import { ActionBar } from '@/components/permits/action-bar'
import { ChecklistForm } from '@/components/permits/checklist-form'
import { PersonnelPicker } from '@/components/permits/personnel-picker'
import { FileUpload } from '@/components/permits/file-upload'
import { Button } from '@/components/ui/button'
import { DetailSkeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import type { PermitStatus, PermitAction } from '@/lib/permits/state-machine'
import type { Role } from '@/lib/auth/permissions'
import type { ChecklistTemplate, PersonnelEntry } from '@/lib/permits/checklist-validation'

type Tab = 'details' | 'checklist' | 'personnel' | 'attachments' | 'activity'

interface UserProfile {
  id: string
  name: string
  email?: string | null
}

interface Attachment {
  id: string
  file_name: string
  file_type: string
  signed_url?: string | null
  uploaded_by?: string
  created_at: string
}

interface ActivityEntry {
  id: string
  action: string
  comments?: string | null
  created_at: string
  performer?: { name: string } | null
}

interface Permit {
  id: string
  permit_number: string
  status: PermitStatus
  project_id: string
  applicant_id: string
  work_location: string
  work_description: string
  gps_lat?: number | null
  gps_lng?: number | null
  scheduled_start?: string | null
  scheduled_end?: string | null
  checklist_data?: Record<string, unknown> | null
  personnel?: PersonnelEntry[] | null
  rejection_reason?: string | null
  revocation_reason?: string | null
  submitted_at?: string | null
  verified_at?: string | null
  approved_at?: string | null
  activated_at?: string | null
  closed_at?: string | null
  created_at: string
  permit_types?: { name: string; code: string; checklist_template: ChecklistTemplate } | null
  applicant?: UserProfile | null
  verifier?: UserProfile | null
  approver?: UserProfile | null
  project?: { id: string; name: string; location?: string | null } | null
  permit_attachments?: Attachment[]
  permit_activity_log?: ActivityEntry[]
}

interface CurrentUser {
  id: string
  roles: Role[]
}

const TAB_ICONS: Record<Tab, React.ElementType> = {
  details: FileText,
  checklist: CheckSquare,
  personnel: Users,
  attachments: Paperclip,
  activity: Activity,
}

export default function PermitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()

  const [permit, setPermit] = useState<Permit | null>(null)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('details')
  const [actionError, setActionError] = useState<string | null>(null)

  const loadPermit = useCallback(async () => {
    try {
      const res = await fetch(`/api/permits/${id}`)
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed to load permit')
        return
      }
      setPermit(json.data)
    } catch {
      setError('Failed to load permit')
    }
  }, [id])

  const loadCurrentUser = useCallback(async () => {
    try {
      const [userRes, rolesRes] = await Promise.all([
        fetch('/api/me'),
        permit ? fetch(`/api/projects/${permit.project_id}/my-roles`) : Promise.resolve(null),
      ])

      if (userRes.ok) {
        const userJson = await userRes.json()
        const userId = userJson.data?.id

        let roles: Role[] = []
        if (rolesRes?.ok) {
          const rolesJson = await rolesRes.json()
          roles = rolesJson.data ?? []
        }

        if (userId) {
          setCurrentUser({ id: userId, roles })
        }
      }
    } catch {
      // Non-fatal
    }
  }, [permit])

  useEffect(() => {
    setLoading(true)
    loadPermit().finally(() => setLoading(false))
  }, [loadPermit])

  useEffect(() => {
    if (permit) {
      loadCurrentUser()
    }
  }, [permit, loadCurrentUser])

  async function handleAction(action: PermitAction, comments?: string) {
    setActionError(null)
    try {
      const res = await fetch(`/api/permits/${id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, comments }),
      })
      const json = await res.json()
      if (!res.ok) {
        setActionError(json.error ?? 'Action failed')
        toast(json.error ?? 'Action failed', 'error')
        return
      }
      toast(`Permit ${action.replace(/_/g, ' ')} successful`, 'success')
      await loadPermit()
      await loadCurrentUser()
    } catch {
      setActionError('Action failed')
      toast('Action failed', 'error')
    }
  }

  if (loading) {
    return <DetailSkeleton />
  }

  if (error || !permit) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Permit Details</h1>
        <p className="text-red-600">{error ?? 'Permit not found'}</p>
        <Link href="/permits" className="text-sm text-primary-600 hover:underline">
          &larr; Back to Permits
        </Link>
      </div>
    )
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'details', label: 'Details' },
    { id: 'checklist', label: 'Checklist' },
    { id: 'personnel', label: 'Personnel' },
    { id: 'attachments', label: 'Attachments' },
    { id: 'activity', label: 'Activity Log' },
  ]

  const isDraft = permit.status === 'draft'
  const isApplicant = currentUser?.id === permit.applicant_id

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/permits" className="text-sm text-gray-500 hover:text-gray-700">
              &larr; Permits
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{permit.permit_number}</h1>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={permit.status} />
            {permit.permit_types && (
              <span className="text-sm text-gray-500">{permit.permit_types.name}</span>
            )}
          </div>
        </div>

        {isDraft && isApplicant && (
          <Link href={`/permits/${id}/edit`}>
            <Button variant="outline" size="md">Edit</Button>
          </Link>
        )}
      </div>

      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{actionError}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-0 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = TAB_ICONS[tab.id]
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab content */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">

        {activeTab === 'details' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Permit Details</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Permit Number</dt>
                <dd className="mt-1 text-sm text-gray-900">{permit.permit_number}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</dt>
                <dd className="mt-1"><StatusBadge status={permit.status} /></dd>
              </div>
              {permit.project && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Project</dt>
                  <dd className="mt-1 text-sm text-gray-900">{permit.project.name}</dd>
                </div>
              )}
              {permit.permit_types && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Permit Type</dt>
                  <dd className="mt-1 text-sm text-gray-900">{permit.permit_types.name}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Work Location</dt>
                <dd className="mt-1 text-sm text-gray-900">{permit.work_location}</dd>
              </div>
              {permit.gps_lat != null && permit.gps_lng != null && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">GPS Coordinates</dt>
                  <dd className="mt-1 text-sm text-gray-900">{permit.gps_lat}, {permit.gps_lng}</dd>
                </div>
              )}
              {permit.scheduled_start && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Scheduled Start</dt>
                  <dd className="mt-1 text-sm text-gray-900">{new Date(permit.scheduled_start).toLocaleString()}</dd>
                </div>
              )}
              {permit.scheduled_end && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Scheduled End</dt>
                  <dd className="mt-1 text-sm text-gray-900">{new Date(permit.scheduled_end).toLocaleString()}</dd>
                </div>
              )}
              {permit.applicant && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Applicant</dt>
                  <dd className="mt-1 text-sm text-gray-900">{permit.applicant.name}</dd>
                </div>
              )}
              {permit.verifier && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Verifier</dt>
                  <dd className="mt-1 text-sm text-gray-900">{permit.verifier.name}</dd>
                </div>
              )}
              {permit.approver && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Approver</dt>
                  <dd className="mt-1 text-sm text-gray-900">{permit.approver.name}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Created</dt>
                <dd className="mt-1 text-sm text-gray-900">{new Date(permit.created_at).toLocaleString()}</dd>
              </div>
              {permit.submitted_at && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Submitted</dt>
                  <dd className="mt-1 text-sm text-gray-900">{new Date(permit.submitted_at).toLocaleString()}</dd>
                </div>
              )}
              {permit.verified_at && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Verified</dt>
                  <dd className="mt-1 text-sm text-gray-900">{new Date(permit.verified_at).toLocaleString()}</dd>
                </div>
              )}
              {permit.approved_at && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Approved</dt>
                  <dd className="mt-1 text-sm text-gray-900">{new Date(permit.approved_at).toLocaleString()}</dd>
                </div>
              )}
              {permit.activated_at && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Activated</dt>
                  <dd className="mt-1 text-sm text-gray-900">{new Date(permit.activated_at).toLocaleString()}</dd>
                </div>
              )}
              {permit.closed_at && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Closed</dt>
                  <dd className="mt-1 text-sm text-gray-900">{new Date(permit.closed_at).toLocaleString()}</dd>
                </div>
              )}
            </dl>
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Work Description</dt>
              <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{permit.work_description}</dd>
            </div>
            {permit.rejection_reason && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-xs font-medium text-red-700 uppercase tracking-wide mb-1">Rejection Reason</p>
                <p className="text-sm text-red-700">{permit.rejection_reason}</p>
              </div>
            )}
            {permit.revocation_reason && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-xs font-medium text-red-700 uppercase tracking-wide mb-1">Revocation Reason</p>
                <p className="text-sm text-red-700">{permit.revocation_reason}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'checklist' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Checklist</h2>
            {permit.permit_types?.checklist_template?.sections?.length ? (
              <ChecklistForm
                template={permit.permit_types.checklist_template}
                data={permit.checklist_data ?? {}}
                onChange={() => {}}
                permitId={id}
                disabled
              />
            ) : (
              <p className="text-sm text-gray-500 italic">No checklist for this permit type.</p>
            )}
          </div>
        )}

        {activeTab === 'personnel' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Personnel</h2>
            {permit.permit_types?.checklist_template?.personnel?.length ? (
              <PersonnelPicker
                requirements={permit.permit_types.checklist_template.personnel}
                personnel={permit.personnel ?? []}
                onChange={() => {}}
                disabled
              />
            ) : (
              <p className="text-sm text-gray-500 italic">No personnel requirements for this permit type.</p>
            )}
          </div>
        )}

        {activeTab === 'attachments' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Attachments</h2>
            <FileUpload
              permitId={id}
              attachments={permit.permit_attachments ?? []}
              onUploadComplete={loadPermit}
              disabled={false}
            />
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Activity Log</h2>
            {!permit.permit_activity_log?.length ? (
              <p className="text-sm text-gray-500 italic">No activity recorded.</p>
            ) : (
              <ol className="relative border-l border-gray-200 space-y-4 pl-4">
                {[...(permit.permit_activity_log ?? [])].reverse().map((entry) => (
                  <li key={entry.id} className="ml-2">
                    <div className="absolute -left-1.5 w-3 h-3 bg-primary-200 rounded-full border border-white" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {entry.action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      </p>
                      {entry.performer && (
                        <p className="text-xs text-gray-500">by {entry.performer.name}</p>
                      )}
                      {entry.comments && (
                        <p className="text-sm text-gray-600 mt-1 italic">&quot;{entry.comments}&quot;</p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(entry.created_at).toLocaleString()}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      {currentUser && (
        <ActionBar
          permit={{ id: permit.id, status: permit.status, applicant_id: permit.applicant_id, project_id: permit.project_id }}
          userRoles={currentUser.roles}
          userId={currentUser.id}
          onAction={handleAction}
        />
      )}
    </div>
  )
}

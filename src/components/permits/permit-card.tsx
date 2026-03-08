import Link from 'next/link'
import { StatusBadge } from './status-badge'
import type { PermitStatus } from '@/lib/permits/state-machine'

interface PermitCardProps {
  permit: {
    id: string
    permit_number: string
    status: PermitStatus | string
    work_location: string
    work_description: string
    created_at: string
    scheduled_start?: string | null
    scheduled_end?: string | null
    permit_types?: { name: string; code: string } | null
    applicant?: { name: string } | null
    project?: { name: string } | null
  }
}

export function PermitCard({ permit }: PermitCardProps) {
  return (
    <Link
      href={`/permits/${permit.id}`}
      className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-blue-600">{permit.permit_number}</span>
            {permit.permit_types && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                {permit.permit_types.code}
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-gray-900 truncate">{permit.work_location}</p>
          <p className="text-sm text-gray-500 truncate mt-0.5">{permit.work_description}</p>
          <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
            {permit.project && (
              <span>{permit.project.name}</span>
            )}
            {permit.permit_types && (
              <span>{permit.permit_types.name}</span>
            )}
            {permit.applicant && (
              <span>By {permit.applicant.name}</span>
            )}
          </div>
          {(permit.scheduled_start || permit.scheduled_end) && (
            <div className="mt-2 text-xs text-gray-500">
              {permit.scheduled_start && (
                <span>Start: {new Date(permit.scheduled_start).toLocaleString()}</span>
              )}
              {permit.scheduled_start && permit.scheduled_end && <span className="mx-1">—</span>}
              {permit.scheduled_end && (
                <span>End: {new Date(permit.scheduled_end).toLocaleString()}</span>
              )}
            </div>
          )}
        </div>
        <div className="flex-shrink-0 flex items-center gap-1.5">
          <StatusBadge status={permit.status} />
          {permit.scheduled_end && new Date(permit.scheduled_end) < new Date() && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
              Expired
            </span>
          )}
        </div>
      </div>
      <div className="mt-2 text-xs text-gray-400">
        Created {new Date(permit.created_at).toLocaleDateString()}
      </div>
    </Link>
  )
}

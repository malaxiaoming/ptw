import Link from 'next/link'
import { STATUS_CONFIG } from '@/lib/permits/status-display'
import type { PermitStatus } from '@/lib/permits/state-machine'

interface Permit {
  id: string
  permit_number: string
  permit_type_id: string
  status: PermitStatus | string
  work_location: string
  work_description: string
  created_at: string
  permit_types?: { name: string; code: string } | null
  applicant?: { name: string } | null
}

interface PermitBoardProps {
  permits: Permit[]
}

const BOARD_COLUMNS: PermitStatus[] = [
  'draft',
  'submitted',
  'verified',
  'active',
  'closure_submitted',
  'closed',
]

export function PermitBoard({ permits }: PermitBoardProps) {
  // Group permits by status
  const grouped = new Map<string, Permit[]>()
  for (const p of permits) {
    const key = p.status
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(p)
  }

  // Check for rejected/revoked permits
  const rejectedRevoked = [
    ...(grouped.get('rejected') ?? []),
    ...(grouped.get('revoked') ?? []),
  ]

  return (
    <div className="overflow-x-auto pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6">
      <div className="flex gap-3 min-w-min">
        {BOARD_COLUMNS.map((status) => {
          const config = STATUS_CONFIG[status]
          const columnPermits = grouped.get(status) ?? []
          return (
            <BoardColumn
              key={status}
              label={config.label}
              count={columnPermits.length}
              dotColor={config.dotColor}
              bgClass={config.bgClass}
              textClass={config.textClass}
              permits={columnPermits}
            />
          )
        })}
        {rejectedRevoked.length > 0 && (
          <BoardColumn
            label="Rejected / Revoked"
            count={rejectedRevoked.length}
            dotColor="bg-red-500"
            bgClass="bg-red-100"
            textClass="text-red-700"
            permits={rejectedRevoked}
          />
        )}
      </div>
    </div>
  )
}

function BoardColumn({
  label,
  count,
  dotColor,
  bgClass,
  textClass,
  permits,
}: {
  label: string
  count: number
  dotColor: string
  bgClass: string
  textClass: string
  permits: Permit[]
}) {
  return (
    <div className="w-[220px] flex-shrink-0 flex flex-col">
      {/* Column header */}
      <div className={`flex items-center gap-2 rounded-lg px-3 py-2 mb-2 ${bgClass}`}>
        <span className={`w-2 h-2 rounded-full ${dotColor}`} />
        <span className={`text-xs font-semibold ${textClass}`}>{label}</span>
        <span className={`ml-auto text-xs font-medium ${textClass} opacity-70`}>{count}</span>
      </div>

      {/* Column body */}
      <div className="flex-1 space-y-2 min-h-[200px]">
        {permits.length === 0 ? (
          <p className="text-xs text-gray-400 text-center pt-8">No permits</p>
        ) : (
          permits.map((permit) => (
            <Link
              key={permit.id}
              href={`/permits/${permit.id}`}
              className="block rounded-lg border border-gray-200 bg-white p-3 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <p className="text-xs font-semibold text-blue-600 truncate">
                {permit.permit_number}
              </p>
              {permit.permit_types && (
                <span className="inline-block mt-1 text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                  {permit.permit_types.code}
                </span>
              )}
              <p className="text-xs text-gray-700 truncate mt-1">{permit.work_location}</p>
              {permit.applicant && (
                <p className="text-[10px] text-gray-400 truncate mt-1">
                  {permit.applicant.name}
                </p>
              )}
              <p className="text-[10px] text-gray-400 mt-1">
                {new Date(permit.created_at).toLocaleDateString()}
              </p>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}

import type { PermitStatus } from '@/lib/permits/state-machine'

const STATUS_COLORS: Record<PermitStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  verified: 'bg-indigo-100 text-indigo-700',
  approved: 'bg-purple-100 text-purple-700',
  active: 'bg-green-100 text-green-700',
  closure_submitted: 'bg-yellow-100 text-yellow-700',
  closed: 'bg-gray-100 text-gray-500',
  rejected: 'bg-red-100 text-red-700',
  revoked: 'bg-red-100 text-red-700',
}

const STATUS_LABELS: Record<PermitStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  verified: 'Verified',
  approved: 'Approved',
  active: 'Active',
  closure_submitted: 'Closure Submitted',
  closed: 'Closed',
  rejected: 'Rejected',
  revoked: 'Revoked',
}

interface StatusBadgeProps {
  status: PermitStatus | string
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const colorClass = STATUS_COLORS[status as PermitStatus] ?? 'bg-gray-100 text-gray-600'
  const label = STATUS_LABELS[status as PermitStatus] ?? status

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  )
}

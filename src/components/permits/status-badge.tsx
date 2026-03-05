import type { PermitStatus } from '@/lib/permits/state-machine'
import { STATUS_CONFIG } from '@/lib/permits/status-display'

interface StatusBadgeProps {
  status: PermitStatus | string
  size?: 'sm' | 'md'
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status as PermitStatus]
  const bgClass = config?.bgClass ?? 'bg-gray-100'
  const textClass = config?.textClass ?? 'text-gray-600'
  const dotColor = config?.dotColor ?? 'bg-gray-400'
  const label = config?.label ?? status

  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-xs'
    : 'px-2.5 py-0.5 text-xs'

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${bgClass} ${textClass} ${sizeClasses}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      {label}
    </span>
  )
}

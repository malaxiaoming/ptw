interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-skeleton-pulse bg-gray-200 rounded ${className}`} />
  )
}

export function PermitCardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-3 w-64" />
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <Skeleton className="h-8 w-40" />
      {/* Pending actions card */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="px-6 py-3 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex justify-between items-center">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-36" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
      {/* Status counts card */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <Skeleton className="h-5 w-36" />
        </div>
        <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-32" />
        </div>
      </div>
      <div className="flex gap-1 border-b border-gray-200 pb-0">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-9 w-24" />
        ))}
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

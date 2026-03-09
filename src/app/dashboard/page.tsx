'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { STATUS_CONFIG } from '@/lib/permits/status-display'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { DashboardSkeleton } from '@/components/ui/skeleton'

interface PendingPermit {
  id: string
  permit_number: string
  status: string
  project_id: string
  updated_at: string
  scheduled_end?: string | null
}

interface ExpiringPermit {
  id: string
  permit_number: string
  status: string
  scheduled_end: string
}

interface ActivityEntry {
  id: string
  permit_id: string
  action: string
  performed_by: string
  created_at: string
  comments?: string
}

interface DashboardStats {
  pending_actions: PendingPermit[]
  status_counts: Record<string, number>
  expiring_soon: ExpiringPermit[]
  recent_activity: ActivityEntry[]
}

function getStatusClasses(status: string) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]
  return {
    bg: config?.bgClass ?? 'bg-gray-100',
    text: config?.textClass ?? 'text-gray-600',
    dot: config?.dotColor ?? 'bg-gray-400',
    label: config?.label ?? status,
  }
}

function getUrgencyDot(scheduledEnd: string) {
  const hoursLeft = (new Date(scheduledEnd).getTime() - Date.now()) / (1000 * 60 * 60)
  if (hoursLeft < 12) return 'bg-red-500'
  if (hoursLeft < 24) return 'bg-orange-500'
  return 'bg-yellow-500'
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then((r) => r.json())
      .then((json) => {
        if (json.error) setError(json.error)
        else setStats(json.data)
      })
      .catch(() => setError('Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <DashboardSkeleton />
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  if (!stats) return null

  const totalPermits = Object.values(stats.status_counts).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* My Pending Actions */}
      <Card className="border-l-4 border-l-primary-600">
        <CardHeader action={<span className="text-sm text-gray-500">{stats.pending_actions.length} items</span>}>
          <h2 className="font-semibold text-gray-900">My Pending Actions</h2>
        </CardHeader>
        {stats.pending_actions.length === 0 ? (
          <CardContent>
            <p className="text-sm text-gray-500">No pending actions. You&apos;re all caught up!</p>
          </CardContent>
        ) : (
          <ul className="divide-y divide-gray-100">
            {stats.pending_actions.map((permit) => {
              const s = getStatusClasses(permit.status)
              return (
                <li key={permit.id} className="px-6 py-3 flex justify-between items-center hover:bg-gray-50 transition-colors">
                  <div>
                    <Link href={`/permits/${permit.id}`} className="text-sm font-medium text-primary-600 hover:underline">
                      {permit.permit_number}
                    </Link>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Updated {new Date(permit.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {permit.scheduled_end && new Date(permit.scheduled_end) < new Date() && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                        Expired
                      </span>
                    )}
                    <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium ${s.bg} ${s.text}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                      {s.label}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      {/* Permits by Status */}
      <Card>
        <CardHeader>
          <div>
            <h2 className="font-semibold text-gray-900">Permits by Status</h2>
            <p className="text-sm text-gray-500 mt-0.5">{totalPermits} total permits</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(STATUS_CONFIG).map(([status, config]) => {
              const count = stats.status_counts[status] ?? 0
              if (count === 0) return null
              return (
                <div key={status} className={`rounded-lg px-4 py-3 ${config.bgClass} ${config.textClass}`}>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs font-medium mt-0.5 opacity-80">{config.label}</p>
                </div>
              )
            })}
            {totalPermits === 0 && (
              <p className="col-span-3 text-sm text-gray-500">No permits found for your projects.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Expiring Soon */}
      <Card>
        <CardHeader action={<span className="text-sm text-gray-500">Within 48 hours</span>}>
          <h2 className="font-semibold text-gray-900">Expiring Soon</h2>
        </CardHeader>
        {stats.expiring_soon.length === 0 ? (
          <CardContent>
            <p className="text-sm text-gray-500">No active permits expiring in the next 48 hours.</p>
          </CardContent>
        ) : (
          <ul className="divide-y divide-gray-100">
            {stats.expiring_soon.map((permit) => (
              <li key={permit.id} className="px-6 py-3 flex justify-between items-center hover:bg-gray-50 transition-colors">
                <Link href={`/permits/${permit.id}`} className="text-sm font-medium text-primary-600 hover:underline">
                  {permit.permit_number}
                </Link>
                <span className="flex items-center gap-1.5 text-xs text-orange-600 font-medium">
                  <span className={`h-2 w-2 rounded-full ${getUrgencyDot(permit.scheduled_end)}`} />
                  Expires {new Date(permit.scheduled_end).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">Recent Activity</h2>
        </CardHeader>
        {stats.recent_activity.length === 0 ? (
          <CardContent>
            <p className="text-sm text-gray-500">No recent activity.</p>
          </CardContent>
        ) : (
          <ul className="divide-y divide-gray-100">
            {stats.recent_activity.map((entry) => (
              <li key={entry.id} className="px-6 py-3">
                <div className="flex justify-between items-start">
                  <div>
                    <Link href={`/permits/${entry.permit_id}`} className="text-sm font-medium text-primary-600 hover:underline">
                      {entry.action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </Link>
                    {entry.comments && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{entry.comments}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 ml-4 flex-shrink-0">
                    {new Date(entry.created_at).toLocaleDateString()}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

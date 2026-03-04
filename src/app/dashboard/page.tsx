'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface PendingPermit {
  id: string
  permit_number: string
  status: string
  project_id: string
  updated_at: string
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

const STATUS_COLORS: Record<string, string> = {
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

const STATUS_LABELS: Record<string, string> = {
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
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Loading...</p>
      </div>
    )
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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Widget 1: My Pending Actions */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="font-semibold text-gray-900">My Pending Actions</h2>
          <span className="text-sm text-gray-500">{stats.pending_actions.length} items</span>
        </div>
        {stats.pending_actions.length === 0 ? (
          <p className="px-6 py-4 text-sm text-gray-500">No pending actions. You&apos;re all caught up!</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {stats.pending_actions.map((permit) => (
              <li key={permit.id} className="px-6 py-3 flex justify-between items-center hover:bg-gray-50">
                <div>
                  <Link href={`/permits/${permit.id}`} className="text-sm font-medium text-blue-600 hover:underline">
                    {permit.permit_number}
                  </Link>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Updated {new Date(permit.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[permit.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {STATUS_LABELS[permit.status] ?? permit.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Widget 2: Permits by Status */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Permits by Status</h2>
          <p className="text-sm text-gray-500 mt-0.5">{totalPermits} total permits</p>
        </div>
        <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Object.entries(STATUS_LABELS).map(([status, label]) => {
            const count = stats.status_counts[status] ?? 0
            if (count === 0) return null
            return (
              <div key={status} className={`rounded-lg px-4 py-3 ${STATUS_COLORS[status] ?? 'bg-gray-100'}`}>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs font-medium mt-0.5 opacity-80">{label}</p>
              </div>
            )
          })}
          {totalPermits === 0 && (
            <p className="col-span-3 text-sm text-gray-500">No permits found for your projects.</p>
          )}
        </div>
      </div>

      {/* Widget 3: Expiring Soon */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="font-semibold text-gray-900">Expiring Soon</h2>
          <span className="text-sm text-gray-500">Within 48 hours</span>
        </div>
        {stats.expiring_soon.length === 0 ? (
          <p className="px-6 py-4 text-sm text-gray-500">No active permits expiring in the next 48 hours.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {stats.expiring_soon.map((permit) => (
              <li key={permit.id} className="px-6 py-3 flex justify-between items-center hover:bg-gray-50">
                <Link href={`/permits/${permit.id}`} className="text-sm font-medium text-blue-600 hover:underline">
                  {permit.permit_number}
                </Link>
                <span className="text-xs text-orange-600 font-medium">
                  Expires {new Date(permit.scheduled_end).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Widget 4: Recent Activity */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Recent Activity</h2>
        </div>
        {stats.recent_activity.length === 0 ? (
          <p className="px-6 py-4 text-sm text-gray-500">No recent activity.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {stats.recent_activity.map((entry) => (
              <li key={entry.id} className="px-6 py-3">
                <div className="flex justify-between items-start">
                  <div>
                    <Link href={`/permits/${entry.permit_id}`} className="text-sm font-medium text-blue-600 hover:underline">
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
      </div>
    </div>
  )
}

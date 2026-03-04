'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { PermitCard } from '@/components/permits/permit-card'
import type { PermitStatus } from '@/lib/permits/state-machine'

interface Project {
  id: string
  name: string
}

interface PermitType {
  id: string
  name: string
  code: string
}

interface Permit {
  id: string
  permit_number: string
  permit_type_id: string
  status: PermitStatus | string
  work_location: string
  work_description: string
  created_at: string
  scheduled_start?: string | null
  scheduled_end?: string | null
  permit_types?: { name: string; code: string } | null
  applicant?: { name: string } | null
  project?: { name: string; id: string } | null
  project_id: string
}

const ALL_STATUSES: PermitStatus[] = [
  'draft', 'submitted', 'verified', 'approved', 'active',
  'closure_submitted', 'closed', 'rejected', 'revoked',
]

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

export default function PermitsPage() {
  const [permits, setPermits] = useState<Permit[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [permitTypes, setPermitTypes] = useState<PermitType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [projectFilter, setProjectFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const loadPermits = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (projectFilter) params.set('project_id', projectFilter)
      if (statusFilter) params.set('status', statusFilter)

      const res = await fetch(`/api/permits?${params}`)
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed to load permits')
      } else {
        const data: Permit[] = json.data ?? []
        setPermits(data)

        // Extract unique projects from loaded permits for the project filter
        const projectMap = new Map<string, Project>()
        const typeMap = new Map<string, PermitType>()
        for (const p of data) {
          if (p.project) {
            projectMap.set(p.project_id, { id: p.project_id, name: p.project.name })
          }
          if (p.permit_types) {
            typeMap.set(p.permit_type_id, { id: p.permit_type_id, name: p.permit_types.name, code: p.permit_types.code })
          }
        }
        if (!projectFilter) {
          setProjects(Array.from(projectMap.values()))
        }
        setPermitTypes(Array.from(typeMap.values()))
      }
    } catch {
      setError('Failed to load permits')
    } finally {
      setLoading(false)
    }
  }, [projectFilter, statusFilter, typeFilter])

  useEffect(() => {
    loadPermits()
  }, [loadPermits])

  const displayedPermits = typeFilter
    ? permits.filter((p) => p.permit_type_id === typeFilter)
    : permits

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Permits</h1>
        <Link
          href="/permits/new"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          + New Permit
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[160px]">
            <label htmlFor="project-filter" className="block text-xs font-medium text-gray-700 mb-1">
              Project
            </label>
            <select
              id="project-filter"
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[160px]">
            <label htmlFor="type-filter" className="block text-xs font-medium text-gray-700 mb-1">
              Permit Type
            </label>
            <select
              id="type-filter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              {permitTypes.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[160px]">
            <label htmlFor="status-filter" className="block text-xs font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>

          {(projectFilter || typeFilter || statusFilter) && (
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => { setProjectFilter(''); setTypeFilter(''); setStatusFilter('') }}
                className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading permits...</div>
      ) : error ? (
        <div className="text-center py-12 text-red-600">{error}</div>
      ) : displayedPermits.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No permits found.</p>
          <Link
            href="/permits/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
          >
            Create your first permit
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">{displayedPermits.length} permit{displayedPermits.length !== 1 ? 's' : ''}</p>
          {displayedPermits.map((permit) => (
            <PermitCard key={permit.id} permit={permit} />
          ))}
        </div>
      )}
    </div>
  )
}

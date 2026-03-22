'use client'

import { useState, useEffect, useCallback, use } from 'react'
import Link from 'next/link'
import ProjectSubNav from '@/components/projects/project-sub-nav'
import { PermitCard } from '@/components/permits/permit-card'
import { PermitBoard } from '@/components/permits/permit-board'
import { StatusBadge } from '@/components/permits/status-badge'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/input'
import { PermitCardSkeleton } from '@/components/ui/skeleton'
import { STATUS_CONFIG, ALL_STATUSES } from '@/lib/permits/status-display'
import { FileText, List, LayoutGrid } from 'lucide-react'
import type { PermitStatus } from '@/lib/permits/state-machine'

interface Project {
  id: string
  name: string
  status: 'active' | 'archived'
}

interface PendingPermit {
  id: string
  permit_number: string
  status: string
  updated_at: string
  permit_types?: { name: string; code: string } | null
}

interface PermitSummary {
  my_actions: PendingPermit[]
  stats: Record<string, number>
  recent_permits: unknown[]
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
  project?: { name: string } | null
  project_id: string
}

export default function ProjectPermitsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const [project, setProject] = useState<Project | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isApplicant, setIsApplicant] = useState(false)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [summary, setSummary] = useState<PermitSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(true)

  const [permits, setPermits] = useState<Permit[]>([])
  const [permitTypes, setPermitTypes] = useState<PermitType[]>([])
  const [permitsLoading, setPermitsLoading] = useState(true)
  const [permitsError, setPermitsError] = useState<string | null>(null)

  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board')

  // Load project + roles
  useEffect(() => {
    async function load() {
      setLoading(true)
      setFetchError(null)
      try {
        const projectRes = await fetch(`/api/projects/${id}`)
        const projectJson = await projectRes.json()
        if (!projectRes.ok) {
          setFetchError(projectJson.error ?? 'Failed to load project')
          return
        }
        setProject(projectJson.data)

        // Check admin
        const rolesRes = await fetch(`/api/projects/${id}/roles`)
        if (rolesRes.ok) setIsAdmin(true)

        // Check applicant role
        const myRoleRes = await fetch(`/api/projects/${id}/my-role`)
        if (myRoleRes.ok) {
          const myRoleJson = await myRoleRes.json()
          const roles: string[] = myRoleJson.data?.roles ?? []
          setIsApplicant(roles.includes('applicant'))
        }
      } catch {
        setFetchError('Failed to load project')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  // Load permit summary
  useEffect(() => {
    async function loadSummary() {
      setSummaryLoading(true)
      try {
        const res = await fetch(`/api/projects/${id}/permit-summary`)
        if (res.ok) {
          const json = await res.json()
          setSummary(json.data)
        }
      } catch {
        // Non-critical
      } finally {
        setSummaryLoading(false)
      }
    }
    loadSummary()
  }, [id])

  // Load permits list
  const loadPermits = useCallback(async () => {
    setPermitsLoading(true)
    setPermitsError(null)
    try {
      const params = new URLSearchParams({ project_id: id })
      if (statusFilter) params.set('status', statusFilter)

      const res = await fetch(`/api/permits?${params}`)
      const json = await res.json()
      if (!res.ok) {
        setPermitsError(json.error ?? 'Failed to load permits')
      } else {
        const data: Permit[] = json.data ?? []
        setPermits(data)

        const typeMap = new Map<string, PermitType>()
        for (const p of data) {
          if (p.permit_types) {
            typeMap.set(p.permit_type_id, { id: p.permit_type_id, name: p.permit_types.name, code: p.permit_types.code })
          }
        }
        setPermitTypes(Array.from(typeMap.values()))
      }
    } catch {
      setPermitsError('Failed to load permits')
    } finally {
      setPermitsLoading(false)
    }
  }, [id, statusFilter])

  useEffect(() => {
    loadPermits()
  }, [loadPermits])

  useEffect(() => {
    setTypeFilter('')
  }, [statusFilter])

  // Clear status filter when switching to board view (board shows all statuses as columns)
  useEffect(() => {
    if (viewMode === 'board') setStatusFilter('')
  }, [viewMode])

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading project...</div>
  }

  if (fetchError) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{fetchError}</p>
        <Link href="/projects" className="text-sm text-blue-600 hover:underline mt-2 block">
          Back to Projects
        </Link>
      </div>
    )
  }

  if (!project) return null

  const totalPermits = summary
    ? Object.entries(summary.stats)
        .filter(([k]) => k !== 'expiring_soon')
        .reduce((a, [, v]) => a + v, 0)
    : 0

  const displayedPermits = typeFilter
    ? permits.filter((p) => p.permit_type_id === typeFilter)
    : permits

  return (
    <div className="space-y-6">
      <div>
        <Link href="/projects" className="text-sm text-gray-500 hover:text-gray-700">
          &larr; Projects
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">
          {project.name}
          <span
            className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium align-middle ${
              project.status === 'active'
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {project.status}
          </span>
        </h1>
      </div>

      <ProjectSubNav projectId={id} projectName={project.name} isAdmin={isAdmin} />

      {/* Header with view toggle and New Permit button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Permits</h2>
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('board')}
              className={`p-1.5 ${viewMode === 'board' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
              title="Board view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 ${viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
        {isApplicant && (
          <Link href={`/permits/new?project=${id}`}>
            <Button size="md">+ New Permit</Button>
          </Link>
        )}
      </div>

      {/* My Pending Actions */}
      {!summaryLoading && summary && summary.my_actions.length > 0 && (
        <Card className="border-l-4 border-l-primary-600">
          <CardHeader action={<span className="text-sm text-gray-500">{summary.my_actions.length} items</span>}>
            <h2 className="font-semibold text-gray-900">My Pending Actions</h2>
          </CardHeader>
          <ul className="divide-y divide-gray-100">
            {summary.my_actions.map((permit) => (
              <li key={permit.id} className="px-6 py-3 flex justify-between items-center hover:bg-gray-50 transition-colors">
                <div>
                  <Link href={`/permits/${permit.id}`} className="text-sm font-medium text-primary-600 hover:underline">
                    {permit.permit_number}
                  </Link>
                  {permit.permit_types && (
                    <span className="ml-2 text-xs text-gray-500">{permit.permit_types.name}</span>
                  )}
                  <p className="text-xs text-gray-500 mt-0.5">
                    Updated {new Date(permit.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <StatusBadge status={permit.status as PermitStatus} size="sm" />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Permit Stats */}
      {!summaryLoading && summary && totalPermits > 0 && (
        <Card>
          <CardHeader>
            <div>
              <h2 className="font-semibold text-gray-900">Permit Stats</h2>
              <p className="text-sm text-gray-500 mt-0.5">{totalPermits} total permits</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(STATUS_CONFIG).map(([status, config]) => {
                const count = summary.stats[status] ?? 0
                if (count === 0) return null
                return (
                  <div key={status} className={`rounded-lg px-4 py-3 ${config.bgClass} ${config.textClass}`}>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs font-medium mt-0.5 opacity-80">{config.label}</p>
                  </div>
                )
              })}
              {(summary.stats.expiring_soon ?? 0) > 0 && (
                <div className="rounded-lg px-4 py-3 bg-orange-100 text-orange-700">
                  <p className="text-2xl font-bold">{summary.stats.expiring_soon}</p>
                  <p className="text-xs font-medium mt-0.5 opacity-80">Expiring Soon</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {summaryLoading && (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="animate-skeleton-pulse bg-gray-200 rounded h-5 w-40 mb-4" />
              <div className="space-y-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="animate-skeleton-pulse bg-gray-200 rounded h-4 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[160px]">
            <Select
              label="Permit Type"
              id="type-filter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All Types</option>
              {permitTypes.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </Select>
          </div>

          {viewMode === 'list' && (
            <div className="flex-1 min-w-[160px]">
              <Select
                label="Status"
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                ))}
              </Select>
            </div>
          )}

          {(typeFilter || (viewMode === 'list' && statusFilter)) && (
            <div className="flex items-end">
              <Button
                variant="outline"
                size="md"
                onClick={() => { setTypeFilter(''); setStatusFilter('') }}
              >
                Clear
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Permit List / Board */}
      {permitsLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <PermitCardSkeleton key={i} />
          ))}
        </div>
      ) : permitsError ? (
        <div className="text-center py-12 text-red-600">{permitsError}</div>
      ) : displayedPermits.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">No permits found.</p>
          {isApplicant && (
            <Link href={`/permits/new?project=${id}`}>
              <Button>Create your first permit</Button>
            </Link>
          )}
        </div>
      ) : viewMode === 'board' ? (
        <PermitBoard permits={displayedPermits} />
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

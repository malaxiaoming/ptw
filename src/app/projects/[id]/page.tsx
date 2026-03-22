'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import ProjectSubNav from '@/components/projects/project-sub-nav'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/permits/status-badge'
import { STATUS_CONFIG } from '@/lib/permits/status-display'
import { DashboardSkeleton } from '@/components/ui/skeleton'
import type { PermitStatus } from '@/lib/permits/state-machine'

interface UserProfile {
  id: string
  name: string
  email: string | null
}

interface RoleAssignment {
  id: string
  user_id: string
  role: string
  user_profiles: UserProfile | null
}

interface Project {
  id: string
  name: string
  description: string | null
  reference_number: string | null
  address: string | null
  postal_code: string | null
  status: 'active' | 'archived'
  created_at: string
}

interface PendingPermit {
  id: string
  permit_number: string
  status: string
  updated_at: string
  permit_types?: { name: string; code: string } | null
}

interface RecentPermit {
  id: string
  permit_number: string
  status: string
  created_at: string
  permit_types?: { name: string; code: string } | null
}

interface PermitSummary {
  my_actions: PendingPermit[]
  stats: Record<string, number>
  recent_permits: RecentPermit[]
}

const ROLE_LABELS: Record<string, string> = {
  applicant: 'Applicant',
  verifier: 'Verifier',
  approver: 'Approver',
  admin: 'Admin',
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const [project, setProject] = useState<Project | null>(null)
  const [roles, setRoles] = useState<RoleAssignment[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [summary, setSummary] = useState<PermitSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(true)

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

        // Fetch roles (admin-only endpoint) — if it succeeds, user is admin
        const rolesRes = await fetch(`/api/projects/${id}/roles`)
        if (rolesRes.ok) {
          const rolesJson = await rolesRes.json()
          setRoles(rolesJson.data ?? [])
          setIsAdmin(true)
        }
      } catch {
        setFetchError('Failed to load project')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

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
        // Non-critical — just don't show summary
      } finally {
        setSummaryLoading(false)
      }
    }
    loadSummary()
  }, [id])

  if (loading) {
    return <DashboardSkeleton />
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

      {/* Recent Permits */}
      {!summaryLoading && summary && summary.recent_permits.length > 0 && (
        <Card>
          <CardHeader action={
            <Link href={`/permits?project=${id}`} className="text-sm text-primary-600 hover:underline">
              View all permits &rarr;
            </Link>
          }>
            <h2 className="font-semibold text-gray-900">Recent Permits</h2>
          </CardHeader>
          <ul className="divide-y divide-gray-100">
            {summary.recent_permits.map((permit) => (
              <li key={permit.id} className="px-6 py-3 flex justify-between items-center hover:bg-gray-50 transition-colors">
                <div>
                  <Link href={`/permits/${permit.id}`} className="text-sm font-medium text-primary-600 hover:underline">
                    {permit.permit_number}
                  </Link>
                  {permit.permit_types && (
                    <span className="ml-2 text-xs text-gray-500">{permit.permit_types.code}</span>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    Created {new Date(permit.created_at).toLocaleDateString()}
                  </p>
                </div>
                <StatusBadge status={permit.status as PermitStatus} size="sm" />
              </li>
            ))}
          </ul>
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

      {/* Project Details */}
      {(project.description || project.reference_number || project.address) && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          {project.description && (
            <div>
              <p className="text-sm text-gray-500">Description</p>
              <p className="text-gray-900 mt-0.5">{project.description}</p>
            </div>
          )}
          {project.reference_number && (
            <div>
              <p className="text-sm text-gray-500">Reference Number</p>
              <p className="text-gray-900 mt-0.5">{project.reference_number}</p>
            </div>
          )}
          {project.address && (
            <div>
              <p className="text-sm text-gray-500">Address</p>
              <p className="text-gray-900 mt-0.5">
                {project.address}
                {project.postal_code && `, ${project.postal_code}`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Team Members (admin only) */}
      {isAdmin && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Team Members</h2>
          </div>
          {roles.length === 0 ? (
            <div className="px-5 py-8 text-center text-gray-500 text-sm">
              No users assigned to this project yet.{' '}
              <Link href={`/projects/${id}/team`} className="text-blue-600 hover:underline">
                Add users in Team.
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {roles.map((assignment) => (
                <li key={assignment.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {assignment.user_profiles?.name ?? 'Unknown User'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {assignment.user_profiles?.email ?? ''}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                    {ROLE_LABELS[assignment.role] ?? assignment.role}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

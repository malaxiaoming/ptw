'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import ProjectSubNav from '@/components/projects/project-sub-nav'

interface UserProfile {
  id: string
  name: string
  email: string | null
}

interface Company {
  id: string
  name: string
}

interface RoleAssignment {
  id: string
  user_id: string
  role: string
  is_active: boolean
  company_id: string | null
  user_profiles: UserProfile | null
  project_companies: Company | null
}

interface Project {
  id: string
  name: string
}

interface OrgUser {
  id: string
  name: string
  email: string | null
  is_active?: boolean
}

const VALID_ROLES = ['applicant', 'verifier', 'approver'] as const
type Role = typeof VALID_ROLES[number]

const ROLE_LABELS: Record<Role, string> = {
  applicant: 'Applicant',
  verifier: 'Verifier',
  approver: 'Approver',
}

export default function ProjectTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const [project, setProject] = useState<Project | null>(null)
  const [roles, setRoles] = useState<RoleAssignment[]>([])
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [addUserId, setAddUserId] = useState('')
  const [addRole, setAddRole] = useState<Role>('applicant')
  const [addCompanyId, setAddCompanyId] = useState('')
  const [addingRole, setAddingRole] = useState(false)
  const [addRoleError, setAddRoleError] = useState<string | null>(null)

  const [removingId, setRemovingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setFetchError(null)
      try {
        const [projectRes, rolesRes, usersRes, companiesRes] = await Promise.all([
          fetch(`/api/projects/${id}`),
          fetch(`/api/projects/${id}/roles`),
          fetch('/api/users'),
          fetch(`/api/projects/${id}/companies`),
        ])
        const projectJson = await projectRes.json()
        const rolesJson = await rolesRes.json()
        const usersJson = await usersRes.json()
        const companiesJson = await companiesRes.json()

        if (!projectRes.ok) {
          setFetchError(projectJson.error ?? 'Failed to load project')
          return
        }
        if (!rolesRes.ok) {
          setFetchError('Access denied')
          return
        }

        setProject(projectJson.data)
        setRoles(rolesJson.data ?? [])
        setOrgUsers(usersJson.data?.users ?? [])
        setCompanies(companiesJson.data ?? [])
      } catch {
        setFetchError('Failed to load team')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  async function handleAddRole(e: React.FormEvent) {
    e.preventDefault()
    if (!addUserId) return

    setAddingRole(true)
    setAddRoleError(null)
    try {
      const res = await fetch(`/api/projects/${id}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: addUserId, role: addRole, company_id: addCompanyId || undefined }),
      })
      const json = await res.json()
      if (!res.ok) {
        setAddRoleError(json.error ?? 'Failed to add role')
      } else {
        const rolesRes = await fetch(`/api/projects/${id}/roles`)
        const rolesJson = await rolesRes.json()
        setRoles(rolesJson.data ?? [])
        setAddUserId('')
        setAddRole('applicant')
        setAddCompanyId('')
      }
    } catch {
      setAddRoleError('Failed to add role')
    } finally {
      setAddingRole(false)
    }
  }

  async function handleToggleActive(assignment: RoleAssignment) {
    setTogglingId(assignment.id)
    try {
      const res = await fetch(`/api/projects/${id}/roles`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: assignment.user_id,
          role: assignment.role,
          is_active: !assignment.is_active,
        }),
      })
      if (res.ok) {
        setRoles((prev) =>
          prev.map((r) =>
            r.id === assignment.id ? { ...r, is_active: !r.is_active } : r
          )
        )
      }
    } catch {
      // silently ignore
    } finally {
      setTogglingId(null)
    }
  }

  async function handleRemoveRole(assignment: RoleAssignment) {
    setRemovingId(assignment.id)
    try {
      await fetch(`/api/projects/${id}/roles`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: assignment.user_id, role: assignment.role }),
      })
      setRoles((prev) => prev.filter((r) => r.id !== assignment.id))
    } catch {
      // silently ignore
    } finally {
      setRemovingId(null)
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading team...</div>
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

  return (
    <div className="space-y-6">
      <div>
        <Link href="/projects" className="text-sm text-gray-500 hover:text-gray-700">
          &larr; Projects
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">{project.name}</h1>
      </div>

      <ProjectSubNav projectId={id} projectName={project.name} isAdmin={true} />

      <div className="bg-white border border-gray-200 rounded-lg max-w-2xl">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Role Assignments</h2>
        </div>

        {/* Add role form */}
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Add Role</h3>
          {addUserId && roles.some((r) => r.user_id === addUserId) && (
            <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-sm text-amber-700">
                This user already has{' '}
                {roles
                  .filter((r) => r.user_id === addUserId)
                  .map((r) => ROLE_LABELS[r.role as Role] ?? r.role)
                  .join(', ')}{' '}
                in this project. You can still add another role.
              </p>
            </div>
          )}
          {addRoleError && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{addRoleError}</p>
            </div>
          )}
          <form onSubmit={handleAddRole} className="flex flex-wrap gap-3">
            <select
              value={addUserId}
              onChange={(e) => setAddUserId(e.target.value)}
              className="flex-1 min-w-[160px] px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select user...</option>
              {orgUsers.filter((u) => u.is_active !== false).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} {u.email ? `(${u.email})` : ''}
                </option>
              ))}
            </select>
            <select
              value={addRole}
              onChange={(e) => setAddRole(e.target.value as Role)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {VALID_ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
            <select
              value={addCompanyId}
              onChange={(e) => setAddCompanyId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No company</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={addingRole || !addUserId}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addingRole ? 'Adding...' : 'Add'}
            </button>
          </form>
        </div>

        {/* Current roles list */}
        {roles.length === 0 ? (
          <div className="px-5 py-6 text-center text-gray-500 text-sm">
            No role assignments yet.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {roles.map((assignment) => (
              <li key={assignment.id} className={`px-5 py-3 flex items-center justify-between ${!assignment.is_active ? 'opacity-50' : ''}`}>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {assignment.user_profiles?.name ?? 'Unknown User'}
                  </p>
                  <p className="text-xs text-gray-500">{assignment.user_profiles?.email ?? ''}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                    {ROLE_LABELS[assignment.role as Role] ?? assignment.role}
                  </span>
                  {assignment.project_companies?.name && (
                    <span className="text-xs text-gray-500">
                      {assignment.project_companies.name}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleToggleActive(assignment)}
                    disabled={togglingId === assignment.id}
                    className={`text-xs px-2 py-0.5 rounded ${
                      assignment.is_active
                        ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                        : 'text-green-700 bg-green-50 hover:bg-green-100'
                    } disabled:opacity-50`}
                  >
                    {togglingId === assignment.id
                      ? '...'
                      : assignment.is_active
                        ? 'Disable'
                        : 'Enable'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveRole(assignment)}
                    disabled={removingId === assignment.id}
                    className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                  >
                    {removingId === assignment.id ? 'Removing...' : 'Remove'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

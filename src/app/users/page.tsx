'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/input'
import { TableSkeleton } from '@/components/ui/skeleton'

const ROLES = ['applicant', 'verifier', 'approver', 'admin'] as const
type Role = typeof ROLES[number]

interface ProjectRole {
  id: string
  role: Role
  project_id: string
  projects: { id: string; name: string }
}

interface UserProfile {
  id: string
  name: string
  email: string | null
  phone: string | null
  organization_id: string | null
  created_at: string
  user_project_roles: ProjectRole[]
}

interface Project {
  id: string
  name: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [accessDenied, setAccessDenied] = useState(false)
  const { toast } = useToast()

  const [addingRole, setAddingRole] = useState<{ userId: string; projectId: string; role: Role } | null>(null)

  async function load() {
    setLoading(true)
    setFetchError(null)
    try {
      const [usersRes, projectsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/projects'),
      ])
      const usersJson = await usersRes.json()
      const projectsJson = await projectsRes.json()

      if (usersRes.status === 403) {
        setAccessDenied(true)
      } else if (!usersRes.ok) {
        setFetchError(usersJson.error ?? 'Failed to load users')
      } else {
        setUsers(usersJson.data?.users ?? [])
        setIsAdmin(usersJson.data?.isAdmin ?? false)
      }

      if (projectsRes.ok) {
        setProjects(projectsJson.data ?? [])
      }
    } catch {
      setFetchError('Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleAddRole(userId: string) {
    if (!addingRole || addingRole.userId !== userId) return
    const res = await fetch(`/api/projects/${addingRole.projectId}/roles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, role: addingRole.role }),
    })
    if (!res.ok) {
      const json = await res.json()
      toast(json.error ?? 'Failed to assign role', 'error')
      return
    }
    toast('Role assigned successfully.', 'success')
    setAddingRole(null)
    await load()
  }

  async function handleRemoveRole(projectId: string, userId: string, role: Role) {
    const res = await fetch(`/api/projects/${projectId}/roles`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, role }),
    })
    if (res.ok) {
      toast('Role removed.', 'success')
      await load()
    }
  }

  if (loading) return <TableSkeleton rows={4} />

  if (accessDenied) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 font-medium">Access denied</p>
        <p className="text-gray-500 text-sm mt-2">You need admin access to view this page.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        {isAdmin && (
          <Link href="/users/invite">
            <Button>+ Invite User</Button>
          </Link>
        )}
      </div>

      {fetchError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{fetchError}</p>
        </div>
      )}

      {users.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No users found.</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
          {users.map(u => (
            <div key={u.id} className="px-5 py-4 space-y-3">
              <div>
                <p className="font-medium text-gray-900">{u.name}</p>
                <p className="text-sm text-gray-500">{u.email}</p>
                {u.phone && <p className="text-sm text-gray-500">{u.phone}</p>}
              </div>

              {/* Roles */}
              <div className="flex flex-wrap gap-2">
                {u.user_project_roles.map(r => (
                  <span
                    key={r.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full"
                  >
                    <span className="font-medium">{r.projects?.name}</span>
                    <span className="text-gray-400">&middot;</span>
                    <span>{r.role}</span>
                    {isAdmin && (
                      <button
                        onClick={() => handleRemoveRole(r.project_id, u.id, r.role)}
                        className="ml-1 text-gray-400 hover:text-red-500"
                        aria-label="Remove role"
                      >
                        &times;
                      </button>
                    )}
                  </span>
                ))}
              </div>

              {/* Add role form (admin only) */}
              {isAdmin && (
                <div>
                  {addingRole?.userId === u.id ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Select
                        value={addingRole.projectId}
                        onChange={e => setAddingRole({ ...addingRole, projectId: e.target.value })}
                        className="text-sm"
                      >
                        <option value="">Project...</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </Select>
                      <Select
                        value={addingRole.role}
                        onChange={e => setAddingRole({ ...addingRole, role: e.target.value as Role })}
                        className="text-sm"
                      >
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </Select>
                      <Button
                        size="sm"
                        onClick={() => handleAddRole(u.id)}
                        disabled={!addingRole.projectId}
                      >
                        Assign
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAddingRole(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingRole({ userId: u.id, projectId: '', role: 'applicant' })}
                      className="text-xs text-primary-600 hover:underline"
                    >
                      + Add role
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

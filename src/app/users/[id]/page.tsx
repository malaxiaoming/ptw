'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { DetailSkeleton } from '@/components/ui/skeleton'

interface ProjectRole {
  id: string
  role: string
  is_active: boolean
  project_id: string
  projects: { id: string; name: string } | null
}

interface UserDetail {
  id: string
  name: string
  email: string | null
  phone: string | null
  organization_id: string | null
  is_admin: boolean
  is_active: boolean
  created_at: string
  user_project_roles: ProjectRole[]
}

const ROLE_COLORS: Record<string, string> = {
  applicant: 'bg-blue-100 text-blue-700',
  verifier: 'bg-indigo-100 text-indigo-700',
  approver: 'bg-green-100 text-green-700',
  admin: 'bg-purple-100 text-purple-700',
}

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const [user, setUser] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [toggling, setToggling] = useState(false)
  const { toast } = useToast()

  async function load() {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch(`/api/users/${id}`)
      const json = await res.json()
      if (!res.ok) {
        setFetchError(json.error ?? 'Failed to load user')
        return
      }
      setUser(json.data)
    } catch {
      setFetchError('Failed to load user')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  async function handleToggleActive() {
    if (!user) return
    setToggling(true)
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, is_active: !user.is_active }),
      })
      if (!res.ok) {
        const json = await res.json()
        toast(json.error ?? 'Failed to toggle user status', 'error')
        return
      }
      toast(user.is_active ? 'User disabled.' : 'User enabled.', 'success')
      await load()
    } catch {
      toast('Failed to toggle user status', 'error')
    } finally {
      setToggling(false)
    }
  }

  if (loading) return <DetailSkeleton />

  if (fetchError) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{fetchError}</p>
        <Link href="/users" className="text-sm text-blue-600 hover:underline mt-2 block">
          Back to Users
        </Link>
      </div>
    )
  }

  if (!user) return null

  const activeRoles = user.user_project_roles.filter((r) => r.is_active)
  const inactiveRoles = user.user_project_roles.filter((r) => !r.is_active)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <Link href="/users" className="text-sm text-gray-500 hover:text-gray-700">
          &larr; Users
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
          {user.is_active === false && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
              Disabled
            </span>
          )}
          {user.is_admin && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
              Admin
            </span>
          )}
        </div>
      </div>

      {/* Profile Info */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-3">
        <h2 className="text-base font-semibold text-gray-900">Profile</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {user.email && (
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="text-gray-900 mt-0.5">{user.email}</p>
            </div>
          )}
          {user.phone && (
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="text-gray-900 mt-0.5">{user.phone}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-gray-500">Member Since</p>
            <p className="text-gray-900 mt-0.5">{new Date(user.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      {!user.is_admin && (
        <div className="flex gap-2">
          <Button
            variant={user.is_active ? 'outline' : 'primary'}
            size="sm"
            onClick={handleToggleActive}
            disabled={toggling}
          >
            {toggling ? '...' : user.is_active ? 'Disable User' : 'Enable User'}
          </Button>
        </div>
      )}

      {/* Project Roles */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Project Roles</h2>
        </div>
        {user.user_project_roles.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-500 text-sm">
            No project roles assigned.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {activeRoles.map((r) => (
              <li key={r.id} className="px-5 py-3 flex items-center justify-between">
                <Link
                  href={`/projects/${r.project_id}`}
                  className="text-sm font-medium text-primary-600 hover:underline"
                >
                  {r.projects?.name ?? 'Unknown Project'}
                </Link>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[r.role] ?? 'bg-gray-100 text-gray-600'}`}>
                  {r.role}
                </span>
              </li>
            ))}
            {inactiveRoles.map((r) => (
              <li key={r.id} className="px-5 py-3 flex items-center justify-between opacity-50">
                <Link
                  href={`/projects/${r.project_id}`}
                  className="text-sm font-medium text-gray-500 hover:underline"
                >
                  {r.projects?.name ?? 'Unknown Project'}
                </Link>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[r.role] ?? 'bg-gray-100 text-gray-600'}`}>
                    {r.role}
                  </span>
                  <span className="text-xs text-red-500">disabled</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

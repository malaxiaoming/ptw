'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface UserProfile {
  id: string
  name: string
  email: string | null
  organization_id: string | null
}

interface RoleAssignment {
  id: string
  user_id: string
  role: string
  is_active: boolean
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

export default function ProjectSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [project, setProject] = useState<Project | null>(null)
  const [roles, setRoles] = useState<RoleAssignment[]>([])
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Edit project form
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editRefNumber, setEditRefNumber] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editPostalCode, setEditPostalCode] = useState('')
  const [editStatus, setEditStatus] = useState<'active' | 'archived'>('active')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Add role form
  const [addUserId, setAddUserId] = useState('')
  const [addRole, setAddRole] = useState<Role>('applicant')
  const [addingRole, setAddingRole] = useState(false)
  const [addRoleError, setAddRoleError] = useState<string | null>(null)

  // Remove role state
  const [removingId, setRemovingId] = useState<string | null>(null)

  // Toggle active state
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // Delete project state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setFetchError(null)
      try {
        const [projectRes, rolesRes, usersRes] = await Promise.all([
          fetch(`/api/projects/${id}`),
          fetch(`/api/projects/${id}/roles`),
          fetch('/api/users'),
        ])
        const projectJson = await projectRes.json()
        const rolesJson = await rolesRes.json()
        const usersJson = await usersRes.json()

        if (!projectRes.ok) {
          setFetchError(projectJson.error ?? 'Failed to load project')
          return
        }

        const p = projectJson.data as Project
        setProject(p)
        setEditName(p.name)
        setEditDescription(p.description ?? '')
        setEditRefNumber(p.reference_number ?? '')
        setEditAddress(p.address ?? '')
        setEditPostalCode(p.postal_code ?? '')
        setEditStatus(p.status)
        setRoles(rolesJson.data ?? [])
        setOrgUsers(usersJson.data?.users ?? [])
      } catch {
        setFetchError('Failed to load settings')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  async function handleSaveProject(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() || null,
          reference_number: editRefNumber.trim() || null,
          address: editAddress.trim() || null,
          postal_code: editPostalCode.trim() || null,
          status: editStatus,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setSaveError(json.error ?? 'Failed to save')
      } else {
        setProject(json.data)
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      }
    } catch {
      setSaveError('Failed to save project')
    } finally {
      setSaving(false)
    }
  }

  async function handleAddRole(e: React.FormEvent) {
    e.preventDefault()
    if (!addUserId) return

    setAddingRole(true)
    setAddRoleError(null)
    try {
      const res = await fetch(`/api/projects/${id}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: addUserId, role: addRole }),
      })
      const json = await res.json()
      if (!res.ok) {
        setAddRoleError(json.error ?? 'Failed to add role')
      } else {
        // Reload roles
        const rolesRes = await fetch(`/api/projects/${id}/roles`)
        const rolesJson = await rolesRes.json()
        setRoles(rolesJson.data ?? [])
        setAddUserId('')
        setAddRole('applicant')
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

  async function handleDeleteProject() {
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) {
        setDeleteError(json.error ?? 'Failed to delete project')
      } else {
        router.push('/projects')
      }
    } catch {
      setDeleteError('Failed to delete project')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading settings...</div>
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
    <div className="space-y-8 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href={`/projects/${id}`} className="text-sm text-gray-500 hover:text-gray-700">
          &larr; {project.name}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Project Settings</h1>
      </div>

      {/* Edit project details */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Project Details</h2>
        {saveError && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{saveError}</p>
          </div>
        )}
        {saveSuccess && (
          <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-700">Project saved successfully.</p>
          </div>
        )}
        <form onSubmit={handleSaveProject} className="space-y-4">
          <div>
            <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 mb-1">
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              id="edit-name"
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="edit-description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="edit-ref" className="block text-sm font-medium text-gray-700 mb-1">
              Reference Number
            </label>
            <input
              id="edit-ref"
              type="text"
              value={editRefNumber}
              onChange={(e) => setEditRefNumber(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="edit-address" className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <input
              id="edit-address"
              type="text"
              value={editAddress}
              onChange={(e) => setEditAddress(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="edit-postal" className="block text-sm font-medium text-gray-700 mb-1">
              Postal Code
            </label>
            <input
              id="edit-postal"
              type="text"
              value={editPostalCode}
              onChange={(e) => setEditPostalCode(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="edit-status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="edit-status"
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as 'active' | 'archived')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={saving || !editName.trim()}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Role management */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Role Assignments</h2>
        </div>

        {/* Add role form */}
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Add Role</h3>
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

      {/* Danger Zone */}
      <div className="border border-red-300 rounded-lg">
        <div className="px-5 py-4 border-b border-red-200 bg-red-50 rounded-t-lg">
          <h2 className="text-base font-semibold text-red-900">Danger Zone</h2>
        </div>
        <div className="px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Delete this project</p>
            <p className="text-sm text-gray-500">Once you delete a project, there is no going back.</p>
          </div>
          <button
            type="button"
            onClick={() => { setShowDeleteModal(true); setDeleteConfirmText(''); setDeleteError(null) }}
            className="px-4 py-2 border border-red-600 text-red-600 text-sm font-medium rounded-md hover:bg-red-50"
          >
            Delete project
          </button>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete project</h3>
            <p className="text-sm text-gray-600 mb-4">
              This action <strong>cannot be undone</strong>. This will permanently delete the project{' '}
              <strong>{project.name}</strong> and all its role assignments.
            </p>
            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{deleteError}</p>
              </div>
            )}
            <label className="block text-sm text-gray-700 mb-2">
              Please type <strong>{project.name}</strong> to confirm
            </label>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
              placeholder="Project name"
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteProject}
                disabled={deleteConfirmText !== project.name || deleting}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? 'Deleting...' : 'Delete this project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

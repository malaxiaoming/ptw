'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ProjectSubNav from '@/components/projects/project-sub-nav'

interface Project {
  id: string
  name: string
  description: string | null
  reference_number: string | null
  address: string | null
  postal_code: string | null
  status: 'active' | 'archived'
}

export default function ProjectSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [project, setProject] = useState<Project | null>(null)
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
        const projectRes = await fetch(`/api/projects/${id}`)
        const projectJson = await projectRes.json()

        if (!projectRes.ok) {
          setFetchError(projectJson.error ?? 'Failed to load project')
          return
        }

        // Verify admin access
        const rolesRes = await fetch(`/api/projects/${id}/roles`)
        if (!rolesRes.ok) {
          setFetchError('Access denied')
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
    <div className="space-y-8">
      <div>
        <Link href="/projects" className="text-sm text-gray-500 hover:text-gray-700">
          &larr; Projects
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">{project.name}</h1>
      </div>

      <ProjectSubNav projectId={id} projectName={project.name} isAdmin={true} />

      {/* Edit project details */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 max-w-2xl">
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

      {/* Danger Zone */}
      <div className="border border-red-300 rounded-lg max-w-2xl">
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

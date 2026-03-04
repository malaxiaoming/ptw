'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Project {
  id: string
  name: string
  location: string | null
  status: 'active' | 'archived'
  created_at: string
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [accessDenied, setAccessDenied] = useState(false)

  // Create project form state
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  useEffect(() => {
    loadProjects()
  }, [])

  async function loadProjects() {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch('/api/projects')
      const json = await res.json()
      if (res.status === 403) {
        setAccessDenied(true)
      } else if (!res.ok) {
        setFetchError(json.error ?? 'Failed to load projects')
      } else {
        setProjects(json.data ?? [])
      }
    } catch {
      setFetchError('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return

    setCreating(true)
    setCreateError(null)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), location: newLocation.trim() || undefined }),
      })
      const json = await res.json()
      if (!res.ok) {
        setCreateError(json.error ?? 'Failed to create project')
      } else {
        setProjects((prev) => [...prev, json.data])
        setNewName('')
        setNewLocation('')
        setShowCreateForm(false)
      }
    } catch {
      setCreateError('Failed to create project')
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-500">Loading projects...</div>
    )
  }

  if (accessDenied) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 font-medium">Access denied</p>
        <p className="text-gray-500 text-sm mt-2">You need admin access to view this page.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        <button
          type="button"
          onClick={() => { setShowCreateForm((v) => !v); setCreateError(null) }}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          + Create Project
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">New Project</h2>
          {createError && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{createError}</p>
            </div>
          )}
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label htmlFor="project-name" className="block text-sm font-medium text-gray-700 mb-1">
                Project Name <span className="text-red-500">*</span>
              </label>
              <input
                id="project-name"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Marina Bay Development"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label htmlFor="project-location" className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                id="project-location"
                type="text"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="e.g. 1 Marina Boulevard, Singapore"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={creating || !newName.trim()}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => { setShowCreateForm(false); setCreateError(null); setNewName(''); setNewLocation('') }}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {fetchError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{fetchError}</p>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No projects found. Create one to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{project.name}</p>
                  {project.location && (
                    <p className="text-sm text-gray-500 mt-0.5 truncate">{project.location}</p>
                  )}
                </div>
                <span
                  className={`ml-4 flex-shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    project.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {project.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

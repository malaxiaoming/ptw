'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'

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
  location: string | null
  status: 'active' | 'archived'
  created_at: string
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
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setFetchError(null)
      try {
        const [projectRes, rolesRes] = await Promise.all([
          fetch(`/api/projects/${id}`),
          fetch(`/api/projects/${id}/roles`),
        ])
        const projectJson = await projectRes.json()
        const rolesJson = await rolesRes.json()

        if (!projectRes.ok) {
          setFetchError(projectJson.error ?? 'Failed to load project')
        } else {
          setProject(projectJson.data)
          setRoles(rolesJson.data ?? [])
        }
      } catch {
        setFetchError('Failed to load project')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/projects" className="text-sm text-gray-500 hover:text-gray-700">
            &larr; Projects
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              project.status === 'active'
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {project.status}
          </span>
        </div>
        <Link
          href={`/projects/${id}/settings`}
          className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition-colors"
        >
          Settings
        </Link>
      </div>

      {project.location && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">Location</p>
          <p className="text-gray-900 mt-0.5">{project.location}</p>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Team Members</h2>
        </div>
        {roles.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-500 text-sm">
            No users assigned to this project yet.{' '}
            <Link href={`/projects/${id}/settings`} className="text-blue-600 hover:underline">
              Add users in Settings.
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
    </div>
  )
}

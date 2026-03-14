'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Project {
  id: string
  name: string
}

export default function InviteUserPage() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [projectId, setProjectId] = useState('')
  const [role, setRole] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null)
  const [assignedProject, setAssignedProject] = useState<{ name: string; role: string } | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    // Check admin status
    fetch('/api/profile')
      .then((res) => res.json())
      .then((json) => {
        setIsAdmin(json.data?.is_admin === true)
      })
      .catch(() => setIsAdmin(false))

    fetch('/api/projects')
      .then((res) => res.json())
      .then((json) => {
        if (json.data) setProjects(json.data)
      })
      .catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !name.trim()) return

    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          phone: phone.trim() || undefined,
          project_id: projectId || undefined,
          role: role || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setSubmitError(json.error ?? 'Failed to invite user')
      } else {
        setInvitedEmail(email.trim())
        if (projectId && role) {
          const proj = projects.find((p) => p.id === projectId)
          setAssignedProject({ name: proj?.name ?? 'Unknown', role })
        }
      }
    } catch {
      setSubmitError('Failed to invite user')
    } finally {
      setSubmitting(false)
    }
  }

  if (isAdmin === null) {
    return <p className="text-gray-500 text-sm mt-8 text-center">Loading...</p>
  }

  if (isAdmin === false) {
    return (
      <div className="max-w-md mx-auto mt-12 bg-white border border-gray-200 rounded-lg p-8 text-center">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-sm text-gray-600 mb-4">Only organisation administrators can invite users.</p>
        <Link
          href="/users"
          className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 inline-block"
        >
          Back to Users
        </Link>
      </div>
    )
  }

  if (invitedEmail) {
    return (
      <div className="max-w-md mx-auto mt-12 bg-white border border-gray-200 rounded-lg p-8 text-center">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Invitation Sent</h2>
        <p className="text-sm text-gray-600 mb-1">
          An invitation email has been sent to:
        </p>
        <p className="font-medium text-gray-900 mb-4">{invitedEmail}</p>
        {assignedProject && (
          <p className="text-sm text-gray-600 mb-4">
            User has been assigned as <span className="font-semibold">{assignedProject.role}</span> on <span className="font-semibold">{assignedProject.name}</span>.
          </p>
        )}
        <p className="text-sm text-gray-500 mb-6">
          The user will receive a link to set up their password and access the system.
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              setInvitedEmail(null)
              setAssignedProject(null)
              setEmail('')
              setName('')
              setPhone('')
              setProjectId('')
              setRole('')
            }}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
          >
            Invite Another User
          </button>
          <Link
            href="/users"
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 text-center"
          >
            Back to Users
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/users" className="text-sm text-gray-500 hover:text-gray-700">
          &larr; Users
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Invite User</h1>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        {submitError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{submitError}</p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label htmlFor="invite-name" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              id="invite-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Smith"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label htmlFor="invite-phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              id="invite-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+65 9123 4567"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Project Assignment (optional) */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Project Assignment (optional)</p>
            <div className="space-y-3">
              <div>
                <label htmlFor="invite-project" className="block text-sm font-medium text-gray-700 mb-1">
                  Project
                </label>
                <select
                  id="invite-project"
                  value={projectId}
                  onChange={(e) => {
                    setProjectId(e.target.value)
                    if (!e.target.value) setRole('')
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No project assignment</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              {projectId && (
                <div>
                  <label htmlFor="invite-role" className="block text-sm font-medium text-gray-700 mb-1">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="invite-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select a role</option>
                    <option value="applicant">Applicant</option>
                    <option value="verifier">Verifier</option>
                    <option value="approver">Approver</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !email.trim() || !name.trim() || (!!projectId && !role)}
            className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Sending Invitation...' : 'Send Invitation'}
          </button>
        </form>
      </div>
    </div>
  )
}

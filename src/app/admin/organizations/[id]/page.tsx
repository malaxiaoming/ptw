'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, UserPlus, Pencil, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface OrgDetail {
  id: string
  name: string
  created_at: string
  users: {
    id: string
    name: string
    email: string
    is_admin: boolean
    system_role: string | null
    is_active: boolean
    created_at: string
  }[]
  projects: {
    id: string
    name: string
    created_at: string
  }[]
}

export default function OrgDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [org, setOrg] = useState<OrgDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)

  const [showInvite, setShowInvite] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)

  const fetchOrg = useCallback(async () => {
    const res = await fetch(`/api/admin/organizations/${id}`)
    const json = await res.json()
    if (!res.ok) {
      setError(json.error || 'Failed to load organization')
      setLoading(false)
      return
    }
    setOrg(json.data)
    setEditName(json.data.name)
    setLoading(false)
  }, [id])

  useEffect(() => {
    fetchOrg()
  }, [fetchOrg])

  async function handleSaveName() {
    if (!editName.trim()) return
    setSaving(true)
    const res = await fetch(`/api/admin/organizations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim() }),
    })
    if (res.ok) {
      setEditing(false)
      fetchOrg()
    }
    setSaving(false)
  }

  async function handleInvite(formData: FormData) {
    setInviting(true)
    setInviteError(null)
    setInviteSuccess(null)

    const email = formData.get('email') as string
    const name = formData.get('name') as string

    if (!email || !name) {
      setInviteError('Email and name are required')
      setInviting(false)
      return
    }

    const res = await fetch(`/api/admin/organizations/${id}/invite-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name }),
    })
    const json = await res.json()
    if (!res.ok) {
      setInviteError(json.error || 'Failed to invite admin')
      setInviting(false)
      return
    }

    setInviteSuccess(`Invitation sent to ${email}`)
    setShowInvite(false)
    setInviting(false)
    fetchOrg()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error || !org) {
    return (
      <div className="p-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">{error ?? 'Not found'}</div>
      </div>
    )
  }

  const admins = org.users.filter((u) => u.is_admin)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <button onClick={() => router.push('/admin/organizations')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="h-4 w-4" />
        Back to Organizations
      </button>

      {/* Org name */}
      <div className="flex items-center gap-3 mb-6">
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="text-2xl font-bold text-gray-900 border-b-2 border-primary-500 outline-none bg-transparent"
            />
            <button onClick={handleSaveName} disabled={saving} className="text-green-600 hover:text-green-700">
              <Check className="h-5 w-5" />
            </button>
            <button onClick={() => { setEditing(false); setEditName(org.name) }} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900">{org.name}</h1>
            <button onClick={() => setEditing(true)} className="text-gray-400 hover:text-gray-600">
              <Pencil className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {/* Org Admins */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Org Admins ({admins.length})</h2>
          <Button size="sm" onClick={() => setShowInvite(!showInvite)}>
            <UserPlus className="h-4 w-4 mr-1" />
            Invite Org Admin
          </Button>
        </div>

        {showInvite && (
          <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <form action={handleInvite} className="flex items-end gap-3">
              <div className="flex-1">
                <Input name="name" label="Full Name" required placeholder="John Doe" />
              </div>
              <div className="flex-1">
                <Input name="email" label="Email" type="email" required placeholder="email@example.com" />
              </div>
              <Button type="submit" loading={inviting}>Send Invite</Button>
              <Button type="button" variant="secondary" onClick={() => setShowInvite(false)}>Cancel</Button>
            </form>
            {inviteError && <p className="mt-2 text-sm text-red-600">{inviteError}</p>}
          </div>
        )}

        {inviteSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">{inviteSuccess}</div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((u) => (
                <tr key={u.id} className="border-b border-gray-100">
                  <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
              {admins.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-500">No admins yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Projects */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Projects ({org.projects.length})</h2>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Project</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Created</th>
              </tr>
            </thead>
            <tbody>
              {org.projects.map((p) => (
                <tr key={p.id} className="border-b border-gray-100">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {org.projects.length === 0 && (
                <tr><td colSpan={2} className="px-4 py-6 text-center text-gray-500">No projects yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

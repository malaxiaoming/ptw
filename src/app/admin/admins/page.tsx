'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, UserPlus, Shield, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface AdminUser {
  id: string
  name: string
  email: string
  is_admin: boolean
  system_role: 'super_admin' | 'regional_admin' | null
  is_active: boolean
  organization_id: string | null
  organization_name: string | null
  created_at: string
}

interface Organization {
  id: string
  name: string
}

export default function AdminUsersPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showInvite, setShowInvite] = useState(false)
  const [inviteRole, setInviteRole] = useState<'regional_admin' | 'org_admin'>('org_admin')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)

  // Detect if current user is super admin (has system_role users in list or can see regional admins)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  const fetchAdmins = useCallback(async () => {
    const res = await fetch('/api/admin/admins')
    const json = await res.json()
    if (!res.ok) {
      setError(json.error || 'Failed to load admins')
      setLoading(false)
      return
    }
    setAdmins(json.data)
    // If we see any system_role users, current user is likely super admin
    const hasSystemRoles = json.data.some((a: AdminUser) => a.system_role)
    setIsSuperAdmin(hasSystemRoles)
    setLoading(false)
  }, [])

  const fetchOrgs = useCallback(async () => {
    const res = await fetch('/api/admin/organizations')
    if (res.ok) {
      const json = await res.json()
      setOrgs(json.data.map((o: { id: string; name: string }) => ({ id: o.id, name: o.name })))
    }
  }, [])

  useEffect(() => {
    fetchAdmins()
    fetchOrgs()
  }, [fetchAdmins, fetchOrgs])

  async function handleInvite(formData: FormData) {
    setInviting(true)
    setInviteError(null)
    setInviteSuccess(null)

    const email = formData.get('email') as string
    const name = formData.get('name') as string
    const orgId = formData.get('organization_id') as string

    if (!email || !name) {
      setInviteError('Email and name are required')
      setInviting(false)
      return
    }

    if (inviteRole === 'org_admin' && !orgId) {
      setInviteError('Organization is required for Org Admin')
      setInviting(false)
      return
    }

    const body: Record<string, string> = { email, name, role: inviteRole }
    if (inviteRole === 'org_admin') body.organization_id = orgId

    const res = await fetch('/api/admin/admins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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
    fetchAdmins()
  }

  function getRoleBadge(admin: AdminUser) {
    if (admin.system_role === 'super_admin') {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700"><Shield className="h-3 w-3" />Super</span>
    }
    if (admin.system_role === 'regional_admin') {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700"><Shield className="h-3 w-3" />Regional</span>
    }
    if (admin.is_admin) {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700"><Building2 className="h-3 w-3" />Org Admin</span>
    }
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">{error}</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Users</h1>
          <p className="text-sm text-gray-500 mt-1">{admins.length} admin{admins.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setShowInvite(!showInvite)}>
          <UserPlus className="h-4 w-4 mr-1" />
          Invite Admin
        </Button>
      </div>

      {showInvite && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex gap-2 mb-4">
            {isSuperAdmin && (
              <button
                onClick={() => setInviteRole('regional_admin')}
                className={`px-3 py-1.5 text-sm rounded-md ${inviteRole === 'regional_admin' ? 'bg-primary-600 text-white' : 'bg-white border border-gray-300 text-gray-700'}`}
              >
                Regional Admin
              </button>
            )}
            <button
              onClick={() => setInviteRole('org_admin')}
              className={`px-3 py-1.5 text-sm rounded-md ${inviteRole === 'org_admin' ? 'bg-primary-600 text-white' : 'bg-white border border-gray-300 text-gray-700'}`}
            >
              Org Admin
            </button>
          </div>

          <form action={handleInvite} className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <Input name="name" label="Full Name" required placeholder="John Doe" />
              </div>
              <div className="flex-1">
                <Input name="email" label="Email" type="email" required placeholder="email@example.com" />
              </div>
            </div>

            {inviteRole === 'org_admin' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
                <select name="organization_id" required className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                  <option value="">Select organization...</option>
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-2">
              <Button type="submit" loading={inviting}>Send Invite</Button>
              <Button type="button" variant="secondary" onClick={() => setShowInvite(false)}>Cancel</Button>
            </div>
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
              <th className="text-left px-4 py-3 font-medium text-gray-500">Role</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Organization</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((admin) => (
              <tr key={admin.id} className="border-b border-gray-100">
                <td className="px-4 py-3 font-medium text-gray-900">{admin.name}</td>
                <td className="px-4 py-3 text-gray-600">{admin.email}</td>
                <td className="px-4 py-3">{getRoleBadge(admin)}</td>
                <td className="px-4 py-3 text-gray-600">{admin.organization_name ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${admin.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {admin.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
            {admins.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No admin users found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

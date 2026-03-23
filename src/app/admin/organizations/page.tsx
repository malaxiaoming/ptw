'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Building2, Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Organization {
  id: string
  name: string
  created_at: string
  user_count: number
  project_count: number
}

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const fetchOrgs = useCallback(async () => {
    const res = await fetch('/api/admin/organizations')
    const json = await res.json()
    if (!res.ok) {
      setError(json.error || 'Failed to load organizations')
      return
    }
    setOrgs(json.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchOrgs()
  }, [fetchOrgs])

  async function handleCreate(formData: FormData) {
    setCreating(true)
    setCreateError(null)
    const name = formData.get('name') as string
    if (!name) {
      setCreateError('Organization name is required')
      setCreating(false)
      return
    }

    const res = await fetch('/api/admin/organizations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const json = await res.json()
    if (!res.ok) {
      setCreateError(json.error || 'Failed to create organization')
      setCreating(false)
      return
    }

    setShowCreate(false)
    setCreating(false)
    fetchOrgs()
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
          <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
          <p className="text-sm text-gray-500 mt-1">{orgs.length} organization{orgs.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          <Plus className="h-4 w-4 mr-1" />
          Create Organization
        </Button>
      </div>

      {showCreate && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <form action={handleCreate} className="flex items-end gap-3">
            <div className="flex-1">
              <Input name="name" label="Organization Name" required placeholder="Company name" />
            </div>
            <Button type="submit" loading={creating}>Create</Button>
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
          </form>
          {createError && (
            <p className="mt-2 text-sm text-red-600">{createError}</p>
          )}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-500">Organization</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Users</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Projects</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Created</th>
            </tr>
          </thead>
          <tbody>
            {orgs.map((org) => (
              <tr key={org.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/admin/organizations/${org.id}`} className="flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    {org.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">{org.user_count}</td>
                <td className="px-4 py-3 text-gray-600">{org.project_count}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(org.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {orgs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">No organizations yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

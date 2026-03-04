'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface UserProfile {
  id: string
  name: string
  email: string | null
  phone: string | null
  organization_id: string | null
  created_at: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [accessDenied, setAccessDenied] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setFetchError(null)
      try {
        const res = await fetch('/api/users')
        const json = await res.json()
        if (res.status === 403) {
          setAccessDenied(true)
        } else if (!res.ok) {
          setFetchError(json.error ?? 'Failed to load users')
        } else {
          setUsers(json.data ?? [])
        }
      } catch {
        setFetchError('Failed to load users')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading users...</div>
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
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <Link
          href="/users/invite"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          + Invite User
        </Link>
      </div>

      {fetchError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{fetchError}</p>
        </div>
      )}

      {users.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No users found.{' '}
          <Link href="/users/invite" className="text-blue-600 hover:underline">
            Invite someone to get started.
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
          {users.map((u) => (
            <div key={u.id} className="px-5 py-4">
              <p className="font-medium text-gray-900">{u.name}</p>
              <p className="text-sm text-gray-500 mt-0.5">{u.email}</p>
              {u.phone && (
                <p className="text-sm text-gray-500">{u.phone}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

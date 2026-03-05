# Settings Page & Users Role Management Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a personal Settings page (name/phone) and enhance the Users page to show project-scoped roles with admin assign/remove capability.

**Architecture:** Two independent tasks. Task 1 adds a `PATCH /api/profile` endpoint + Settings page. Task 2 enhances the Users API to include roles and rewrites the Users page UI to show/manage them.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind v4, Supabase (service role for writes), Vitest

---

### Task 1: Profile Settings Page

**Files:**
- Create: `src/app/api/profile/route.ts`
- Create: `src/app/settings/page.tsx`
- Test: `src/__tests__/api/profile.test.ts`

**Step 1: Write the failing test**

```ts
// src/__tests__/api/profile.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetCurrentUser = vi.fn()
const mockSupabase = { from: vi.fn() }

vi.mock('@/lib/auth/get-user', () => ({ getCurrentUser: mockGetCurrentUser }))
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => mockSupabase),
}))
vi.mock('@/lib/api/response', () => ({
  success: vi.fn((data) => ({ json: () => ({ data }), status: 200 })),
  error: vi.fn((msg, status) => ({ json: () => ({ error: msg }), status })),
}))

import { PATCH } from '@/app/api/profile/route'

describe('PATCH /api/profile', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 if not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null)
    const req = new Request('http://localhost/api/profile', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Alice' }),
    })
    const res = await PATCH(req as any)
    expect(res.status).toBe(401)
  })

  it('updates name and phone', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1', name: 'Old', phone: null })
    const updateMock = { eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'user-1', name: 'Alice', phone: '+6512345678' }, error: null }) }
    mockSupabase.from.mockReturnValue({ update: vi.fn(() => updateMock) })
    const req = new Request('http://localhost/api/profile', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Alice', phone: '+6512345678' }),
    })
    const res = await PATCH(req as any)
    expect(res.status).toBe(200)
  })

  it('rejects empty name', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1', name: 'Old', phone: null })
    const req = new Request('http://localhost/api/profile', {
      method: 'PATCH',
      body: JSON.stringify({ name: '' }),
    })
    const res = await PATCH(req as any)
    expect(res.status).toBe(400)
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/api/profile.test.ts
```
Expected: FAIL — module not found

**Step 3: Create the API route**

```ts
// src/app/api/profile/route.ts
import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { success, error } from '@/lib/api/response'

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return error('Invalid JSON', 400)
  }

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim() === '') {
      return error('name cannot be empty', 400)
    }
  }

  const updates: Record<string, unknown> = {}
  if (body.name !== undefined) updates.name = (body.name as string).trim()
  if (body.phone !== undefined) updates.phone = body.phone || null

  if (Object.keys(updates).length === 0) return error('No fields to update', 400)

  const supabase = await createServerSupabaseClient()
  const { data, error: dbError } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', user.id)
    .select('id, email, phone, name, organization_id, created_at')
    .single()

  if (dbError) return error(dbError.message, 500)
  return success(data)
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/api/profile.test.ts
```
Expected: PASS (3 tests)

**Step 5: Create the Settings page**

```tsx
// src/app/settings/page.tsx
'use client'

import { useState, useEffect } from 'react'

export default function SettingsPage() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(json => {
        setName(json.data?.name ?? '')
        setPhone(json.data?.phone ?? '')
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone }),
    })
    const json = await res.json()
    setSaving(false)
    if (res.ok) {
      setMessage({ type: 'success', text: 'Profile updated.' })
    } else {
      setMessage({ type: 'error', text: json.error ?? 'Failed to save.' })
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Personal Profile</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="text"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+65XXXXXXXX"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {message && (
            <div className={`p-3 rounded-md text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {message.text}
            </div>
          )}
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

**Step 6: Add GET /api/profile to return current user profile**

Add to `src/app/api/profile/route.ts`:

```ts
import { success, error } from '@/lib/api/response'
import { getCurrentUser } from '@/lib/auth/get-user'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)
  return success(user)
}
```

**Step 7: Commit**

```bash
git add src/app/api/profile/route.ts src/app/settings/page.tsx src/__tests__/api/profile.test.ts
git commit -m "feat: add profile settings page and PATCH /api/profile endpoint"
```

---

### Task 2: Enhanced Users Page with Role Management

**Files:**
- Modify: `src/app/api/users/route.ts` — include roles in response
- Modify: `src/app/users/page.tsx` — show roles, add/remove UI for admins

**Step 1: Update the users API to include roles**

In `src/app/api/users/route.ts`, change the select query to include roles:

```ts
const { data, error: dbError } = await supabase
  .from('user_profiles')
  .select(`
    id, email, phone, name, organization_id, created_at,
    user_project_roles(id, role, project_id, projects(id, name))
  `)
  .eq('organization_id', user.organization_id)
  .order('name', { ascending: true })
```

Also add a `isAdmin` flag to the response so the UI knows whether to show role management controls. Add before `return success(data)`:

```ts
return success({ users: data, isAdmin: true })
```

**Step 2: Also add GET /api/projects to the users page data loading**

The users page needs the list of projects to populate the "add role" dropdown. It already hits `GET /api/projects` — reuse that.

**Step 3: Rewrite the Users page**

```tsx
// src/app/users/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const ROLES = ['applicant', 'verifier', 'approver', 'admin'] as const
type Role = typeof ROLES[number]

interface ProjectRole {
  id: string
  role: Role
  project_id: string
  projects: { id: string; name: string }
}

interface UserProfile {
  id: string
  name: string
  email: string | null
  phone: string | null
  organization_id: string | null
  created_at: string
  user_project_roles: ProjectRole[]
}

interface Project {
  id: string
  name: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [accessDenied, setAccessDenied] = useState(false)

  // Per-user add-role form state
  const [addingRole, setAddingRole] = useState<{ userId: string; projectId: string; role: Role } | null>(null)
  const [roleError, setRoleError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setFetchError(null)
    try {
      const [usersRes, projectsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/projects'),
      ])
      const usersJson = await usersRes.json()
      const projectsJson = await projectsRes.json()

      if (usersRes.status === 403) {
        setAccessDenied(true)
      } else if (!usersRes.ok) {
        setFetchError(usersJson.error ?? 'Failed to load users')
      } else {
        setUsers(usersJson.data?.users ?? [])
        setIsAdmin(usersJson.data?.isAdmin ?? false)
      }

      if (projectsRes.ok) {
        setProjects(projectsJson.data ?? [])
      }
    } catch {
      setFetchError('Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleAddRole(userId: string) {
    if (!addingRole || addingRole.userId !== userId) return
    setRoleError(null)
    const res = await fetch(`/api/projects/${addingRole.projectId}/roles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, role: addingRole.role }),
    })
    if (!res.ok) {
      const json = await res.json()
      setRoleError(json.error ?? 'Failed to assign role')
      return
    }
    setAddingRole(null)
    await load()
  }

  async function handleRemoveRole(projectId: string, userId: string, role: Role) {
    const res = await fetch(`/api/projects/${projectId}/roles`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, role }),
    })
    if (res.ok) await load()
  }

  if (loading) return <div className="text-center py-12 text-gray-500">Loading users...</div>

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
        {isAdmin && (
          <Link
            href="/users/invite"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            + Invite User
          </Link>
        )}
      </div>

      {fetchError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{fetchError}</p>
        </div>
      )}

      {users.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No users found.</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
          {users.map(u => (
            <div key={u.id} className="px-5 py-4 space-y-3">
              <div>
                <p className="font-medium text-gray-900">{u.name}</p>
                <p className="text-sm text-gray-500">{u.email}</p>
                {u.phone && <p className="text-sm text-gray-500">{u.phone}</p>}
              </div>

              {/* Roles */}
              <div className="flex flex-wrap gap-2">
                {u.user_project_roles.map(r => (
                  <span
                    key={r.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full"
                  >
                    <span className="font-medium">{r.projects?.name}</span>
                    <span className="text-gray-400">·</span>
                    <span>{r.role}</span>
                    {isAdmin && (
                      <button
                        onClick={() => handleRemoveRole(r.project_id, u.id, r.role)}
                        className="ml-1 text-gray-400 hover:text-red-500"
                        aria-label="Remove role"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>

              {/* Add role form (admin only) */}
              {isAdmin && (
                <div>
                  {addingRole?.userId === u.id ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={addingRole.projectId}
                        onChange={e => setAddingRole({ ...addingRole, projectId: e.target.value })}
                        className="text-sm border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="">Project...</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <select
                        value={addingRole.role}
                        onChange={e => setAddingRole({ ...addingRole, role: e.target.value as Role })}
                        className="text-sm border border-gray-300 rounded px-2 py-1"
                      >
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <button
                        onClick={() => handleAddRole(u.id)}
                        disabled={!addingRole.projectId}
                        className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        Assign
                      </button>
                      <button
                        onClick={() => { setAddingRole(null); setRoleError(null) }}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                      {roleError && <p className="text-xs text-red-600">{roleError}</p>}
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingRole({ userId: u.id, projectId: '', role: 'applicant' })}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      + Add role
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 4: Commit**

```bash
git add src/app/api/users/route.ts src/app/users/page.tsx
git commit -m "feat: show project roles on users page with admin assign/remove"
```

---

### Task 3: Remove debug logging

**Files:**
- Modify: `src/app/api/users/route.ts`

Remove the `console.log` lines added for debugging:

```bash
git add src/app/api/users/route.ts
git commit -m "chore: remove debug logging from users API"
```

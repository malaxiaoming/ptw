'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface ProjectRole {
  role: string
  is_active: boolean
  projects: { id: string; name: string }
}

export default function SettingsPage() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [orgName, setOrgName] = useState('')
  const [projectRoles, setProjectRoles] = useState<ProjectRole[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingOrg, setSavingOrg] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    Promise.all([
      fetch('/api/profile').then(r => r.json()),
      fetch('/api/organizations').then(r => r.json()),
    ])
      .then(([profileJson, orgJson]) => {
        setName(profileJson.data?.name ?? '')
        setPhone(profileJson.data?.phone ?? '')
        setIsAdmin(profileJson.data?.is_admin ?? false)
        setProjectRoles(profileJson.data?.project_roles ?? [])
        setOrgName(orgJson.data?.name ?? '')
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone }),
    })
    const json = await res.json()
    setSaving(false)
    if (res.ok) {
      toast('Profile updated.', 'success')
    } else {
      toast(json.error ?? 'Failed to save.', 'error')
    }
  }

  async function handleOrgSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSavingOrg(true)
    const res = await fetch('/api/organizations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: orgName }),
    })
    const json = await res.json()
    setSavingOrg(false)
    if (res.ok) {
      toast('Organization updated.', 'success')
      router.refresh()
    } else {
      toast(json.error ?? 'Failed to save.', 'error')
    }
  }

  if (loading) {
    return (
      <div className="max-w-lg space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-32" />
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      <Card>
        <CardContent>
          <h2 className="text-base font-semibold text-gray-900 mb-4">Personal Profile</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Name"
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <Input
              label="Phone"
              type="text"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+65XXXXXXXX"
            />
            <Button type="submit" loading={saving}>
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <h2 className="text-base font-semibold text-gray-900 mb-4">Organization</h2>
          <form onSubmit={handleOrgSubmit} className="space-y-4">
            <Input
              label="Organization Name"
              type="text"
              required
              value={orgName}
              onChange={e => setOrgName(e.target.value)}
              disabled={!isAdmin}
            />
            {isAdmin && (
              <Button type="submit" loading={savingOrg}>
                Save Changes
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
      {projectRoles.length > 0 && (
        <Card>
          <CardContent>
            <h2 className="text-base font-semibold text-gray-900 mb-4">My Project Roles</h2>
            <div className="space-y-2">
              {projectRoles.map((r, i) => (
                <div key={i} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md">
                  <span className="text-sm font-medium text-gray-900">{r.projects?.name}</span>
                  <span className="text-xs px-2 py-0.5 bg-primary-50 text-primary-700 rounded-full">{r.role}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

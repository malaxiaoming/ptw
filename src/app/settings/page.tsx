'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function SettingsPage() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

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
    </div>
  )
}

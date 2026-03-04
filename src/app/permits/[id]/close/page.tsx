'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Permit {
  id: string
  permit_number: string
  status: string
  applicant_id: string
  work_location: string
  permit_types?: { name: string } | null
}

export default function ClosePermitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [permit, setPermit] = useState<Permit | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [comments, setComments] = useState('')

  const loadPermit = useCallback(async () => {
    try {
      const supabase = createClient()
      const [res, { data: { user } }] = await Promise.all([
        fetch(`/api/permits/${id}`),
        supabase.auth.getUser(),
      ])
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed to load permit')
        return
      }
      setPermit(json.data)
      setCurrentUserId(user?.id ?? null)
    } catch {
      setError('Failed to load permit')
    }
  }, [id])

  useEffect(() => {
    setLoading(true)
    loadPermit().finally(() => setLoading(false))
  }, [loadPermit])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/permits/${id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_closure',
          comments: comments.trim() || undefined,
        }),
      })

      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed to submit closure')
        return
      }

      router.push(`/permits/${id}`)
    } catch {
      setError('Failed to submit closure report')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Submit Closure Report</h1>
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  if (error && !permit) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Submit Closure Report</h1>
        <p className="text-red-600">{error}</p>
        <Link href="/permits" className="text-sm text-blue-600 hover:underline">
          &larr; Back to Permits
        </Link>
      </div>
    )
  }

  if (permit && permit.status !== 'active') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Submit Closure Report</h1>
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            Closure can only be submitted for active permits. This permit is in{' '}
            <strong>{permit.status}</strong> status.
          </p>
        </div>
        <Link href={`/permits/${id}`} className="text-sm text-blue-600 hover:underline">
          &larr; Back to Permit
        </Link>
      </div>
    )
  }

  if (permit && currentUserId !== permit.applicant_id) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Submit Closure Report</h1>
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">
            You are not authorized to submit a closure for this permit.
          </p>
        </div>
        <Link href={`/permits/${id}`} className="text-sm text-blue-600 hover:underline">
          &larr; Back to Permit
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href={`/permits/${id}`} className="text-sm text-gray-500 hover:text-gray-700">
          &larr; Back to Permit
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Submit Closure Report</h1>
      </div>

      {permit && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-700">
            Permit: <span className="font-medium">{permit.permit_number}</span>
            {permit.permit_types && (
              <span className="text-gray-500"> — {permit.permit_types.name}</span>
            )}
          </p>
          <p className="text-sm text-gray-500 mt-1">Location: {permit.work_location}</p>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <p className="text-sm text-blue-800">
          Submitting a closure report will move this permit to <strong>Closure Submitted</strong> status.
          A verifier will then confirm the closure to mark the permit as fully closed.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <div>
          <label htmlFor="comments" className="block text-sm font-medium text-gray-700 mb-1">
            Closure Comments
            <span className="text-gray-500 font-normal ml-1">(optional)</span>
          </label>
          <textarea
            id="comments"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Describe the work completion, any observations, or handover notes..."
            rows={5}
            disabled={submitting}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex justify-between">
          <Link
            href={`/permits/${id}`}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting...' : 'Submit Closure Report'}
          </button>
        </div>
      </form>
    </div>
  )
}

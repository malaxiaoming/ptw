'use client'

import { useState } from 'react'
import { getAvailableTransitions, type PermitAction, type PermitStatus } from '@/lib/permits/state-machine'
import { validateTransition, type PermitContext } from '@/lib/permits/transition'
import type { Role } from '@/lib/auth/permissions'
import { ACTION_CONFIG, type ActionVariant } from '@/lib/permits/status-display'

const VARIANT_STYLES: Record<ActionVariant, string> = {
  primary: 'bg-primary-600 hover:bg-primary-700 text-white',
  success: 'bg-green-600 hover:bg-green-700 text-white',
  warning: 'bg-amber-500 hover:bg-amber-600 text-white',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
}

interface ActionBarProps {
  permit: PermitContext & { status: PermitStatus }
  userRoles: Role[]
  userId: string
  onAction: (action: PermitAction, comments?: string) => Promise<void>
}

export function ActionBar({ permit, userRoles, userId, onAction }: ActionBarProps) {
  const [pendingAction, setPendingAction] = useState<PermitAction | null>(null)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const candidateActions = getAvailableTransitions(permit.status)
  const userContext = { userId, roles: userRoles }

  const availableActions = candidateActions
    .map((action) => {
      const result = validateTransition(permit, action, userContext)
      return { action, result }
    })
    .filter(({ result }) => result.valid)

  if (availableActions.length === 0) return null

  async function handleActionClick(action: PermitAction, requiresComment: boolean) {
    if (requiresComment) {
      setPendingAction(action)
      setComment('')
      setError(null)
    } else {
      await submitAction(action, undefined)
    }
  }

  async function submitAction(action: PermitAction, comments: string | undefined) {
    setLoading(true)
    setError(null)
    try {
      await onAction(action, comments || undefined)
      setPendingAction(null)
      setComment('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Available Actions</h3>

      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {pendingAction ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-700">
            <span className="font-medium">{ACTION_CONFIG[pendingAction].label}</span>
            {' — please provide a comment:'}
          </p>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Enter your comments..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => submitAction(pendingAction, comment)}
              disabled={loading || !comment.trim()}
              className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Confirm'}
            </button>
            <button
              type="button"
              onClick={() => { setPendingAction(null); setComment(''); setError(null) }}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {availableActions.map(({ action, result }) => (
            <button
              key={action}
              type="button"
              onClick={() => handleActionClick(action, result.requiresComment ?? false)}
              disabled={loading}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${VARIANT_STYLES[ACTION_CONFIG[action].variant]}`}
            >
              {ACTION_CONFIG[action].label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

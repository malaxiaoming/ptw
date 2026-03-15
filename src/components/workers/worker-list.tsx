'use client'

import { useState } from 'react'

interface Worker {
  id: string
  name: string
  company: string | null
  trade: string | null
  phone: string | null
  cert_number: string | null
  cert_expiry: string | null
  project_id: string | null
  company_id: string | null
  nric_fin_type: string | null
  nric_fin_last4: string | null
  consent_given: boolean | null
}

interface WorkerListProps {
  workers: Worker[]
  onEdit: (worker: Worker) => void
  onDeactivate: (id: string) => void
  isAdmin: boolean
}

export function WorkerList({ workers, onEdit, onDeactivate, isAdmin }: WorkerListProps) {
  const [confirmDeactivate, setConfirmDeactivate] = useState<string | null>(null)
  const [viewingNric, setViewingNric] = useState<{ workerId: string; nric: string } | null>(null)
  const [nricLoading, setNricLoading] = useState<string | null>(null)

  async function handleViewNric(workerId: string) {
    const reason = prompt('Reason for viewing full NRIC (required for audit):')
    if (!reason?.trim()) return

    setNricLoading(workerId)
    try {
      const res = await fetch(`/api/workers/${workerId}/sensitive?reason=${encodeURIComponent(reason)}`)
      const json = await res.json()
      if (res.ok) {
        setViewingNric({ workerId, nric: json.data.nric_fin_full })
      } else {
        alert(json.error || 'Failed to retrieve NRIC')
      }
    } catch {
      alert('Failed to retrieve NRIC')
    } finally {
      setNricLoading(null)
    }
  }

  if (workers.length === 0) {
    return (
      <p className="text-gray-500 text-sm py-8 text-center">
        {isAdmin
          ? "No workers registered yet. Use the 'Add Worker' button above to get started."
          : 'No workers registered yet.'}
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Company</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Trade</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">NRIC/FIN</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Phone</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Cert No.</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Cert Expiry</th>
            {isAdmin && (
              <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {workers.map((worker) => (
            <tr key={worker.id}>
              <td className="px-4 py-3 font-medium text-gray-900">{worker.name}</td>
              <td className="px-4 py-3 text-gray-600">{worker.company ?? '—'}</td>
              <td className="px-4 py-3 text-gray-600">{worker.trade ?? '—'}</td>
              <td className="px-4 py-3 text-gray-600">
                {worker.nric_fin_last4 ? (
                  <span className="inline-flex items-center gap-1">
                    <span className="text-xs text-gray-400 uppercase">{worker.nric_fin_type}</span>{' '}
                    {viewingNric?.workerId === worker.id ? (
                      <span>
                        {viewingNric.nric}{' '}
                        <button onClick={() => setViewingNric(null)} className="text-xs text-gray-400 hover:underline">hide</button>
                      </span>
                    ) : (
                      <span>
                        ****{worker.nric_fin_last4}
                        {isAdmin && worker.nric_fin_last4 !== '****' && (
                          <button
                            onClick={() => handleViewNric(worker.id)}
                            disabled={nricLoading === worker.id}
                            className="ml-1 text-xs text-blue-600 hover:underline disabled:opacity-50"
                          >
                            {nricLoading === worker.id ? '...' : 'View'}
                          </button>
                        )}
                      </span>
                    )}
                  </span>
                ) : '—'}
              </td>
              <td className="px-4 py-3 text-gray-600">{worker.phone ?? '—'}</td>
              <td className="px-4 py-3 text-gray-600">{worker.cert_number ?? '—'}</td>
              <td className="px-4 py-3 text-gray-600">{worker.cert_expiry ?? '—'}</td>
              {isAdmin && (
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {confirmDeactivate === worker.id ? (
                    <span className="inline-flex gap-2">
                      <button
                        onClick={() => { onDeactivate(worker.id); setConfirmDeactivate(null) }}
                        className="text-red-600 hover:underline"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmDeactivate(null)}
                        className="text-gray-500 hover:underline"
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <span className="inline-flex gap-3">
                      <button onClick={() => onEdit(worker)} className="text-blue-600 hover:underline">
                        Edit
                      </button>
                      <button
                        onClick={() => setConfirmDeactivate(worker.id)}
                        className="text-red-500 hover:underline"
                      >
                        Deactivate
                      </button>
                    </span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

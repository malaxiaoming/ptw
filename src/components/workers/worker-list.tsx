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
}

interface WorkerListProps {
  workers: Worker[]
  onEdit: (worker: Worker) => void
  onDeactivate: (id: string) => void
}

export function WorkerList({ workers, onEdit, onDeactivate }: WorkerListProps) {
  const [confirmDeactivate, setConfirmDeactivate] = useState<string | null>(null)

  if (workers.length === 0) {
    return <p className="text-gray-500 text-sm py-8 text-center">No workers found.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Company</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Trade</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Cert No.</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Cert Expiry</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {workers.map((worker) => (
            <tr key={worker.id}>
              <td className="px-4 py-3 font-medium text-gray-900">{worker.name}</td>
              <td className="px-4 py-3 text-gray-600">{worker.company ?? '—'}</td>
              <td className="px-4 py-3 text-gray-600">{worker.trade ?? '—'}</td>
              <td className="px-4 py-3 text-gray-600">{worker.cert_number ?? '—'}</td>
              <td className="px-4 py-3 text-gray-600">{worker.cert_expiry ?? '—'}</td>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { PermitCard } from '@/components/permits/permit-card'
import { FileText } from 'lucide-react'
import type { PermitStatus } from '@/lib/permits/state-machine'
import { STATUS_CONFIG, ALL_STATUSES } from '@/lib/permits/status-display'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/input'
import { PermitCardSkeleton } from '@/components/ui/skeleton'
import { BilingualText } from '@/components/ui/bilingual'

interface Project {
  id: string
  name: string
}

interface PermitType {
  id: string
  name: string
  code: string
}

interface Permit {
  id: string
  permit_number: string
  permit_type_id: string
  status: PermitStatus | string
  work_location: string
  work_description: string
  created_at: string
  scheduled_start?: string | null
  scheduled_end?: string | null
  permit_types?: { name: string; code: string } | null
  applicant?: { name: string } | null
  project?: { name: string; id: string } | null
  project_id: string
}

export default function PermitsPage() {
  const [permits, setPermits] = useState<Permit[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [permitTypes, setPermitTypes] = useState<PermitType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [projectFilter, setProjectFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const loadPermits = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (projectFilter) params.set('project_id', projectFilter)
      if (statusFilter) params.set('status', statusFilter)

      const res = await fetch(`/api/permits?${params}`)
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed to load permits')
      } else {
        const data: Permit[] = json.data ?? []
        setPermits(data)

        const projectMap = new Map<string, Project>()
        const typeMap = new Map<string, PermitType>()
        for (const p of data) {
          if (p.project) {
            projectMap.set(p.project_id, { id: p.project_id, name: p.project.name })
          }
          if (p.permit_types) {
            typeMap.set(p.permit_type_id, { id: p.permit_type_id, name: p.permit_types.name, code: p.permit_types.code })
          }
        }
        if (!projectFilter) {
          setProjects(Array.from(projectMap.values()))
        }
        setPermitTypes(Array.from(typeMap.values()))
      }
    } catch {
      setError('Failed to load permits')
    } finally {
      setLoading(false)
    }
  }, [projectFilter, statusFilter, typeFilter])

  useEffect(() => {
    loadPermits()
  }, [loadPermits])

  useEffect(() => {
    setTypeFilter('')
  }, [projectFilter])

  const displayedPermits = typeFilter
    ? permits.filter((p) => p.permit_type_id === typeFilter)
    : permits

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900"><BilingualText en="Permits" /></h1>
        <Link href="/permits/new">
          <Button size="md"><BilingualText en="+ New Permit" /></Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[160px]">
            <Select
              label="Project 项目"
              id="project-filter"
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
            >
              <option value="">All Projects 所有项目</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </div>

          <div className="flex-1 min-w-[160px]">
            <Select
              label="Permit Type 许可证类型"
              id="type-filter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All Types 所有类型</option>
              {permitTypes.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </Select>
          </div>

          <div className="flex-1 min-w-[160px]">
            <Select
              label="Status 状态"
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses 所有状态</option>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
              ))}
            </Select>
          </div>

          {(projectFilter || typeFilter || statusFilter) && (
            <div className="flex items-end">
              <Button
                variant="outline"
                size="md"
                onClick={() => { setProjectFilter(''); setTypeFilter(''); setStatusFilter('') }}
              >
                Clear
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <PermitCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12 text-red-600">{error}</div>
      ) : displayedPermits.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4"><BilingualText en="No permits found." /></p>
          <Link href="/permits/new">
            <Button><BilingualText en="Create your first permit" /></Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">{displayedPermits.length} permit{displayedPermits.length !== 1 ? 's' : ''}</p>
          {displayedPermits.map((permit) => (
            <PermitCard key={permit.id} permit={permit} />
          ))}
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { STATUS_CONFIG } from '@/lib/permits/status-display'
import type { PermitStatus } from '@/lib/permits/state-machine'
import type { ChecklistTemplate, ChecklistSection, ChecklistField, PersonnelEntry, PersonnelRequirement } from '@/lib/permits/checklist-validation'

interface UserProfile {
  id: string
  name: string
  email?: string | null
}

interface Attachment {
  id: string
  file_name: string
  file_type: string
  signed_url?: string | null
  uploaded_by?: string
  created_at: string
}

interface Permit {
  id: string
  permit_number: string
  status: PermitStatus
  project_id: string
  applicant_id: string
  work_location: string
  work_description: string
  gps_lat?: number | null
  gps_lng?: number | null
  scheduled_start?: string | null
  scheduled_end?: string | null
  checklist_data?: Record<string, unknown> | null
  personnel?: PersonnelEntry[] | null
  rejection_reason?: string | null
  revocation_reason?: string | null
  submitted_at?: string | null
  verified_at?: string | null
  approved_at?: string | null
  activated_at?: string | null
  closed_at?: string | null
  created_at: string
  permit_types?: { name: string; code: string; checklist_template: ChecklistTemplate } | null
  applicant?: UserProfile | null
  verifier?: UserProfile | null
  approver?: UserProfile | null
  project?: { id: string; name: string; location?: string | null } | null
  permit_attachments?: Attachment[]
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString()
}

function ChecklistValue({ field, value }: { field: ChecklistField; value: unknown }) {
  switch (field.type) {
    case 'yes_no':
      if (value === 'yes') return <span className="text-green-700 font-medium">Yes ✓</span>
      if (value === 'no') return <span className="text-red-700 font-medium">No ✗</span>
      if (value === 'na') return <span className="text-gray-500">N.A.</span>
      return <span className="text-gray-400">—</span>
    case 'checkbox':
      return value === true
        ? <span className="text-green-700">✓</span>
        : <span className="text-red-700">✗</span>
    case 'text':
      return <span>{(value as string) || '—'}</span>
    case 'date':
      return <span>{value ? formatDate(value as string) : '—'}</span>
    case 'select': {
      const idx = field.options?.indexOf(value as string)
      const zhLabel = idx !== undefined && idx >= 0 && field.options_zh?.[idx]
        ? ` ${field.options_zh[idx]}`
        : ''
      return <span>{(value as string) ? `${value}${zhLabel}` : '—'}</span>
    }
    case 'photo': {
      const photos = Array.isArray(value) ? value : []
      if (photos.length === 0) return <span className="text-gray-400">—</span>
      return (
        <span className="text-sm text-gray-600">
          {photos.length} photo{photos.length !== 1 ? 's' : ''} attached
        </span>
      )
    }
    default:
      return <span>{String(value ?? '—')}</span>
  }
}

function PrintChecklist({ sections, data }: { sections: ChecklistSection[]; data: Record<string, unknown> }) {
  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <div key={section.title} className="print-section">
          <h3 className="text-sm font-semibold text-gray-800 border-b border-gray-300 pb-1 mb-2">
            {section.title}
            {section.title_zh && <span className="text-gray-500 font-normal ml-2">{section.title_zh}</span>}
          </h3>
          {section.description && (
            <p className="text-xs text-gray-500 mb-2">
              {section.description}
              {section.description_zh && ` ${section.description_zh}`}
            </p>
          )}
          <table className="w-full text-sm">
            <tbody>
              {section.fields.map((field) => (
                <tr key={field.id} className="border-b border-gray-100">
                  <td className="py-1.5 pr-4 text-gray-600 w-1/2">
                    {field.label}
                    {field.label_zh && <span className="text-gray-400 ml-1">{field.label_zh}</span>}
                  </td>
                  <td className="py-1.5 text-gray-900">
                    <ChecklistValue field={field} value={data[field.id]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

function PersonnelTable({ personnel, requirements }: { personnel: PersonnelEntry[]; requirements: PersonnelRequirement[] }) {
  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="border-b border-gray-300">
          <th className="text-left py-1.5 text-gray-600 font-medium">Name 姓名</th>
          <th className="text-left py-1.5 text-gray-600 font-medium">Role 角色</th>
        </tr>
      </thead>
      <tbody>
        {requirements.map((req) => {
          const entries = personnel.filter((p) => p.role === req.role)
          if (entries.length === 0) return null
          return entries.map((entry, i) => (
            <tr key={`${req.role}-${i}`} className="border-b border-gray-100">
              <td className="py-1.5 text-gray-900">{entry.name}</td>
              <td className="py-1.5 text-gray-600">
                {req.label}
                {req.label_zh && <span className="text-gray-400 ml-1">{req.label_zh}</span>}
              </td>
            </tr>
          ))
        })}
      </tbody>
    </table>
  )
}

export default function PermitPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [permit, setPermit] = useState<Permit | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/permits/${id}`)
        const json = await res.json()
        if (!res.ok) {
          setError(json.error ?? 'Failed to load permit')
          return
        }
        setPermit(json.data)
      } catch {
        setError('Failed to load permit')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading permit...</p>
      </div>
    )
  }

  if (error || !permit) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error ?? 'Permit not found'}</p>
          <Link href={`/permits/${id}`} className="text-primary-600 hover:underline text-sm">
            Back to Permit
          </Link>
        </div>
      </div>
    )
  }

  const statusCfg = STATUS_CONFIG[permit.status]

  return (
    <div className="max-w-[210mm] mx-auto px-8 py-6">
      {/* Print controls — hidden when printing */}
      <div className="no-print flex items-center gap-4 mb-6 pb-4 border-b border-gray-200">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700"
        >
          Print this Permit 打印此许可证
        </button>
        <Link
          href={`/permits/${id}`}
          className="text-sm text-primary-600 hover:underline"
        >
          &larr; Back to Permit 返回许可证
        </Link>
      </div>

      {/* A. Permit Header */}
      <div className="print-section mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{permit.permit_number}</h1>
        <div className="flex items-center gap-3 mt-1">
          {permit.permit_types && (
            <span className="text-lg text-gray-700">{permit.permit_types.name}</span>
          )}
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${statusCfg.bgClass} ${statusCfg.textClass}`}>
            {statusCfg.label} {statusCfg.label_zh}
          </span>
        </div>
        {permit.project && (
          <p className="text-sm text-gray-500 mt-1">
            Project 项目: {permit.project.name}
          </p>
        )}
      </div>

      {/* B. Details Grid */}
      <div className="print-section mb-6">
        <h2 className="text-base font-semibold text-gray-900 border-b border-gray-300 pb-1 mb-3">
          Permit Details 许可证详情
        </h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div>
            <dt className="text-gray-500">Work Location 工作地点</dt>
            <dd className="text-gray-900 font-medium">{permit.work_location}</dd>
          </div>
          {permit.gps_lat != null && permit.gps_lng != null && (
            <div>
              <dt className="text-gray-500">GPS Coordinates GPS 坐标</dt>
              <dd className="text-gray-900">{permit.gps_lat}, {permit.gps_lng}</dd>
            </div>
          )}
          {permit.scheduled_start && (
            <div>
              <dt className="text-gray-500">Scheduled Start 计划开始</dt>
              <dd className="text-gray-900">{formatDate(permit.scheduled_start)}</dd>
            </div>
          )}
          {permit.scheduled_end && (
            <div>
              <dt className="text-gray-500">Scheduled End 计划结束</dt>
              <dd className="text-gray-900">{formatDate(permit.scheduled_end)}</dd>
            </div>
          )}
        </dl>
        <div className="mt-3 text-sm">
          <dt className="text-gray-500">Work Description 工作描述</dt>
          <dd className="text-gray-900 whitespace-pre-wrap mt-1">{permit.work_description}</dd>
        </div>
      </div>

      {/* C. Authorization Chain */}
      <div className="print-section mb-6">
        <h2 className="text-base font-semibold text-gray-900 border-b border-gray-300 pb-1 mb-3">
          Authorization 授权
        </h2>
        <div className="grid grid-cols-3 gap-6 text-sm">
          <div>
            <p className="text-gray-500 mb-1">Applicant 申请人</p>
            <p className="font-medium text-gray-900">{permit.applicant?.name ?? '—'}</p>
            {permit.submitted_at && (
              <p className="text-xs text-gray-400">{formatDate(permit.submitted_at)}</p>
            )}
            <div className="mt-4 border-b border-dotted border-gray-400 w-full" />
            <p className="text-xs text-gray-400 mt-0.5">Signature 签名</p>
          </div>
          <div>
            <p className="text-gray-500 mb-1">Verifier 审核人</p>
            <p className="font-medium text-gray-900">{permit.verifier?.name ?? '—'}</p>
            {permit.verified_at && (
              <p className="text-xs text-gray-400">{formatDate(permit.verified_at)}</p>
            )}
            <div className="mt-4 border-b border-dotted border-gray-400 w-full" />
            <p className="text-xs text-gray-400 mt-0.5">Signature 签名</p>
          </div>
          <div>
            <p className="text-gray-500 mb-1">Approver 批准人</p>
            <p className="font-medium text-gray-900">{permit.approver?.name ?? '—'}</p>
            {permit.approved_at && (
              <p className="text-xs text-gray-400">{formatDate(permit.approved_at)}</p>
            )}
            <div className="mt-4 border-b border-dotted border-gray-400 w-full" />
            <p className="text-xs text-gray-400 mt-0.5">Signature 签名</p>
          </div>
        </div>
      </div>

      {/* D. Checklist */}
      {permit.permit_types?.checklist_template?.sections?.length ? (
        <div className="print-section mb-6">
          <h2 className="text-base font-semibold text-gray-900 border-b border-gray-300 pb-1 mb-3">
            Checklist 检查清单
          </h2>
          <PrintChecklist
            sections={permit.permit_types.checklist_template.sections}
            data={permit.checklist_data ?? {}}
          />
        </div>
      ) : null}

      {/* E. Personnel Table */}
      {permit.permit_types?.checklist_template?.personnel?.length && permit.personnel?.length ? (
        <div className="print-section mb-6">
          <h2 className="text-base font-semibold text-gray-900 border-b border-gray-300 pb-1 mb-3">
            Personnel 人员
          </h2>
          <PersonnelTable
            personnel={permit.personnel}
            requirements={permit.permit_types.checklist_template.personnel}
          />
        </div>
      ) : null}

      {/* F. Footer */}
      <div className="print-section mt-8 pt-4 border-t border-gray-300 text-sm text-gray-500">
        {permit.scheduled_start && permit.scheduled_end && (
          <p>
            Valid from 有效期: {formatDate(permit.scheduled_start)} — {formatDate(permit.scheduled_end)}
          </p>
        )}
        <p>
          Printed on 打印于: {new Date().toLocaleString()}
        </p>
      </div>
    </div>
  )
}

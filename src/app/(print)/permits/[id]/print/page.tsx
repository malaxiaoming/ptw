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
  applicant_signature?: string | null
  verifier_signature?: string | null
  approver_signature?: string | null
  permit_attachments?: Attachment[]
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-SG', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function formatDateTime(dateStr: string): string {
  return `${formatDate(dateStr)} ${formatTime(dateStr)}`
}

function calcDays(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime()
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

function UnderlineValue({ value, minWidth = '200px' }: { value: string; minWidth?: string }) {
  return (
    <span
      className="border-b border-black inline-block px-1 font-normal"
      style={{ minWidth }}
    >
      {value || '\u00A0'}
    </span>
  )
}

function ChecklistValueText({ field, value }: { field: ChecklistField; value: unknown }): string {
  switch (field.type) {
    case 'yes_no':
      if (value === 'yes') return 'Yes'
      if (value === 'no') return 'No'
      if (value === 'na') return 'N.A.'
      return '—'
    case 'checkbox':
      return value === true ? 'Yes' : 'No'
    case 'text':
      return (value as string) || '—'
    case 'date':
      return value ? formatDateTime(value as string) : '—'
    case 'select': {
      const idx = field.options?.indexOf(value as string)
      const zh = idx !== undefined && idx >= 0 && field.options_zh?.[idx] ? ` ${field.options_zh[idx]}` : ''
      return value ? `${value}${zh}` : '—'
    }
    case 'photo': {
      const photos = Array.isArray(value) ? value : []
      return photos.length > 0 ? `${photos.length} photo(s)` : '—'
    }
    default:
      return String(value ?? '—')
  }
}

/** Flatten all fields from all sections with sequential S/N */
function flattenFields(sections: ChecklistSection[]): { sn: number; field: ChecklistField; sectionTitle: string; sectionTitleZh?: string }[] {
  const result: { sn: number; field: ChecklistField; sectionTitle: string; sectionTitleZh?: string }[] = []
  let sn = 1
  for (const section of sections) {
    for (const field of section.fields) {
      result.push({ sn, field, sectionTitle: section.title, sectionTitleZh: section.title_zh })
      sn++
    }
  }
  return result
}

function ChecklistTable({ sections, data }: { sections: ChecklistSection[]; data: Record<string, unknown> }) {
  const allFields = flattenFields(sections)
  const half = Math.ceil(allFields.length / 2)
  const leftCol = allFields.slice(0, half)
  const rightCol = allFields.slice(half)
  const rows = Math.max(leftCol.length, rightCol.length)

  return (
    <div className="print-section">
      <h2 className="text-center font-bold text-sm mb-1">
        SAFETY CONDITIONS TO BE COMPLIED WITH PRIOR TO PERMIT APPROVAL
      </h2>
      <p className="text-center text-xs mb-3">安全措施检查（施工前须符合以下安全条件）</p>

      <table className="w-full border-collapse border border-black text-xs">
        <thead>
          <tr>
            <th className="border border-black p-1 w-[30px]">S/N</th>
            <th className="border border-black p-1">Safety Measures 安全措施</th>
            <th className="border border-black p-1 w-[60px]">Yes/No</th>
            <th className="border border-black p-1 w-[30px]">S/N</th>
            <th className="border border-black p-1">Safety Measures 安全措施</th>
            <th className="border border-black p-1 w-[60px]">Yes/No</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => {
            const left = leftCol[i]
            const right = rightCol[i]
            return (
              <tr key={i}>
                <td className="border border-black p-1 text-center">{left?.sn ?? ''}</td>
                <td className="border border-black p-1">
                  {left && (
                    <>
                      {left.field.label}
                      {left.field.label_zh && <><br /><span className="text-[10px]">{left.field.label_zh}</span></>}
                    </>
                  )}
                </td>
                <td className="border border-black p-1 text-center">
                  {left ? ChecklistValueText({ field: left.field, value: data[left.field.id] }) : ''}
                </td>
                <td className="border border-black p-1 text-center">{right?.sn ?? ''}</td>
                <td className="border border-black p-1">
                  {right && (
                    <>
                      {right.field.label}
                      {right.field.label_zh && <><br /><span className="text-[10px]">{right.field.label_zh}</span></>}
                    </>
                  )}
                </td>
                <td className="border border-black p-1 text-center">
                  {right ? ChecklistValueText({ field: right.field, value: data[right.field.id] }) : ''}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="text-[10px] mt-1 italic">*Indicate &quot;NA&quot; against conditions that are not required 不适用的条件请注明&quot;NA&quot;</p>
    </div>
  )
}

function PersonnelTable20({ personnel, permitTypeName }: { personnel: PersonnelEntry[]; permitTypeName: string }) {
  const totalSlots = 20
  const leftSlots = 10
  const rows = leftSlots

  return (
    <div className="print-section">
      <h2 className="text-center font-bold text-sm mb-1">
        List of Workmen involved in {permitTypeName}
      </h2>
      <p className="text-center text-xs mb-3">参与工作的工人名单</p>

      <table className="w-full border-collapse border border-black text-xs">
        <thead>
          <tr>
            <th className="border border-black p-1 w-[30px]">S/N</th>
            <th className="border border-black p-1">Name of Worker 工人姓名</th>
            <th className="border border-black p-1 w-[60px]">Role 角色</th>
            <th className="border border-black p-1 w-[30px]">S/N</th>
            <th className="border border-black p-1">Name of Worker 工人姓名</th>
            <th className="border border-black p-1 w-[60px]">Role 角色</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => {
            const leftIdx = i
            const rightIdx = i + leftSlots
            const leftPerson = personnel[leftIdx]
            const rightPerson = rightIdx < totalSlots ? personnel[rightIdx] : undefined
            return (
              <tr key={i}>
                <td className="border border-black p-1 text-center">{leftIdx + 1}</td>
                <td className="border border-black p-1">{leftPerson?.name ?? ''}</td>
                <td className="border border-black p-1 text-center">{leftPerson?.role ?? ''}</td>
                <td className="border border-black p-1 text-center">{rightIdx + 1}</td>
                <td className="border border-black p-1">{rightPerson?.name ?? ''}</td>
                <td className="border border-black p-1 text-center">{rightPerson?.role ?? ''}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
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
  const sections = permit.permit_types?.checklist_template?.sections ?? []
  const personnel = permit.personnel ?? []
  const checklistData = (permit.checklist_data ?? {}) as Record<string, unknown>

  return (
    <div className="max-w-[210mm] mx-auto px-8 py-6 text-black text-sm" style={{ fontFamily: "'Noto Sans SC', 'Noto Sans', sans-serif" }}>
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

      {/* ===== PAGE 1 ===== */}

      {/* A. Header Block */}
      <div className="print-section mb-6">
        <div className="flex justify-between items-start text-xs mb-2">
          <div>{permit.permit_types?.code ?? ''}</div>
          <div>PTW Serial No (序列号): <span className="font-bold">{permit.permit_number}</span></div>
        </div>

        <h1 className="text-center text-lg font-bold mb-0">
          PERMIT TO WORK 施工准许证
          {permit.permit_types && <> — {permit.permit_types.name.toUpperCase()}</>}
        </h1>
        <div className="border-b-2 border-black mx-auto mt-1 mb-2" style={{ width: '80%' }} />

        <p className="text-center text-xs mb-1">
          (THIS COPY SHALL BE DISPLAYED AT PLACE OF WORK, AS APPROPRIATE)
        </p>
        <p className="text-center text-xs mb-3">
          此副本应在工作场所张贴展示
        </p>

        <p className="text-xs">
          Status (状态): <span className="font-bold">{statusCfg.label.toUpperCase()} {statusCfg.label_zh}</span>
        </p>
      </div>

      {/* B. Form Fields */}
      <div className="print-section mb-6 space-y-2 text-xs">
        <div>
          <span className="font-bold">PROJECT TITLE (项目名称): </span>
          <UnderlineValue value={permit.project?.name ?? ''} minWidth="350px" />
        </div>
        <div>
          <span className="font-bold">NAME OF APPLICANT (申请人姓名): </span>
          <UnderlineValue value={permit.applicant?.name ?? ''} minWidth="300px" />
        </div>
        <div>
          <span className="font-bold">WORK TO BE PERFORMED (所申请的施工类型): </span>
          <UnderlineValue value={permit.work_description} minWidth="250px" />
        </div>
        <div>
          <span className="font-bold">DURATION OF WORK (施工历时): </span>
          From (从) <UnderlineValue value={permit.scheduled_start ? formatDate(permit.scheduled_start) : ''} minWidth="80px" />
          {' '}to (至) <UnderlineValue value={permit.scheduled_end ? formatDate(permit.scheduled_end) : ''} minWidth="80px" />
          {' '}Total (共计): <UnderlineValue
            value={permit.scheduled_start && permit.scheduled_end ? `${calcDays(permit.scheduled_start, permit.scheduled_end)}` : ''}
            minWidth="30px"
          /> days (天)
        </div>
        <div>
          <span className="font-bold">LOCATION OF WORK (施工地点): </span>
          <UnderlineValue value={permit.work_location} minWidth="300px" />
        </div>
        {permit.gps_lat != null && permit.gps_lng != null && (
          <div>
            <span className="font-bold">GPS COORDINATES (GPS 坐标): </span>
            <UnderlineValue value={`${permit.gps_lat}, ${permit.gps_lng}`} minWidth="250px" />
          </div>
        )}
      </div>

      {/* C. Regulatory Notice */}
      <div className="print-section mb-6 text-[10px] leading-relaxed border border-black p-3">
        <p>
          For each work, a new Permit-To-Work (PTW) form has to be processed and submitted.
          A PTW shall be approved for a maximum of 7 days provided it is used for the same
          type / scope of works declared in the permit application. The conditions of issue
          of a PTW must be complied with throughout the duration of work, otherwise, this
          PTW can be withdrawn at anytime. The applicant of this PTW shall be responsible
          for maintaining a copy of this permit and must produce it upon request.
        </p>
        <p className="mt-2">
          每项施工须重新办理施工准许证（PTW）。PTW 批准的最长有效期为 7 天，
          前提是该 PTW 仅用于申请中声明的相同类型/范围的施工。PTW 的签发条件必须在整个施工期间得到遵守，
          否则该 PTW 可随时被撤销。PTW 申请人有责任保存此许可证副本，并在要求时出示。
        </p>
      </div>

      {/* D. Safety Checklist */}
      {sections.length > 0 && (
        <div className="mb-6">
          <ChecklistTable sections={sections} data={checklistData} />
        </div>
      )}

      {/* ===== PAGE BREAK ===== */}
      <div style={{ pageBreakBefore: 'always' }} />

      {/* E. Signature Blocks */}
      <div className="print-section mb-6">
        {/* Application */}
        <div className="border border-black p-3 mb-4">
          <h3 className="font-bold text-xs mb-2">
            Permit Application by Foreman / Supervisor / Engineer in-charge
          </h3>
          <p className="text-[10px] mb-1">施工准许证申请（由工头/主管/工程师负责人填写）</p>
          <p className="text-[10px] mb-3 italic">
            I fully understand the nature of the work and safety conditions that must be met.
            I have inspected the safety conditions relating to the work to be performed.
          </p>
          <p className="text-[10px] mb-3 italic">
            我保证已做到以上所提的所有安全措施与要求，同时确保该施工地点已可以安全开工。
          </p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
            <div>
              <span className="font-bold">Name (姓名): </span>
              <UnderlineValue value={permit.applicant?.name ?? ''} minWidth="120px" />
            </div>
            <div>
              <span className="font-bold">Date / Time (日期/时间): </span>
              <UnderlineValue value={permit.submitted_at ? formatDateTime(permit.submitted_at) : ''} minWidth="120px" />
            </div>
            <div className="col-span-2">
              <span className="font-bold">Signature (签名): </span>
              {permit.applicant_signature
                ? <img src={permit.applicant_signature} alt="Applicant signature" className="inline-block h-12 mt-1" />
                : <UnderlineValue value="" minWidth="200px" />
              }
            </div>
          </div>
        </div>

        {/* Verification */}
        <div className="border border-black p-3 mb-4">
          <h3 className="font-bold text-xs mb-2">
            Permit Verification by WSH Officer / Coordinator / Supervisor
          </h3>
          <p className="text-[10px] mb-3">施工准许证审核（由安全主任/协调员/主管填写）</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
            <div>
              <span className="font-bold">Name (姓名): </span>
              <UnderlineValue value={permit.verifier?.name ?? ''} minWidth="120px" />
            </div>
            <div>
              <span className="font-bold">Date (日期): </span>
              <UnderlineValue value={permit.verified_at ? formatDate(permit.verified_at) : ''} minWidth="120px" />
            </div>
            <div>
              <span className="font-bold">Time (时间): </span>
              <UnderlineValue value={permit.verified_at ? formatTime(permit.verified_at) : ''} minWidth="120px" />
            </div>
            <div className="col-span-2">
              <span className="font-bold">Signature (签名): </span>
              {permit.verifier_signature
                ? <img src={permit.verifier_signature} alt="Verifier signature" className="inline-block h-12 mt-1" />
                : <UnderlineValue value="" minWidth="200px" />
              }
            </div>
          </div>
        </div>

        {/* Approval */}
        <div className="border border-black p-3 mb-4">
          <h3 className="font-bold text-xs mb-2">
            Permit Approval by Project Manager / Site Manager
          </h3>
          <p className="text-[10px] mb-3">施工准许证批准（由项目经理/工地经理填写）</p>
          <div className="text-xs mb-3">
            <span className="font-bold">Permit is (许可证): </span>
            {permit.status === 'rejected'
              ? <span className="font-bold">NOT APPROVED 不批准</span>
              : permit.approved_at
                ? <span className="font-bold">APPROVED 批准</span>
                : <span>Pending 待定</span>
            }
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
            <div>
              <span className="font-bold">Name of PM/SM (姓名): </span>
              <UnderlineValue value={permit.approver?.name ?? ''} minWidth="120px" />
            </div>
            <div>
              <span className="font-bold">Date (日期): </span>
              <UnderlineValue value={permit.approved_at ? formatDate(permit.approved_at) : ''} minWidth="120px" />
            </div>
            <div>
              <span className="font-bold">Time (时间): </span>
              <UnderlineValue value={permit.approved_at ? formatTime(permit.approved_at) : ''} minWidth="120px" />
            </div>
            <div className="col-span-2">
              <span className="font-bold">Signature (签名): </span>
              {permit.approver_signature
                ? <img src={permit.approver_signature} alt="Approver signature" className="inline-block h-12 mt-1" />
                : <UnderlineValue value="" minWidth="200px" />
              }
            </div>
          </div>
          {permit.rejection_reason && (
            <div className="mt-2 text-xs">
              <span className="font-bold">Reason for rejection (拒绝原因): </span>
              <UnderlineValue value={permit.rejection_reason} minWidth="250px" />
            </div>
          )}
        </div>

        {/* Completion / Closure */}
        <div className="border border-black p-3 mb-4">
          <h3 className="font-bold text-xs mb-2">
            Notification of Works Completion 施工完成通知
          </h3>
          <p className="text-[10px] mb-3 italic">
            (To be reported by Permit Applicant 由申请人填写)
          </p>
          <div className="text-xs mb-2">
            The above mentioned work was completed on (以上施工已于以下日期完成):
            <UnderlineValue value={permit.closed_at ? formatDateTime(permit.closed_at) : ''} minWidth="150px" />
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
            <div>
              <span className="font-bold">Name (姓名): </span>
              <UnderlineValue value={permit.closed_at ? (permit.applicant?.name ?? '') : ''} minWidth="120px" />
            </div>
            <div>
              <span className="font-bold">Signature (签名): </span>
              <UnderlineValue value="" minWidth="120px" />
            </div>
          </div>
        </div>

        {/* Revocation (if applicable) */}
        {permit.revocation_reason && (
          <div className="border border-black p-3 mb-4">
            <h3 className="font-bold text-xs mb-2">
              Permit Revocation 许可证撤销
            </h3>
            <div className="text-xs">
              <span className="font-bold">Reason (原因): </span>
              <UnderlineValue value={permit.revocation_reason} minWidth="300px" />
            </div>
          </div>
        )}
      </div>

      {/* F. Personnel Table */}
      <PersonnelTable20
        personnel={personnel}
        permitTypeName={permit.permit_types?.name ?? 'Permit Works'}
      />

      {/* G. Footer */}
      <div className="print-section mt-8 pt-4 border-t border-black text-xs">
        <p>Printed on 打印于: {new Date().toLocaleString()}</p>
      </div>
    </div>
  )
}

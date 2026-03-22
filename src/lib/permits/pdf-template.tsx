import React from 'react'
import path from 'path'
import { Document, Page, View, Text, Image, StyleSheet, Font } from '@react-pdf/renderer'
import type { PermitStatus } from '@/lib/permits/state-machine'
import type { ChecklistSection, ChecklistField, PersonnelEntry, PersonnelRequirement, ChecklistTemplate } from '@/lib/permits/checklist-validation'
import { STATUS_CONFIG } from '@/lib/permits/status-display'

// Register a CJK-capable font for bilingual rendering.
Font.register({
  family: 'NotoSansSC',
  fonts: [
    { src: path.join(process.cwd(), 'public/fonts/NotoSansSC-Regular.ttf'), fontWeight: 400 },
    { src: path.join(process.cwd(), 'public/fonts/NotoSansSC-Bold.ttf'), fontWeight: 700 },
  ],
})

export interface PermitPdfData {
  id: string
  permit_number: string
  status: PermitStatus
  work_location: string
  work_description: string
  gps_lat?: number | null
  gps_lng?: number | null
  scheduled_start?: string | null
  scheduled_end?: string | null
  checklist_data?: Record<string, unknown> | null
  personnel?: PersonnelEntry[] | null
  submitted_at?: string | null
  verified_at?: string | null
  approved_at?: string | null
  activated_at?: string | null
  closed_at?: string | null
  created_at: string
  permit_types?: { name: string; code: string; checklist_template: ChecklistTemplate } | null
  applicant?: { name: string } | null
  verifier?: { name: string } | null
  approver?: { name: string } | null
  project?: { name: string } | null
  rejection_reason?: string | null
  revocation_reason?: string | null
  applicant_signature?: string | null
  verifier_signature?: string | null
  approver_signature?: string | null
  photoUrls?: Record<string, string>
}

const s = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 9,
    fontFamily: 'NotoSansSC',
    color: '#000000',
  },
  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: { fontSize: 8 },
  headerRight: { fontSize: 8 },
  title: {
    fontSize: 14,
    fontWeight: 700,
    textAlign: 'center',
    marginBottom: 2,
  },
  titleLine: {
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
    width: '80%',
    alignSelf: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 8,
    textAlign: 'center',
    marginBottom: 2,
  },
  statusText: { fontSize: 8, marginBottom: 8 },

  // Form fields
  formField: {
    flexDirection: 'row',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  fieldLabel: {
    fontWeight: 700,
    fontSize: 9,
  },
  fieldValue: {
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    paddingHorizontal: 4,
    minWidth: 150,
    fontSize: 9,
  },
  fieldValueShort: {
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    paddingHorizontal: 4,
    minWidth: 60,
    fontSize: 9,
  },

  // Regulatory notice
  noticeBox: {
    borderWidth: 1,
    borderColor: '#000000',
    padding: 8,
    marginBottom: 12,
  },
  noticeText: {
    fontSize: 7,
    lineHeight: 1.5,
  },

  // Checklist table
  checklistTitle: {
    fontSize: 10,
    fontWeight: 700,
    textAlign: 'center',
    marginBottom: 2,
  },
  checklistSubtitle: {
    fontSize: 8,
    textAlign: 'center',
    marginBottom: 6,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    minHeight: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    backgroundColor: '#f5f5f5',
  },
  cellSn: {
    width: 22,
    borderRightWidth: 1,
    borderRightColor: '#000000',
    padding: 2,
    textAlign: 'center',
    fontSize: 8,
  },
  cellMeasure: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#000000',
    padding: 2,
    fontSize: 8,
  },
  cellYesNo: {
    width: 40,
    borderRightWidth: 1,
    borderRightColor: '#000000',
    padding: 2,
    textAlign: 'center',
    fontSize: 8,
  },
  cellYesNoLast: {
    width: 40,
    padding: 2,
    textAlign: 'center',
    fontSize: 8,
  },
  cellSnLast: {
    width: 22,
    borderRightWidth: 1,
    borderRightColor: '#000000',
    borderLeftWidth: 1,
    borderLeftColor: '#000000',
    padding: 2,
    textAlign: 'center',
    fontSize: 8,
  },
  footnote: {
    fontSize: 7,
    marginTop: 2,
    marginBottom: 8,
  },

  // Signature blocks
  sigBlock: {
    borderWidth: 1,
    borderColor: '#000000',
    padding: 8,
    marginBottom: 8,
  },
  sigTitle: {
    fontSize: 9,
    fontWeight: 700,
    marginBottom: 2,
  },
  sigSubtitle: {
    fontSize: 7,
    marginBottom: 4,
  },
  sigItalic: {
    fontSize: 7,
    marginBottom: 6,
  },
  sigFieldRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  sigFieldLabel: {
    fontWeight: 700,
    fontSize: 8,
  },
  sigFieldValue: {
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    paddingHorizontal: 4,
    minWidth: 100,
    fontSize: 8,
  },
  sigImageBox: {
    width: 150,
    height: 50,
    marginTop: 4,
    marginBottom: 2,
    overflow: 'hidden',
  },
  sigImage: {
    width: 150,
    height: 50,
    objectFit: 'contain' as const,
  },

  // Personnel table
  personnelTitle: {
    fontSize: 10,
    fontWeight: 700,
    textAlign: 'center',
    marginBottom: 2,
  },
  personnelSubtitle: {
    fontSize: 8,
    textAlign: 'center',
    marginBottom: 6,
  },
  pCellSn: {
    width: 22,
    borderRightWidth: 1,
    borderRightColor: '#000000',
    padding: 2,
    textAlign: 'center',
    fontSize: 8,
  },
  pCellName: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#000000',
    padding: 2,
    fontSize: 8,
  },
  pCellRole: {
    width: 40,
    padding: 2,
    textAlign: 'center',
    fontSize: 8,
  },
  pCellRoleMid: {
    width: 40,
    borderRightWidth: 1,
    borderRightColor: '#000000',
    padding: 2,
    textAlign: 'center',
    fontSize: 8,
  },

  // Footer
  footer: {
    marginTop: 16,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#000000',
    fontSize: 8,
  },
})

function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-SG', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtTime(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function fmtDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  return `${fmtDate(dateStr)} ${fmtTime(dateStr)}`
}

function calcDays(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime()
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

function checklistValueText(field: ChecklistField, value: unknown): string {
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
      return value ? fmtDateTime(value as string) : '—'
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

function flattenFields(sections: ChecklistSection[]): { sn: number; field: ChecklistField }[] {
  const result: { sn: number; field: ChecklistField }[] = []
  let sn = 1
  for (const section of sections) {
    for (const field of section.fields) {
      result.push({ sn, field })
      sn++
    }
  }
  return result
}

function ChecklistTablePdf({ sections, data }: { sections: ChecklistSection[]; data: Record<string, unknown> }) {
  const allFields = flattenFields(sections)
  const half = Math.ceil(allFields.length / 2)
  const leftCol = allFields.slice(0, half)
  const rightCol = allFields.slice(half)
  const rows = Math.max(leftCol.length, rightCol.length)

  return (
    <View>
      <Text style={s.checklistTitle}>
        SAFETY CONDITIONS TO BE COMPLIED WITH PRIOR TO PERMIT APPROVAL
      </Text>
      <Text style={s.checklistSubtitle}>安全措施检查（施工前须符合以下安全条件）</Text>

      {/* Outer border */}
      <View style={{ borderWidth: 1, borderColor: '#000000' }}>
        {/* Header row */}
        <View style={s.tableHeader}>
          <Text style={s.cellSn}>S/N</Text>
          <Text style={s.cellMeasure}>Safety Measures 安全措施</Text>
          <Text style={s.cellYesNo}>Yes/No</Text>
          <Text style={s.cellSnLast}>S/N</Text>
          <Text style={s.cellMeasure}>Safety Measures 安全措施</Text>
          <Text style={s.cellYesNoLast}>Yes/No</Text>
        </View>

        {/* Data rows */}
        {Array.from({ length: rows }).map((_, i) => {
          const left = leftCol[i]
          const right = rightCol[i]
          return (
            <View key={i} style={s.tableRow}>
              <Text style={s.cellSn}>{left?.sn ?? ''}</Text>
              <View style={s.cellMeasure}>
                {left && (
                  <>
                    <Text>{left.field.label}</Text>
                    {left.field.label_zh && <Text style={{ fontSize: 7 }}>{left.field.label_zh}</Text>}
                  </>
                )}
              </View>
              <Text style={s.cellYesNo}>
                {left ? checklistValueText(left.field, data[left.field.id]) : ''}
              </Text>
              <Text style={s.cellSnLast}>{right?.sn ?? ''}</Text>
              <View style={s.cellMeasure}>
                {right && (
                  <>
                    <Text>{right.field.label}</Text>
                    {right.field.label_zh && <Text style={{ fontSize: 7 }}>{right.field.label_zh}</Text>}
                  </>
                )}
              </View>
              <Text style={s.cellYesNoLast}>
                {right ? checklistValueText(right.field, data[right.field.id]) : ''}
              </Text>
            </View>
          )
        })}
      </View>

      <Text style={s.footnote}>
        *Indicate &quot;NA&quot; against conditions that are not required 不适用的条件请注明&quot;NA&quot;
      </Text>
    </View>
  )
}

function PersonnelTablePdf({ personnel, permitTypeName }: { personnel: PersonnelEntry[]; permitTypeName: string }) {
  const totalSlots = 20
  const leftSlots = 10
  const rowCount = leftSlots

  return (
    <View>
      <Text style={s.personnelTitle}>List of Workmen involved in {permitTypeName}</Text>
      <Text style={s.personnelSubtitle}>参与工作的工人名单</Text>

      <View style={{ borderWidth: 1, borderColor: '#000000' }}>
        {/* Header */}
        <View style={s.tableHeader}>
          <Text style={s.pCellSn}>S/N</Text>
          <Text style={s.pCellName}>Name of Worker 工人姓名</Text>
          <Text style={s.pCellRoleMid}>Role</Text>
          <Text style={s.pCellSn}>S/N</Text>
          <Text style={s.pCellName}>Name of Worker 工人姓名</Text>
          <Text style={s.pCellRole}>Role</Text>
        </View>

        {/* Data rows */}
        {Array.from({ length: rowCount }).map((_, i) => {
          const leftIdx = i
          const rightIdx = i + leftSlots
          const leftPerson = personnel[leftIdx]
          const rightPerson = rightIdx < totalSlots ? personnel[rightIdx] : undefined
          return (
            <View key={i} style={s.tableRow}>
              <Text style={s.pCellSn}>{leftIdx + 1}</Text>
              <Text style={s.pCellName}>{leftPerson?.name ?? ''}</Text>
              <Text style={s.pCellRoleMid}>{leftPerson?.role ?? ''}</Text>
              <Text style={s.pCellSn}>{rightIdx + 1}</Text>
              <Text style={s.pCellName}>{rightPerson?.name ?? ''}</Text>
              <Text style={s.pCellRole}>{rightPerson?.role ?? ''}</Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

export function PermitPdfDocument({ data }: { data: PermitPdfData }) {
  const statusCfg = STATUS_CONFIG[data.status]
  const sections = data.permit_types?.checklist_template?.sections ?? []
  const checklistData = (data.checklist_data ?? {}) as Record<string, unknown>
  const personnel = data.personnel ?? []

  return (
    <Document>
      {/* ===== PAGE 1: Header, Form Fields, Regulatory Notice, Checklist ===== */}
      <Page size="A4" style={s.page}>
        {/* A. Header Block */}
        <View style={s.headerRow}>
          <Text style={s.headerLeft}>{data.permit_types?.code ?? ''}</Text>
          <Text style={s.headerRight}>
            PTW Serial No (序列号): {data.permit_number}
          </Text>
        </View>

        <Text style={s.title}>
          PERMIT TO WORK 施工准许证{data.permit_types ? ` — ${data.permit_types.name.toUpperCase()}` : ''}
        </Text>
        <View style={s.titleLine} />

        <Text style={s.subtitle}>
          (THIS COPY SHALL BE DISPLAYED AT PLACE OF WORK, AS APPROPRIATE)
        </Text>
        <Text style={s.subtitle}>此副本应在工作场所张贴展示</Text>

        <Text style={s.statusText}>
          Status (状态): {statusCfg.label.toUpperCase()} {statusCfg.label_zh}
        </Text>

        {/* B. Form Fields */}
        <View style={s.formField}>
          <Text style={s.fieldLabel}>PROJECT TITLE (项目名称): </Text>
          <Text style={s.fieldValue}>{data.project?.name ?? ''}</Text>
        </View>
        <View style={s.formField}>
          <Text style={s.fieldLabel}>NAME OF APPLICANT (申请人姓名): </Text>
          <Text style={s.fieldValue}>{data.applicant?.name ?? ''}</Text>
        </View>
        <View style={s.formField}>
          <Text style={s.fieldLabel}>WORK TO BE PERFORMED (所申请的施工类型): </Text>
          <Text style={s.fieldValue}>{data.work_description}</Text>
        </View>
        <View style={s.formField}>
          <Text style={s.fieldLabel}>DURATION OF WORK (施工历时): </Text>
          <Text>From (从) </Text>
          <Text style={s.fieldValueShort}>{fmtDate(data.scheduled_start)}</Text>
          <Text> to (至) </Text>
          <Text style={s.fieldValueShort}>{fmtDate(data.scheduled_end)}</Text>
          <Text> Total (共计): </Text>
          <Text style={s.fieldValueShort}>
            {data.scheduled_start && data.scheduled_end
              ? `${calcDays(data.scheduled_start, data.scheduled_end)}`
              : ''}
          </Text>
          <Text> days (天)</Text>
        </View>
        <View style={s.formField}>
          <Text style={s.fieldLabel}>LOCATION OF WORK (施工地点): </Text>
          <Text style={s.fieldValue}>{data.work_location}</Text>
        </View>
        {data.gps_lat != null && data.gps_lng != null && (
          <View style={s.formField}>
            <Text style={s.fieldLabel}>GPS COORDINATES (GPS 坐标): </Text>
            <Text style={s.fieldValue}>{data.gps_lat}, {data.gps_lng}</Text>
          </View>
        )}

        {/* C. Regulatory Notice */}
        <View style={[s.noticeBox, { marginTop: 8 }]}>
          <Text style={s.noticeText}>
            For each work, a new Permit-To-Work (PTW) form has to be processed and submitted.
            A PTW shall be approved for a maximum of 7 days provided it is used for the same
            type / scope of works declared in the permit application. The conditions of issue
            of a PTW must be complied with throughout the duration of work, otherwise, this
            PTW can be withdrawn at anytime. The applicant of this PTW shall be responsible
            for maintaining a copy of this permit and must produce it upon request.
          </Text>
          <Text style={[s.noticeText, { marginTop: 4 }]}>
            每项施工须重新办理施工准许证（PTW）。PTW 批准的最长有效期为 7 天，
            前提是该 PTW 仅用于申请中声明的相同类型/范围的施工。PTW 的签发条件必须在整个施工期间得到遵守，
            否则该 PTW 可随时被撤销。PTW 申请人有责任保存此许可证副本，并在要求时出示。
          </Text>
        </View>

        {/* D. Safety Checklist */}
        {sections.length > 0 && (
          <ChecklistTablePdf sections={sections} data={checklistData} />
        )}
      </Page>

      {/* ===== PAGE 2: Signatures + Personnel ===== */}
      <Page size="A4" style={s.page}>
        {/* E. Signature Blocks */}

        {/* Application */}
        <View style={s.sigBlock}>
          <Text style={s.sigTitle}>
            Permit Application by Foreman / Supervisor / Engineer in-charge
          </Text>
          <Text style={s.sigSubtitle}>施工准许证申请（由工头/主管/工程师负责人填写）</Text>
          <Text style={s.sigItalic}>
            I fully understand the nature of the work and safety conditions that must be met.
            I have inspected the safety conditions relating to the work to be performed.
          </Text>
          <Text style={s.sigItalic}>
            我保证已做到以上所提的所有安全措施与要求，同时确保该施工地点已可以安全开工。
          </Text>
          <View style={s.sigFieldRow}>
            <Text style={s.sigFieldLabel}>Name (姓名): </Text>
            <Text style={s.sigFieldValue}>{data.applicant?.name ?? ''}</Text>
          </View>
          {data.applicant_signature && (
            <View style={s.sigFieldRow}>
              <Text style={s.sigFieldLabel}>Signature (签名): </Text>
              <View style={s.sigImageBox}>
                <Image src={data.applicant_signature} style={s.sigImage} />
              </View>
            </View>
          )}
          <View style={s.sigFieldRow}>
            <Text style={s.sigFieldLabel}>Date / Time (日期/时间): </Text>
            <Text style={s.sigFieldValue}>{fmtDateTime(data.submitted_at)}</Text>
          </View>
        </View>

        {/* Verification */}
        <View style={s.sigBlock}>
          <Text style={s.sigTitle}>
            Permit Verification by WSH Officer / Coordinator / Supervisor
          </Text>
          <Text style={s.sigSubtitle}>施工准许证审核（由安全主任/协调员/主管填写）</Text>
          <View style={{ flexDirection: 'row' as const }}>
            <View style={{ width: '50%' }}>
              <View style={s.sigFieldRow}>
                <Text style={s.sigFieldLabel}>Name (姓名): </Text>
                <Text style={s.sigFieldValue}>{data.verifier?.name ?? ''}</Text>
              </View>
              <View style={s.sigFieldRow}>
                <Text style={s.sigFieldLabel}>Date (日期): </Text>
                <Text style={s.sigFieldValue}>{fmtDate(data.verified_at)}</Text>
              </View>
              <View style={s.sigFieldRow}>
                <Text style={s.sigFieldLabel}>Time (时间): </Text>
                <Text style={s.sigFieldValue}>{fmtTime(data.verified_at)}</Text>
              </View>
            </View>
            <View style={{ width: '50%' }}>
              {data.verifier_signature ? (
                <View>
                  <Text style={s.sigFieldLabel}>Signature (签名):</Text>
                  <View style={s.sigImageBox}>
                    <Image src={data.verifier_signature} style={s.sigImage} />
                  </View>
                </View>
              ) : (
                <View style={s.sigFieldRow}>
                  <Text style={s.sigFieldLabel}>Signature (签名): </Text>
                  <Text style={s.sigFieldValue}>{' '}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Approval */}
        <View style={s.sigBlock}>
          <Text style={s.sigTitle}>
            Permit Approval by Project Manager / Site Manager
          </Text>
          <Text style={s.sigSubtitle}>施工准许证批准（由项目经理/工地经理填写）</Text>
          <View style={s.sigFieldRow}>
            <Text style={s.sigFieldLabel}>Permit is (许可证): </Text>
            <Text style={{ fontSize: 8, fontWeight: 700 }}>
              {data.status === 'rejected'
                ? 'NOT APPROVED 不批准'
                : data.approved_at
                  ? 'APPROVED 批准'
                  : 'Pending 待定'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row' as const }}>
            <View style={{ width: '50%' }}>
              <View style={s.sigFieldRow}>
                <Text style={s.sigFieldLabel}>Name of PM/SM (姓名): </Text>
                <Text style={s.sigFieldValue}>{data.approver?.name ?? ''}</Text>
              </View>
              <View style={s.sigFieldRow}>
                <Text style={s.sigFieldLabel}>Date (日期): </Text>
                <Text style={s.sigFieldValue}>{fmtDate(data.approved_at)}</Text>
              </View>
              <View style={s.sigFieldRow}>
                <Text style={s.sigFieldLabel}>Time (时间): </Text>
                <Text style={s.sigFieldValue}>{fmtTime(data.approved_at)}</Text>
              </View>
            </View>
            <View style={{ width: '50%' }}>
              {data.approver_signature ? (
                <View>
                  <Text style={s.sigFieldLabel}>Signature (签名):</Text>
                  <View style={s.sigImageBox}>
                    <Image src={data.approver_signature} style={s.sigImage} />
                  </View>
                </View>
              ) : (
                <View style={s.sigFieldRow}>
                  <Text style={s.sigFieldLabel}>Signature (签名): </Text>
                  <Text style={s.sigFieldValue}>{' '}</Text>
                </View>
              )}
            </View>
          </View>
          {data.rejection_reason && (
            <View style={[s.sigFieldRow, { marginTop: 4 }]}>
              <Text style={s.sigFieldLabel}>Reason for rejection (拒绝原因): </Text>
              <Text style={s.sigFieldValue}>{data.rejection_reason}</Text>
            </View>
          )}
        </View>

        {/* Completion / Closure */}
        <View style={s.sigBlock}>
          <Text style={s.sigTitle}>Notification of Works Completion 施工完成通知</Text>
          <Text style={s.sigItalic}>(To be reported by Permit Applicant 由申请人填写)</Text>
          <View style={s.sigFieldRow}>
            <Text style={{ fontSize: 8 }}>The above mentioned work was completed on (以上施工已于以下日期完成): </Text>
            <Text style={s.sigFieldValue}>{fmtDateTime(data.closed_at)}</Text>
          </View>
          <View style={{ flexDirection: 'row' as const }}>
            <View style={{ width: '50%' }}>
              <View style={s.sigFieldRow}>
                <Text style={s.sigFieldLabel}>Name (姓名): </Text>
                <Text style={s.sigFieldValue}>{data.closed_at ? (data.applicant?.name ?? '') : ''}</Text>
              </View>
            </View>
            <View style={{ width: '50%' }}>
              <View style={s.sigFieldRow}>
                <Text style={s.sigFieldLabel}>Signature (签名): </Text>
                <Text style={s.sigFieldValue}>{' '}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Revocation (if applicable) */}
        {data.revocation_reason && (
          <View style={s.sigBlock}>
            <Text style={s.sigTitle}>Permit Revocation 许可证撤销</Text>
            <View style={s.sigFieldRow}>
              <Text style={s.sigFieldLabel}>Reason (原因): </Text>
              <Text style={s.sigFieldValue}>{data.revocation_reason}</Text>
            </View>
          </View>
        )}

        {/* F. Personnel Table */}
        <PersonnelTablePdf
          personnel={personnel}
          permitTypeName={data.permit_types?.name ?? 'Permit Works'}
        />

        {/* G. Footer */}
        <View style={s.footer}>
          <Text>Printed on 打印于: {new Date().toLocaleString()}</Text>
        </View>
      </Page>
    </Document>
  )
}

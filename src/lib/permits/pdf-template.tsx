import React from 'react'
import { Document, Page, View, Text, StyleSheet, Font } from '@react-pdf/renderer'
import type { PermitStatus } from '@/lib/permits/state-machine'
import type { ChecklistSection, ChecklistField, PersonnelEntry, PersonnelRequirement, ChecklistTemplate } from '@/lib/permits/checklist-validation'
import { STATUS_CONFIG } from '@/lib/permits/status-display'

// Register a CJK-capable font for bilingual rendering.
// Using Noto Sans SC from Google Fonts CDN — the full chinese-simplified subset.
// If these URLs stop working, download the .ttf files from
// https://fonts.google.com/noto/specimen/Noto+Sans+SC and bundle locally in /public/fonts/.
Font.register({
  family: 'NotoSansSC',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/notosanssc/v37/k3kCo84MPvpLmixcA63oeAL7Iqp5IZJF9bmaG9_FnYxNbPzS5HE.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/notosanssc/v37/k3kCo84MPvpLmixcA63oeAL7Iqp5IZJF9bmaG9_Fn0JKbPzS5HE.ttf', fontWeight: 700 },
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
}

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'NotoSansSC', color: '#1a1a1a' },
  title: { fontSize: 20, fontWeight: 700, marginBottom: 2 },
  subtitle: { fontSize: 13, color: '#374151', marginBottom: 2 },
  badge: { fontSize: 9, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, alignSelf: 'flex-start', marginTop: 4 },
  projectText: { fontSize: 9, color: '#6b7280', marginTop: 4 },
  sectionTitle: { fontSize: 12, fontWeight: 700, borderBottomWidth: 1, borderBottomColor: '#d1d5db', paddingBottom: 4, marginBottom: 8, marginTop: 16 },
  row: { flexDirection: 'row', marginBottom: 4 },
  label: { color: '#6b7280', width: '40%' },
  value: { color: '#1a1a1a', width: '60%', fontWeight: 500 },
  authCol: { width: '33.3%', paddingRight: 12 },
  authLabel: { fontSize: 9, color: '#6b7280', marginBottom: 4 },
  authName: { fontWeight: 700, marginBottom: 2 },
  authDate: { fontSize: 8, color: '#9ca3af' },
  sigLine: { borderBottomWidth: 1, borderBottomColor: '#9ca3af', marginTop: 20, marginBottom: 2 },
  sigLabel: { fontSize: 7, color: '#9ca3af' },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#d1d5db', paddingBottom: 4, marginBottom: 4 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingVertical: 3 },
  tableCell: { width: '50%' },
  tableCellLabel: { width: '50%', color: '#6b7280' },
  checklistSectionTitle: { fontSize: 11, fontWeight: 700, borderBottomWidth: 1, borderBottomColor: '#d1d5db', paddingBottom: 3, marginBottom: 6, marginTop: 10 },
  checklistZh: { color: '#6b7280', fontWeight: 400, marginLeft: 4 },
  fieldRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingVertical: 3 },
  fieldLabel: { width: '55%', color: '#4b5563' },
  fieldValue: { width: '45%' },
  footer: { marginTop: 24, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#d1d5db', fontSize: 9, color: '#6b7280' },
  green: { color: '#15803d' },
  red: { color: '#b91c1c' },
  gray: { color: '#6b7280' },
})

function fmt(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString()
}

function FieldValue({ field, value }: { field: ChecklistField; value: unknown }) {
  switch (field.type) {
    case 'yes_no':
      if (value === 'yes') return <Text style={s.green}>Yes</Text>
      if (value === 'no') return <Text style={s.red}>No</Text>
      if (value === 'na') return <Text style={s.gray}>N.A.</Text>
      return <Text style={s.gray}>—</Text>
    case 'checkbox':
      return <Text style={value ? s.green : s.red}>{value ? '✓' : '✗'}</Text>
    case 'text':
      return <Text>{(value as string) || '—'}</Text>
    case 'date':
      return <Text>{value ? fmt(value as string) : '—'}</Text>
    case 'select': {
      const idx = field.options?.indexOf(value as string)
      const zh = idx !== undefined && idx >= 0 && field.options_zh?.[idx] ? ` ${field.options_zh[idx]}` : ''
      return <Text>{value ? `${value}${zh}` : '—'}</Text>
    }
    case 'photo': {
      const photos = Array.isArray(value) ? value : []
      return <Text style={s.gray}>{photos.length > 0 ? `${photos.length} photo(s)` : '—'}</Text>
    }
    default:
      return <Text>{String(value ?? '—')}</Text>
  }
}

export function PermitPdfDocument({ data }: { data: PermitPdfData }) {
  const statusCfg = STATUS_CONFIG[data.status]
  const sections = data.permit_types?.checklist_template?.sections ?? []
  const personnelReqs = data.permit_types?.checklist_template?.personnel ?? []
  const checklistData = (data.checklist_data ?? {}) as Record<string, unknown>
  const personnel = data.personnel ?? []

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* A. Header */}
        <Text style={s.title}>{data.permit_number}</Text>
        {data.permit_types && <Text style={s.subtitle}>{data.permit_types.name}</Text>}
        <Text style={s.badge}>{statusCfg.label} {statusCfg.label_zh}</Text>
        {data.project && <Text style={s.projectText}>Project: {data.project.name}</Text>}

        {/* B. Details */}
        <Text style={s.sectionTitle}>Permit Details 许可证详情</Text>
        <View style={s.row}>
          <Text style={s.label}>Work Location 工作地点</Text>
          <Text style={s.value}>{data.work_location}</Text>
        </View>
        {data.gps_lat != null && data.gps_lng != null && (
          <View style={s.row}>
            <Text style={s.label}>GPS Coordinates</Text>
            <Text style={s.value}>{data.gps_lat}, {data.gps_lng}</Text>
          </View>
        )}
        {data.scheduled_start && (
          <View style={s.row}>
            <Text style={s.label}>Scheduled Start 计划开始</Text>
            <Text style={s.value}>{fmt(data.scheduled_start)}</Text>
          </View>
        )}
        {data.scheduled_end && (
          <View style={s.row}>
            <Text style={s.label}>Scheduled End 计划结束</Text>
            <Text style={s.value}>{fmt(data.scheduled_end)}</Text>
          </View>
        )}
        <View style={[s.row, { marginTop: 4 }]}>
          <Text style={s.label}>Work Description 工作描述</Text>
          <Text style={s.value}>{data.work_description}</Text>
        </View>

        {/* C. Authorization */}
        <Text style={s.sectionTitle}>Authorization 授权</Text>
        <View style={{ flexDirection: 'row' as const }}>
          <View style={s.authCol}>
            <Text style={s.authLabel}>Applicant 申请人</Text>
            <Text style={s.authName}>{data.applicant?.name ?? '—'}</Text>
            <Text style={s.authDate}>{fmt(data.submitted_at)}</Text>
            <View style={s.sigLine} />
            <Text style={s.sigLabel}>Signature 签名</Text>
          </View>
          <View style={s.authCol}>
            <Text style={s.authLabel}>Verifier 审核人</Text>
            <Text style={s.authName}>{data.verifier?.name ?? '—'}</Text>
            <Text style={s.authDate}>{fmt(data.verified_at)}</Text>
            <View style={s.sigLine} />
            <Text style={s.sigLabel}>Signature 签名</Text>
          </View>
          <View style={s.authCol}>
            <Text style={s.authLabel}>Approver 批准人</Text>
            <Text style={s.authName}>{data.approver?.name ?? '—'}</Text>
            <Text style={s.authDate}>{fmt(data.approved_at)}</Text>
            <View style={s.sigLine} />
            <Text style={s.sigLabel}>Signature 签名</Text>
          </View>
        </View>

        {/* D. Checklist */}
        {sections.length > 0 && (
          <View>
            <Text style={s.sectionTitle}>Checklist 检查清单</Text>
            {sections.map((section: ChecklistSection) => (
              <View key={section.title}>
                <Text style={s.checklistSectionTitle}>
                  {section.title}
                  {section.title_zh && <Text style={s.checklistZh}> {section.title_zh}</Text>}
                </Text>
                {section.description && (
                  <Text style={{ fontSize: 8, color: '#6b7280', marginBottom: 4 }}>
                    {section.description}{section.description_zh ? ` ${section.description_zh}` : ''}
                  </Text>
                )}
                {section.fields.map((field: ChecklistField) => (
                  <View key={field.id} style={s.fieldRow}>
                    <Text style={s.fieldLabel}>
                      {field.label}
                      {field.label_zh && <Text style={{ color: '#9ca3af' }}> {field.label_zh}</Text>}
                    </Text>
                    <View style={s.fieldValue}>
                      <FieldValue field={field} value={checklistData[field.id]} />
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* E. Personnel */}
        {personnelReqs.length > 0 && personnel.length > 0 && (
          <View>
            <Text style={s.sectionTitle}>Personnel 人员</Text>
            <View style={s.tableHeader}>
              <Text style={[s.tableCell, { fontWeight: 700 }]}>Name 姓名</Text>
              <Text style={[s.tableCell, { fontWeight: 700 }]}>Role 角色</Text>
            </View>
            {personnelReqs.map((req: PersonnelRequirement) =>
              personnel
                .filter((p: PersonnelEntry) => p.role === req.role)
                .map((entry: PersonnelEntry, i: number) => (
                  <View key={`${req.role}-${i}`} style={s.tableRow}>
                    <Text style={s.tableCell}>{entry.name}</Text>
                    <Text style={s.tableCellLabel}>
                      {req.label}{req.label_zh ? ` ${req.label_zh}` : ''}
                    </Text>
                  </View>
                ))
            )}
          </View>
        )}

        {/* F. Footer */}
        <View style={s.footer}>
          {data.scheduled_start && data.scheduled_end && (
            <Text>Valid from: {fmt(data.scheduled_start)} — {fmt(data.scheduled_end)}</Text>
          )}
          <Text>Generated on: {new Date().toLocaleString()}</Text>
        </View>
      </Page>
    </Document>
  )
}

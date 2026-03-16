import type { PermitStatus, PermitAction } from './state-machine'

export interface StatusDisplayConfig {
  label: string
  label_zh: string
  bgClass: string
  textClass: string
  dotColor: string
}

export const STATUS_CONFIG: Record<PermitStatus, StatusDisplayConfig> = {
  draft:              { label: 'Draft',              label_zh: '草稿',       bgClass: 'bg-gray-100',   textClass: 'text-gray-700',   dotColor: 'bg-gray-400' },
  submitted:          { label: 'Submitted',          label_zh: '已提交',     bgClass: 'bg-blue-100',   textClass: 'text-blue-700',   dotColor: 'bg-blue-500' },
  verified:           { label: 'Verified',           label_zh: '已审核',     bgClass: 'bg-indigo-100', textClass: 'text-indigo-700', dotColor: 'bg-indigo-500' },
  active:             { label: 'Active',             label_zh: '有效',       bgClass: 'bg-green-100',  textClass: 'text-green-700',  dotColor: 'bg-green-500' },
  closure_submitted:  { label: 'Closure Submitted',  label_zh: '已提交关闭', bgClass: 'bg-amber-100',  textClass: 'text-amber-700',  dotColor: 'bg-amber-500' },
  closed:             { label: 'Closed',             label_zh: '已关闭',     bgClass: 'bg-gray-100',   textClass: 'text-gray-500',   dotColor: 'bg-gray-400' },
  rejected:           { label: 'Rejected',           label_zh: '已拒绝',     bgClass: 'bg-red-100',    textClass: 'text-red-700',    dotColor: 'bg-red-500' },
  revoked:            { label: 'Revoked',            label_zh: '已撤销',     bgClass: 'bg-red-200',    textClass: 'text-red-800',    dotColor: 'bg-red-700' },
}

export type ActionVariant = 'primary' | 'success' | 'warning' | 'danger'

export interface ActionDisplayConfig {
  label: string
  label_zh: string
  variant: ActionVariant
  requiresComment: boolean
}

export const ACTION_CONFIG: Record<PermitAction, ActionDisplayConfig> = {
  submit:          { label: 'Submit for Verification',     label_zh: '提交审核',     variant: 'primary', requiresComment: false },
  verify:          { label: 'Verify',                      label_zh: '审核',         variant: 'success', requiresComment: false },
  return:          { label: 'Return to Applicant',         label_zh: '退回申请人',   variant: 'warning', requiresComment: true },
  approve:         { label: 'Approve',                     label_zh: '批准',         variant: 'success', requiresComment: false },
  reject:          { label: 'Reject',                      label_zh: '拒绝',         variant: 'danger',  requiresComment: true },
  submit_closure:  { label: 'Submit Closure Report',       label_zh: '提交关闭报告', variant: 'primary', requiresComment: false },
  revoke:          { label: 'Revoke',                      label_zh: '撤销',         variant: 'danger',  requiresComment: true },
  verify_closure:  { label: 'Confirm Closure',             label_zh: '确认关闭',     variant: 'success', requiresComment: false },
  return_closure:  { label: 'Return Closure for Revision', label_zh: '退回关闭修改', variant: 'warning', requiresComment: true },
}

export const ALL_STATUSES: PermitStatus[] = [
  'draft', 'submitted', 'verified', 'active',
  'closure_submitted', 'closed', 'rejected', 'revoked',
]

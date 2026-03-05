import type { PermitStatus, PermitAction } from './state-machine'

export interface StatusDisplayConfig {
  label: string
  bgClass: string
  textClass: string
  dotColor: string
}

export const STATUS_CONFIG: Record<PermitStatus, StatusDisplayConfig> = {
  draft:              { label: 'Draft',              bgClass: 'bg-gray-100',   textClass: 'text-gray-700',   dotColor: 'bg-gray-400' },
  submitted:          { label: 'Submitted',          bgClass: 'bg-blue-100',   textClass: 'text-blue-700',   dotColor: 'bg-blue-500' },
  verified:           { label: 'Verified',           bgClass: 'bg-indigo-100', textClass: 'text-indigo-700', dotColor: 'bg-indigo-500' },
  approved:           { label: 'Approved',           bgClass: 'bg-teal-100',   textClass: 'text-teal-700',   dotColor: 'bg-teal-500' },
  active:             { label: 'Active',             bgClass: 'bg-green-100',  textClass: 'text-green-700',  dotColor: 'bg-green-500' },
  closure_submitted:  { label: 'Closure Submitted',  bgClass: 'bg-amber-100',  textClass: 'text-amber-700',  dotColor: 'bg-amber-500' },
  closed:             { label: 'Closed',             bgClass: 'bg-gray-100',   textClass: 'text-gray-500',   dotColor: 'bg-gray-400' },
  rejected:           { label: 'Rejected',           bgClass: 'bg-red-100',    textClass: 'text-red-700',    dotColor: 'bg-red-500' },
  revoked:            { label: 'Revoked',            bgClass: 'bg-red-200',    textClass: 'text-red-800',    dotColor: 'bg-red-700' },
}

export type ActionVariant = 'primary' | 'success' | 'warning' | 'danger'

export interface ActionDisplayConfig {
  label: string
  variant: ActionVariant
  requiresComment: boolean
}

export const ACTION_CONFIG: Record<PermitAction, ActionDisplayConfig> = {
  submit:          { label: 'Submit for Verification', variant: 'primary', requiresComment: false },
  verify:          { label: 'Verify',                  variant: 'success', requiresComment: false },
  return:          { label: 'Return to Applicant',     variant: 'warning', requiresComment: true },
  approve:         { label: 'Approve',                 variant: 'success', requiresComment: false },
  reject:          { label: 'Reject',                  variant: 'danger',  requiresComment: true },
  activate:        { label: 'Activate',                variant: 'success', requiresComment: false },
  submit_closure:  { label: 'Submit Closure Report',   variant: 'primary', requiresComment: false },
  revoke:          { label: 'Revoke',                  variant: 'danger',  requiresComment: true },
  verify_closure:  { label: 'Confirm Closure',         variant: 'success', requiresComment: false },
  return_closure:  { label: 'Return Closure for Revision', variant: 'warning', requiresComment: true },
}

export const ALL_STATUSES: PermitStatus[] = [
  'draft', 'submitted', 'verified', 'approved', 'active',
  'closure_submitted', 'closed', 'rejected', 'revoked',
]

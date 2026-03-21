import type { PermitStatus } from './state-machine'

interface PermitForDelete {
  status: PermitStatus
  applicant_id: string
}

interface UserForDelete {
  userId: string
  isAdmin: boolean
}

interface DeleteResult {
  allowed: boolean
  reason?: string
}

const DELETABLE_STATUSES: PermitStatus[] = ['draft', 'submitted', 'verified']

export function canDeletePermit(permit: PermitForDelete, user: UserForDelete): DeleteResult {
  const hasAccess = permit.applicant_id === user.userId || user.isAdmin

  if (!hasAccess) {
    return { allowed: false, reason: 'Only the applicant or an admin can delete this permit' }
  }

  if (!DELETABLE_STATUSES.includes(permit.status)) {
    return { allowed: false, reason: 'Only draft, submitted, or verified permits can be deleted' }
  }

  return { allowed: true }
}

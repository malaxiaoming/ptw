import type { PermitStatus } from './state-machine'

interface PermitForDelete {
  status: PermitStatus
  applicant_id: string
  scheduled_end: string | null
}

interface UserForDelete {
  userId: string
  isAdmin: boolean
}

interface DeleteResult {
  allowed: boolean
  reason?: string
}

export function canDeletePermit(permit: PermitForDelete, user: UserForDelete): DeleteResult {
  const isApplicant = permit.applicant_id === user.userId
  const hasAccess = isApplicant || user.isAdmin

  if (!hasAccess) {
    return { allowed: false, reason: 'Only the applicant or an admin can delete this permit' }
  }

  if (permit.status === 'draft') {
    return { allowed: true }
  }

  if (permit.status === 'submitted' || permit.status === 'verified') {
    if (!permit.scheduled_end) {
      return { allowed: false, reason: 'Cannot delete a permit without a scheduled end date' }
    }
    if (new Date(permit.scheduled_end) >= new Date()) {
      return { allowed: false, reason: 'Cannot delete a permit that has not yet expired' }
    }
    return { allowed: true }
  }

  return { allowed: false, reason: 'Only draft or expired submitted/verified permits can be deleted' }
}

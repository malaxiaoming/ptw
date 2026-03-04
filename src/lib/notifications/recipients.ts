import type { PermitStatus } from '@/lib/permits/state-machine'
import type { Role } from '@/lib/auth/permissions'

interface PermitParties {
  applicant_id: string
  verifier_id: string | null
  approver_id: string | null
}

interface NotificationTarget {
  targetRoles?: Role[]
  targetUserIds?: string[]
}

export function getNotificationRecipients(
  newStatus: PermitStatus,
  parties: PermitParties
): NotificationTarget {
  switch (newStatus) {
    case 'submitted':
    case 'closure_submitted':
      return { targetRoles: ['verifier'] }

    case 'verified':
      return { targetRoles: ['approver'] }

    case 'draft': // returned to draft
      return { targetUserIds: [parties.applicant_id] }

    case 'approved':
    case 'rejected':
    case 'closed':
      return { targetUserIds: [parties.applicant_id] }

    case 'revoked':
      return {
        targetUserIds: [
          parties.applicant_id,
          ...(parties.verifier_id ? [parties.verifier_id] : []),
        ],
      }

    case 'active': // activation or return_closure
      return { targetUserIds: [parties.applicant_id] }

    default:
      return {}
  }
}

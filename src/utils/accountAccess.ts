import { AccountApprovalStatus, UserProfile, UserRole } from '../types';

type AccountStatusProfile = Pick<
  UserProfile,
  'role' | 'accountStatus' | 'approvalRejectionReason'
>;

/**
 * Old client documents may not contain accountStatus. Clients never require an
 * administrator decision, while boutique accounts remain closed by default.
 */
export function normalizedAccountStatus(profile: AccountStatusProfile): AccountApprovalStatus {
  if (profile.accountStatus) return profile.accountStatus;
  return profile.role === UserRole.BOUTIQUE ? 'pending' : 'approved';
}

export function getAccountBlockingMessage(profile: AccountStatusProfile): string | null {
  const status = normalizedAccountStatus(profile);
  if (status === 'pending') {
    return "Votre compte est en attente de confirmation par l’administration.";
  }
  if (status === 'rejected') {
    return `Votre demande d’ouverture a été refusée${profile.approvalRejectionReason ? ` : ${profile.approvalRejectionReason}` : '.'}`;
  }
  if (status === 'suspended') {
    return "Votre compte est suspendu. Contactez l’administration.";
  }
  return null;
}

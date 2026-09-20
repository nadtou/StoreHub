import { Boutique, BoutiqueApplication, UserProfile } from '../types';

export interface BoutiqueAdminTransition {
  boutiqueUpdates: Partial<Boutique>;
  applicationUpdates: Partial<BoutiqueApplication>;
  ownerUpdates?: Partial<UserProfile>;
}

/** Produces one consistent state across boutique, application and owner profile. */
export function buildBoutiqueAdminTransition(
  current: Boutique,
  request: Partial<Boutique>,
  reviewedAt: string,
): BoutiqueAdminTransition {
  const boutiqueUpdates: Partial<Boutique> = { updatedAt: reviewedAt };
  const applicationUpdates: Partial<BoutiqueApplication> = {};
  let ownerUpdates: Partial<UserProfile> | undefined;

  if (typeof request.isFeatured === 'boolean') {
    boutiqueUpdates.isFeatured = request.isFeatured;
  }

  if (request.isSuspended === true) {
    Object.assign(boutiqueUpdates, {
      isSuspended: true,
      verificationStatus: 'suspended' as const,
      verificationReviewedAt: reviewedAt,
    });
    Object.assign(applicationUpdates, { status: 'suspended' as const, reviewedAt });
    ownerUpdates = { accountStatus: 'suspended', approvalReviewedAt: reviewedAt, approvalRejectionReason: '' };
  } else if (request.isSuspended === false && current.isSuspended) {
    const restoredStatus = current.isVerified ? 'verified' as const : 'pending' as const;
    Object.assign(boutiqueUpdates, {
      isSuspended: false,
      verificationStatus: restoredStatus,
      verificationReviewedAt: reviewedAt,
      verificationRejectionReason: '',
    });
    Object.assign(applicationUpdates, { status: restoredStatus, reviewedAt, rejectionReason: '' });
    ownerUpdates = {
      accountStatus: current.isVerified ? 'approved' : 'pending',
      approvalReviewedAt: reviewedAt,
      approvalRejectionReason: '',
    };
  } else if (request.isVerified === true) {
    Object.assign(boutiqueUpdates, {
      isVerified: true,
      isSuspended: false,
      verificationStatus: 'verified' as const,
      verificationReviewedAt: reviewedAt,
      verificationRejectionReason: '',
    });
    Object.assign(applicationUpdates, { status: 'verified' as const, reviewedAt, rejectionReason: '' });
    ownerUpdates = { accountStatus: 'approved', approvalReviewedAt: reviewedAt, approvalRejectionReason: '' };
  } else if (request.verificationStatus === 'rejected') {
    const reason = typeof request.verificationRejectionReason === 'string'
      ? request.verificationRejectionReason.trim().slice(0, 500)
      : 'Dossier refusé par l’administration.';
    Object.assign(boutiqueUpdates, {
      isVerified: false,
      isSuspended: false,
      verificationStatus: 'rejected' as const,
      verificationReviewedAt: reviewedAt,
      verificationRejectionReason: reason,
    });
    Object.assign(applicationUpdates, { status: 'rejected' as const, reviewedAt, rejectionReason: reason });
    ownerUpdates = { accountStatus: 'rejected', approvalReviewedAt: reviewedAt, approvalRejectionReason: reason };
  } else if (request.isVerified === false) {
    Object.assign(boutiqueUpdates, {
      isVerified: false,
      isSuspended: false,
      verificationStatus: 'pending' as const,
      verificationReviewedAt: reviewedAt,
      verificationRejectionReason: '',
    });
    Object.assign(applicationUpdates, { status: 'pending' as const, reviewedAt, rejectionReason: '' });
    ownerUpdates = { accountStatus: 'pending', approvalReviewedAt: reviewedAt, approvalRejectionReason: '' };
  }

  return { boutiqueUpdates, applicationUpdates, ownerUpdates };
}

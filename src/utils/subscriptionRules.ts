import {
  Boutique,
  BoutiqueSubscription,
  SubscriptionPayment,
  SubscriptionPaymentMethod,
  SubscriptionStatus,
} from '../types';

/** Prix mensuel de l'abonnement boutique, en dinars algériens (~15 USD). */
export const SUBSCRIPTION_PRICE_DZD = 2000;

/** Durée d'une période d'abonnement, en jours. */
export const SUBSCRIPTION_PERIOD_DAYS = 30;

/** Nombre de jours avant expiration où l'on prévient la boutique. */
export const SUBSCRIPTION_RENEWAL_REMINDER_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

export function addDays(fromIso: string, days: number): string {
  const base = new Date(fromIso);
  if (Number.isNaN(base.getTime())) {
    throw new Error('Date de départ invalide pour le calcul de la période.');
  }
  return new Date(base.getTime() + days * DAY_MS).toISOString();
}

/**
 * Statut effectif de l'abonnement à l'instant `nowIso`. Le champ stocké peut
 * dire "active" alors que la période est en réalité expirée : on recalcule
 * toujours à partir de currentPeriodEnd pour éviter les états périmés.
 */
export function resolveSubscriptionStatus(
  subscription: BoutiqueSubscription | undefined,
  nowIso: string,
): SubscriptionStatus {
  if (!subscription || subscription.status === 'none') return 'none';
  if (subscription.status === 'suspended') return 'suspended';
  if (subscription.status === 'pending') return 'pending';

  const end = subscription.currentPeriodEnd;
  if (!end) return subscription.status === 'active' ? 'expired' : subscription.status;
  const endTime = new Date(end).getTime();
  const now = new Date(nowIso).getTime();
  if (Number.isNaN(endTime) || Number.isNaN(now)) return 'expired';
  return endTime > now ? 'active' : 'expired';
}

/**
 * Une boutique peut vendre (ajouter/modifier produits, apparaître en avant)
 * seulement si son abonnement est actif. Un abonnement suspendu ou expiré la
 * passe en lecture seule. `none` = jamais payé → bloquée aussi.
 */
export function canBoutiqueOperate(
  boutique: Pick<Boutique, 'subscription'>,
  nowIso: string,
): boolean {
  return resolveSubscriptionStatus(boutique.subscription, nowIso) === 'active';
}

/** Nombre de jours entiers restants avant expiration (négatif si déjà expiré). */
export function daysUntilExpiry(
  subscription: BoutiqueSubscription | undefined,
  nowIso: string,
): number | null {
  if (!subscription?.currentPeriodEnd) return null;
  const end = new Date(subscription.currentPeriodEnd).getTime();
  const now = new Date(nowIso).getTime();
  if (Number.isNaN(end) || Number.isNaN(now)) return null;
  return Math.floor((end - now) / DAY_MS);
}

/**
 * Applique un paiement approuvé : prolonge la période. Si l'abonnement est
 * encore actif, on repart de la fin de période courante (cumul, pas de perte).
 * Sinon on démarre à `nowIso`.
 */
export function applyApprovedPayment(
  current: BoutiqueSubscription | undefined,
  method: SubscriptionPaymentMethod,
  nowIso: string,
): { subscription: BoutiqueSubscription; periodStart: string; periodEnd: string } {
  const activeUntil = current?.currentPeriodEnd
    && resolveSubscriptionStatus(current, nowIso) === 'active'
    ? current.currentPeriodEnd
    : nowIso;
  const periodStart = activeUntil;
  const periodEnd = addDays(activeUntil, SUBSCRIPTION_PERIOD_DAYS);
  const subscription: BoutiqueSubscription = {
    status: 'active',
    plan: 'standard',
    currentPeriodEnd: periodEnd,
    lastPaymentAt: nowIso,
    lastPaymentMethod: method,
    updatedAt: nowIso,
  };
  return { subscription, periodStart, periodEnd };
}

export interface SubmittedPaymentInput {
  method?: unknown;
  amountDzd?: unknown;
  reference?: unknown;
  proofUrl?: unknown;
  proofPath?: unknown;
  senderNote?: unknown;
}

export type PreparedManualPayment =
  | { ok: false; error: string }
  | {
      ok: true;
      value: {
        method: 'bank_transfer';
        amountDzd: number;
        reference: string;
        proofUrl: string;
        proofPath: string;
        senderNote: string;
      };
    };

/**
 * Valide et normalise un paiement par virement déclaré par la boutique.
 * Le chemin de la preuve doit appartenir à la boutique (anti-usurpation).
 */
export function prepareManualPayment(
  input: SubmittedPaymentInput,
  ownerUid: string,
  boutiqueId: string,
): PreparedManualPayment {
  const method = input.method;
  if (method !== 'bank_transfer') {
    return { ok: false, error: 'Méthode de paiement invalide.' };
  }
  const amountDzd = Number(input.amountDzd);
  if (!Number.isFinite(amountDzd) || amountDzd < SUBSCRIPTION_PRICE_DZD) {
    return {
      ok: false,
      error: `Le montant doit être d'au moins ${SUBSCRIPTION_PRICE_DZD} DA.`,
    };
  }
  const reference = typeof input.reference === 'string' ? input.reference.trim().slice(0, 120) : '';
  if (reference.length < 3) {
    return { ok: false, error: 'La référence du virement est obligatoire (n° bordereau/reçu).' };
  }
  const proofUrl = typeof input.proofUrl === 'string' ? input.proofUrl.trim() : '';
  const proofPath = typeof input.proofPath === 'string' ? input.proofPath.trim() : '';
  const expectedPrefix = `subscription-proofs/${ownerUid}/${boutiqueId}/`;
  if (!proofPath.startsWith(expectedPrefix)) {
    return { ok: false, error: 'Le justificatif ne correspond pas à cette boutique.' };
  }
  try {
    const url = new URL(proofUrl);
    if (url.protocol !== 'https:' || url.hostname !== 'firebasestorage.googleapis.com') throw new Error();
    const markerIndex = url.pathname.indexOf('/o/');
    if (markerIndex < 0) throw new Error();
    const encodedObjectPath = url.pathname.slice(markerIndex + 3).split('/')[0];
    if (decodeURIComponent(encodedObjectPath) !== proofPath) throw new Error();
  } catch {
    return { ok: false, error: 'Le justificatif doit être une image envoyée sur Firebase Storage.' };
  }
  const senderNote = typeof input.senderNote === 'string' ? input.senderNote.trim().slice(0, 500) : '';
  return {
    ok: true,
    value: { method: 'bank_transfer', amountDzd: Math.floor(amountDzd), reference, proofUrl, proofPath, senderNote },
  };
}

/** Somme à demander à Chargily (en centimes n'existe pas en DZD, montant entier). */
export function chargilyAmount(): number {
  return SUBSCRIPTION_PRICE_DZD;
}

/** Résumé lisible d'un paiement pour l'admin/console. */
export function describePayment(payment: SubscriptionPayment): string {
  const method = payment.method === 'chargily' ? 'Paiement en ligne (CIB/Edahabia)' : 'Virement bancaire';
  return `${method} — ${payment.amountDzd} DA`;
}

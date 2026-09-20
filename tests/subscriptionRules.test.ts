import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  SUBSCRIPTION_PRICE_DZD,
  addDays,
  applyApprovedPayment,
  canBoutiqueOperate,
  daysUntilExpiry,
  prepareManualPayment,
  resolveSubscriptionStatus,
} from '../src/utils/subscriptionRules';
import { BoutiqueSubscription } from '../src/types';

const NOW = '2026-09-20T10:00:00.000Z';

test('resolveSubscriptionStatus recalcule à partir de la fin de période', () => {
  assert.equal(resolveSubscriptionStatus(undefined, NOW), 'none');
  assert.equal(resolveSubscriptionStatus({ status: 'none', plan: 'standard' }, NOW), 'none');
  assert.equal(resolveSubscriptionStatus({ status: 'pending', plan: 'standard' }, NOW), 'pending');
  assert.equal(resolveSubscriptionStatus({ status: 'suspended', plan: 'standard' }, NOW), 'suspended');

  const futur: BoutiqueSubscription = { status: 'active', plan: 'standard', currentPeriodEnd: addDays(NOW, 5) };
  assert.equal(resolveSubscriptionStatus(futur, NOW), 'active');

  // Marqué actif mais période dépassée -> expiré
  const perime: BoutiqueSubscription = { status: 'active', plan: 'standard', currentPeriodEnd: addDays(NOW, -1) };
  assert.equal(resolveSubscriptionStatus(perime, NOW), 'expired');
});

test('canBoutiqueOperate exige un abonnement actif', () => {
  assert.equal(canBoutiqueOperate({ subscription: undefined }, NOW), false);
  assert.equal(
    canBoutiqueOperate({ subscription: { status: 'active', plan: 'standard', currentPeriodEnd: addDays(NOW, 3) } }, NOW),
    true,
  );
  assert.equal(
    canBoutiqueOperate({ subscription: { status: 'active', plan: 'standard', currentPeriodEnd: addDays(NOW, -3) } }, NOW),
    false,
  );
  assert.equal(canBoutiqueOperate({ subscription: { status: 'suspended', plan: 'standard' } }, NOW), false);
});

test('applyApprovedPayment cumule le temps restant au lieu de le perdre', () => {
  // Première activation : démarre maintenant, +30 jours
  const first = applyApprovedPayment(undefined, 'bank_transfer', NOW);
  assert.equal(first.subscription.status, 'active');
  assert.equal(first.periodEnd, addDays(NOW, 30));
  assert.equal(first.subscription.lastPaymentMethod, 'bank_transfer');

  // Renouvellement anticipé : encore 10 jours actifs -> repart de la fin, pas de now
  const encoreActif: BoutiqueSubscription = {
    status: 'active',
    plan: 'standard',
    currentPeriodEnd: addDays(NOW, 10),
  };
  const renew = applyApprovedPayment(encoreActif, 'chargily', NOW);
  assert.equal(renew.periodStart, addDays(NOW, 10));
  assert.equal(renew.periodEnd, addDays(addDays(NOW, 10), 30));

  // Renouvellement après expiration : repart de maintenant
  const expire: BoutiqueSubscription = {
    status: 'active',
    plan: 'standard',
    currentPeriodEnd: addDays(NOW, -5),
  };
  const afterExpiry = applyApprovedPayment(expire, 'bank_transfer', NOW);
  assert.equal(afterExpiry.periodStart, NOW);
  assert.equal(afterExpiry.periodEnd, addDays(NOW, 30));
});

test('daysUntilExpiry renvoie les jours entiers restants', () => {
  assert.equal(daysUntilExpiry(undefined, NOW), null);
  assert.equal(
    daysUntilExpiry({ status: 'active', plan: 'standard', currentPeriodEnd: addDays(NOW, 7) }, NOW),
    7,
  );
  assert.equal(
    daysUntilExpiry({ status: 'active', plan: 'standard', currentPeriodEnd: addDays(NOW, -2) }, NOW),
    -2,
  );
});

test('prepareManualPayment valide montant, référence et chemin de preuve', () => {
  const uid = 'owner-1';
  const boutiqueId = 'boutique_owner-1';
  const goodPath = `subscription-proofs/${uid}/${boutiqueId}/proof-123.jpg`;

  const ok = prepareManualPayment(
    { method: 'bank_transfer', amountDzd: SUBSCRIPTION_PRICE_DZD, reference: 'BR-12345', proofPath: goodPath },
    uid,
    boutiqueId,
  );
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.value.amountDzd, SUBSCRIPTION_PRICE_DZD);
    assert.equal(ok.value.reference, 'BR-12345');
    assert.equal(ok.value.proofPath, goodPath);
  }

  // Montant trop bas
  assert.equal(
    prepareManualPayment(
      { method: 'bank_transfer', amountDzd: 500, reference: 'BR-1', proofPath: goodPath },
      uid,
      boutiqueId,
    ).ok,
    false,
  );

  // Référence absente
  assert.equal(
    prepareManualPayment(
      { method: 'bank_transfer', amountDzd: SUBSCRIPTION_PRICE_DZD, reference: '', proofPath: goodPath },
      uid,
      boutiqueId,
    ).ok,
    false,
  );

  // Chemin appartenant à une autre boutique
  const otherPath = `subscription-proofs/autre/${boutiqueId}/proof-1.jpg`;
  assert.equal(
    prepareManualPayment(
      { method: 'bank_transfer', amountDzd: SUBSCRIPTION_PRICE_DZD, reference: 'BR-1', proofPath: otherPath },
      uid,
      boutiqueId,
    ).ok,
    false,
  );

  // Méthode non gérée par ce chemin (chargily passe ailleurs)
  assert.equal(
    prepareManualPayment(
      { method: 'chargily', amountDzd: SUBSCRIPTION_PRICE_DZD, reference: 'BR-1', proofPath: goodPath },
      uid,
      boutiqueId,
    ).ok,
    false,
  );
});

import assert from 'node:assert/strict';
import test from 'node:test';

import { Boutique, Product, UserRole } from '../src/types';
import { getAccountBlockingMessage, normalizedAccountStatus } from '../src/utils/accountAccess';
import { buildBoutiqueAdminTransition } from '../src/utils/adminTransitions';
import { getChatAccessError } from '../src/utils/chatAccess';
import { prepareBoutiqueRegistration } from '../src/utils/boutiqueRegistration';
import { rollbackBoutiqueRegistration } from '../src/utils/registrationRollback';
import {
  calculateDeliveredStock,
  getReservationSelectionError,
  isOrderStatusTransitionAllowed,
  normalizeProductForPersistence,
} from '../src/utils/commerceRules';

const boutique: Boutique = {
  id: 'boutique_owner-1',
  ownerId: 'owner-1',
  name: 'Atelier Test',
  slug: 'atelier-test',
  description: 'Boutique de test',
  logo: 'https://example.com/logo.webp',
  coverImage: 'https://example.com/cover.webp',
  location: { city: 'Alger', country: 'Algérie' },
  categories: ['Mode'],
  tags: [],
  social: {},
  stats: { productsCount: 1, followersCount: 0, viewsCount: 0 },
  isVerified: true,
  isFeatured: false,
  isSuspended: false,
  verificationStatus: 'verified',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const product: Product = {
  id: 'product-1',
  boutiqueId: boutique.id,
  boutiqueName: boutique.name,
  boutiqueLogo: boutique.logo,
  name: 'Mocassins',
  description: 'Produit de test',
  price: 12000,
  currency: 'DZD',
  images: [{ url: 'https://example.com/product.webp', width: 800, height: 1080 }],
  category: 'Chaussures',
  styles: ['Élégant'],
  colors: ['Noir', 'Camel'],
  sizes: ['38', '39', '40'],
  shoeSizeMin: 38,
  shoeSizeMax: 40,
  stock: 2,
  materials: ['Cuir'],
  tags: [],
  stats: { views: 0, favorites: 0, clicks: 0 },
  isAvailable: true,
  isFeatured: false,
  searchKeywords: ['mocassins'],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

test('2.1 — les clients anciens restent approuvés, les boutiques restent en attente', () => {
  assert.equal(normalizedAccountStatus({ role: UserRole.CLIENT }), 'approved');
  assert.equal(normalizedAccountStatus({ role: UserRole.ADMIN }), 'approved');
  assert.equal(normalizedAccountStatus({ role: UserRole.BOUTIQUE }), 'pending');
  assert.equal(normalizedAccountStatus({ role: UserRole.BOUTIQUE, accountStatus: 'suspended' }), 'suspended');
});

test('2.1 — les états bloquants donnent un message compréhensible', () => {
  assert.equal(getAccountBlockingMessage({ role: UserRole.CLIENT }), null);
  assert.match(getAccountBlockingMessage({ role: UserRole.BOUTIQUE }) || '', /attente/i);
  assert.match(
    getAccountBlockingMessage({ role: UserRole.BOUTIQUE, accountStatus: 'rejected', approvalRejectionReason: 'Dossier incomplet' }) || '',
    /Dossier incomplet/,
  );
  assert.match(getAccountBlockingMessage({ role: UserRole.BOUTIQUE, accountStatus: 'suspended' }) || '', /suspendu/i);
});

test('2.2 — le dossier boutique est lié au propriétaire et reste en attente', () => {
  const uid = 'owner-12345678';
  const boutiqueId = `boutique_${uid}`;
  const logoPath = `boutique-media/${uid}/${boutiqueId}/logos/registration-logo-1.webp`;
  const result = prepareBoutiqueRegistration(
    { uid, email: 'owner@example.com' },
    {
      boutiqueId,
      name: 'Éclat Alger',
      logoStoragePath: logoPath,
      logo: `https://firebasestorage.googleapis.com/v0/b/store-hub/o/${encodeURIComponent(logoPath)}?alt=media`,
      verificationDocName: 'registre-commerce.pdf',
      verificationDocPath: `boutique-verification/${uid}/${boutiqueId}/registration-1.pdf`,
    },
    '2026-09-17T12:00:00.000Z',
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.user.accountStatus, 'pending');
  assert.equal(result.user.boutiqueId, boutiqueId);
  assert.equal(result.boutique.verificationStatus, 'pending');
  assert.equal(result.boutique.isVerified, false);
  assert.equal(result.application.ownerId, uid);
  assert.equal(result.boutique.slug, 'eclat-alger-owner-12');
});

test('2.2 — un dossier ne peut pas réutiliser les fichiers d’un autre compte', () => {
  const result = prepareBoutiqueRegistration(
    { uid: 'owner-1', email: 'owner@example.com' },
    {
      boutiqueId: 'boutique_owner-1',
      name: 'Boutique Test',
      logoStoragePath: 'boutique-media/other/boutique_other/logos/logo.webp',
      logo: 'https://firebasestorage.googleapis.com/v0/b/store-hub/o/logo.webp',
      verificationDocName: 'document.pdf',
      verificationDocPath: 'boutique-verification/other/boutique_other/registration-1.pdf',
    },
    '2026-09-17T12:00:00.000Z',
  );
  assert.equal(result.ok, false);
  assert.match('error' in result ? result.error : '', /Storage invalide/i);
});

test('2.2 — le rollback supprime tous les fichiers puis le compte Auth, même après un échec partiel', async () => {
  const attempts: string[] = [];
  const failures = await rollbackBoutiqueRegistration(
    ['logo.webp', 'document.pdf'],
    { uid: 'owner-1' },
    async (path) => {
      attempts.push(path);
      if (path === 'document.pdf') throw new Error('temporary storage error');
    },
    async (user) => { attempts.push(`auth:${user.uid}`); },
  );
  assert.deepEqual(attempts, ['document.pdf', 'logo.webp', 'auth:owner-1']);
  assert.equal(failures.length, 1);
  assert.equal(failures[0].target, 'document.pdf');
});

test('2.3 — création et modification appliquent les mêmes règles de tailles et de stock', () => {
  const clothing = normalizeProductForPersistence({
    category: 'T-shirts',
    sizes: ['S', 'M'],
    stock: 4.8,
    isAvailable: true,
  });
  assert.equal(clothing.ok, true);
  if (!clothing.ok) return;
  assert.deepEqual(clothing.product.sizes, ['S', 'M', 'XL', 'XXL']);
  assert.equal(clothing.product.stock, 4);

  const editedShoe = normalizeProductForPersistence({ shoeSizeMin: 36, shoeSizeMax: 42 }, product);
  assert.equal(editedShoe.ok, true);
  if (!editedShoe.ok) return;
  assert.deepEqual(editedShoe.product.sizes, ['36', '37', '38', '39', '40', '41', '42']);
  assert.equal(editedShoe.product.currency, 'DZD');

  const soldOut = normalizeProductForPersistence({ stock: 0, isAvailable: true }, product);
  assert.equal(soldOut.ok, true);
  if (soldOut.ok) assert.equal(soldOut.product.isAvailable, false);
});

test('2.3 — une plage de pointures invalide est refusée aussi pendant la modification', () => {
  const result = normalizeProductForPersistence({ shoeSizeMin: 42, shoeSizeMax: 38 }, product);
  assert.equal(result.ok, false);
  assert.match('error' in result ? result.error : '', /minimale.*inférieure/i);
});

test('2.4 — une réservation refuse rupture, mauvaise taille et mauvaise couleur', () => {
  assert.equal(getReservationSelectionError(product, '39', 'Noir'), null);
  assert.match(getReservationSelectionError(product, '47', 'Noir') || '', /taille/i);
  assert.match(getReservationSelectionError(product, '39', 'Rose') || '', /couleur/i);
  assert.match(getReservationSelectionError({ ...product, stock: 0 }, '39', 'Noir') || '', /plus disponible/i);
});

test('2.4 — le stock se décrémente à la livraison, se restaure au retour arrière', () => {
  assert.deepEqual(calculateDeliveredStock('en_cours', 'livre', 2, 1), {
    changed: true,
    remainingStock: 1,
    isAvailable: true,
  });
  assert.deepEqual(calculateDeliveredStock('livre', 'livre', 1, 1), { changed: false });
  assert.deepEqual(calculateDeliveredStock('en_attente', 'en_cours', 2, 1), { changed: false });
  assert.throws(() => calculateDeliveredStock('en_cours', 'livre', 0, 1), /Stock insuffisant/);

  // La boutique gère la livraison manuellement : livre -> en_cours restaure le stock
  // et rend l'article de nouveau disponible sans autorisation supplémentaire.
  assert.deepEqual(calculateDeliveredStock('livre', 'en_cours', 0, 2), {
    changed: true,
    remainingStock: 2,
    isAvailable: true,
  });
  assert.deepEqual(calculateDeliveredStock('livre', 'en_attente', 1, 1), {
    changed: true,
    remainingStock: 2,
    isAvailable: true,
  });

  assert.equal(isOrderStatusTransitionAllowed('en_attente', 'en_cours'), true);
  assert.equal(isOrderStatusTransitionAllowed('en_cours', 'livre'), true);
  assert.equal(isOrderStatusTransitionAllowed('livre', 'en_cours'), true);
  assert.equal(isOrderStatusTransitionAllowed('livre', 'en_attente'), true);
});

test('2.5 — un client ne peut écrire que dans son fil et sous son identité', () => {
  const valid = {
    senderRole: 'client', senderId: 'client-1', clientId: 'client-1',
    boutiqueId: boutique.id, boutiqueOwnerId: boutique.ownerId,
    chatId: `client-1_${boutique.id}`,
  };
  assert.equal(getChatAccessError('client-1', { role: UserRole.CLIENT }, boutique, valid), null);
  assert.match(
    getChatAccessError('client-1', { role: UserRole.CLIENT }, boutique, {
      ...valid,
      clientId: 'client-2',
      chatId: `client-2_${boutique.id}`,
    }) || '',
    /propre nom/i,
  );
});

test('2.5 — un gérant ne peut répondre que pour sa propre boutique', () => {
  const valid = {
    senderRole: 'boutique', senderId: boutique.ownerId, clientId: 'client-1',
    boutiqueId: boutique.id, boutiqueOwnerId: boutique.ownerId,
    chatId: `client-1_${boutique.id}`,
  };
  assert.equal(getChatAccessError(boutique.ownerId, { role: UserRole.BOUTIQUE }, boutique, valid), null);
  assert.match(
    getChatAccessError('other-owner', { role: UserRole.BOUTIQUE }, boutique, { ...valid, senderId: 'other-owner' }) || '',
    /propre boutique/i,
  );
});

test('2.6 — certifier, suspendre, réactiver et révoquer synchronisent les trois documents', () => {
  const now = '2026-09-17T12:00:00.000Z';
  const certified = buildBoutiqueAdminTransition({ ...boutique, isVerified: false, verificationStatus: 'pending' }, { isVerified: true }, now);
  assert.equal(certified.boutiqueUpdates.verificationStatus, 'verified');
  assert.equal(certified.applicationUpdates.status, 'verified');
  assert.equal(certified.ownerUpdates?.accountStatus, 'approved');

  const suspended = buildBoutiqueAdminTransition(boutique, { isSuspended: true }, now);
  assert.equal(suspended.boutiqueUpdates.verificationStatus, 'suspended');
  assert.equal(suspended.ownerUpdates?.accountStatus, 'suspended');

  const reactivated = buildBoutiqueAdminTransition({ ...boutique, isSuspended: true, verificationStatus: 'suspended' }, { isSuspended: false }, now);
  assert.equal(reactivated.boutiqueUpdates.verificationStatus, 'verified');
  assert.equal(reactivated.ownerUpdates?.accountStatus, 'approved');

  const revoked = buildBoutiqueAdminTransition(boutique, { isVerified: false }, now);
  assert.equal(revoked.boutiqueUpdates.verificationStatus, 'pending');
  assert.equal(revoked.ownerUpdates?.accountStatus, 'pending');
});

test('2.2 et 2.6 — les routes sensibles refusent toutes un appel sans identité Firebase', async () => {
  process.env.STOREHUB_SKIP_SERVER_START = '1';
  const { app } = await import('../server');
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const health = await fetch(`${baseUrl}/api/health`);
    assert.equal(health.status, 200);
    assert.equal((await health.json() as { status: string }).status, 'ok');

    const protectedRequests: Array<[string, RequestInit | undefined]> = [
      ['/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }],
      ['/api/products/product-1', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{}' }],
      ['/api/products/product-1', { method: 'DELETE' }],
      ['/api/orders?boutiqueId=boutique-1', undefined],
      ['/api/reservations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }],
      ['/api/chats/messages?chatId=x', undefined],
      ['/api/admin/users', undefined],
      ['/api/admin/boutiques/boutique-1', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{}' }],
      ['/api/admin/moderation-notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }],
    ];
    for (const [path, init] of protectedRequests) {
      const response = await fetch(`${baseUrl}${path}`, init);
      assert.equal(response.status, 401, `${path} doit exiger Firebase Auth`);
    }
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

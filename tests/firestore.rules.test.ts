import { after, before, beforeEach, describe, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const PROJECT_ID = 'demo-storehub';
let testEnv: RulesTestEnvironment;

const verifiedToken = (email: string) => ({ email, email_verified: true });
const unverifiedToken = (email: string) => ({ email, email_verified: false });

async function seedFirestore() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, 'users/client-a'), { uid: 'client-a', email: 'client-a@test.dev', role: 'client', accountStatus: 'approved', createdAt: '2026-01-01' }),
      setDoc(doc(db, 'users/client-b'), { uid: 'client-b', email: 'client-b@test.dev', role: 'client', accountStatus: 'approved', createdAt: '2026-01-01' }),
      setDoc(doc(db, 'users/store-a'), { uid: 'store-a', email: 'store-a@test.dev', role: 'boutique', accountStatus: 'approved', boutiqueId: 'boutique-a', createdAt: '2026-01-01' }),
      setDoc(doc(db, 'users/store-b'), { uid: 'store-b', email: 'store-b@test.dev', role: 'boutique', accountStatus: 'approved', boutiqueId: 'boutique-b', createdAt: '2026-01-01' }),
      setDoc(doc(db, 'users/store-pending'), { uid: 'store-pending', email: 'pending@test.dev', role: 'boutique', accountStatus: 'pending', boutiqueId: 'boutique-pending', createdAt: '2026-01-01' }),
      setDoc(doc(db, 'users/admin-a'), { uid: 'admin-a', email: 'admin@test.dev', role: 'admin', accountStatus: 'approved', createdAt: '2026-01-01' }),
      setDoc(doc(db, 'boutiques/boutique-a'), { id: 'boutique-a', ownerId: 'store-a', name: 'Boutique A', verificationStatus: 'verified', stats: { viewsCount: 0 } }),
      setDoc(doc(db, 'boutiques/boutique-b'), { id: 'boutique-b', ownerId: 'store-b', name: 'Boutique B', verificationStatus: 'verified', stats: { viewsCount: 0 } }),
      setDoc(doc(db, 'boutiques/boutique-pending'), { id: 'boutique-pending', ownerId: 'store-pending', name: 'Boutique Pending', verificationStatus: 'pending', stats: { viewsCount: 0 } }),
      setDoc(doc(db, 'products/product-a'), { id: 'product-a', boutiqueId: 'boutique-a', name: 'Chemise', stats: { views: 0 } }),
      setDoc(doc(db, 'orders/order-a'), { id: 'order-a', boutiqueId: 'boutique-a', clientId: 'client-a', clientName: 'Client A', source: 'reservation' }),
      setDoc(doc(db, 'boutiqueApplications/boutique-a'), { boutiqueId: 'boutique-a', ownerId: 'store-a', status: 'pending', verificationDocName: 'registre.pdf', verificationDocPath: 'boutique-verification/store-a/boutique-a/registration-1.pdf', submittedAt: '2026-01-01' }),
      setDoc(doc(db, 'chats/client-a_boutique-a_msg-1'), {
        id: 'client-a_boutique-a_msg-1', chatId: 'client-a_boutique-a', clientId: 'client-a', clientName: 'Client A', clientPhoto: '',
        boutiqueId: 'boutique-a', boutiqueOwnerId: 'store-a', boutiqueName: 'Boutique A', boutiqueLogo: '', senderId: 'client-a',
        senderName: 'Client A', senderRole: 'client', text: 'Bonjour', createdAt: '2026-01-01',
      }),
      setDoc(doc(db, 'moderationNotes/note-a'), {
        id: 'note-a', boutiqueId: 'boutique-a', boutiqueOwnerId: 'store-a', boutiqueName: 'Boutique A',
        productId: 'product-a', productName: 'Chemise', productImage: '', text: 'Photo à corriger',
        severity: 'action_required', status: 'open', createdByUid: 'admin-a', createdByName: 'Admin',
        createdAt: '2026-01-01', updatedAt: '2026-01-01',
      }),
    ]);
  });
}

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await seedFirestore();
});

after(async () => testEnv.cleanup());

describe('Règles Firestore StoreHub', () => {
  test('le catalogue public reste lisible sans authentification', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    assert.equal((await assertSucceeds(getDoc(doc(db, 'boutiques/boutique-a')))).data()?.name, 'Boutique A');
    await assertSucceeds(getDoc(doc(db, 'products/product-a')));
  });

  test('un client ne lit que son profil et ses propres commandes', async () => {
    const db = testEnv.authenticatedContext('client-a', verifiedToken('client-a@test.dev')).firestore();
    await assertSucceeds(getDoc(doc(db, 'users/client-a')));
    await assertFails(getDoc(doc(db, 'users/client-b')));
    await assertSucceeds(getDoc(doc(db, 'orders/order-a')));

    const otherDb = testEnv.authenticatedContext('client-b', verifiedToken('client-b@test.dev')).firestore();
    await assertFails(getDoc(doc(otherDb, 'orders/order-a')));
  });

  test('un client approuvé accède immédiatement, mais une boutique en attente reste bloquée', async () => {
    const unverified = testEnv.authenticatedContext('client-a', unverifiedToken('client-a@test.dev')).firestore();
    await assertSucceeds(getDoc(doc(unverified, 'orders/order-a')));

    const pending = testEnv.authenticatedContext('store-pending', verifiedToken('pending@test.dev')).firestore();
    await assertFails(setDoc(doc(pending, 'products/pending-product'), {
      id: 'pending-product', boutiqueId: 'boutique-pending', name: 'Article interdit',
    }));
  });

  test('un nouveau client doit déclarer une pièce d’identité privée en attente', async () => {
    const db = testEnv.authenticatedContext('client-new', unverifiedToken('client-new@test.dev')).firestore();
    await assertSucceeds(setDoc(doc(db, 'users/client-new'), {
      uid: 'client-new', email: 'client-new@test.dev', role: 'client', accountStatus: 'approved',
      displayName: 'Client New', photoURL: '', createdAt: '2026-01-01', approvalSubmittedAt: '2026-01-01',
      identityDocumentName: 'identite.pdf',
      identityDocumentPath: 'client-identity/client-new/identity-100.pdf',
      identityVerificationStatus: 'pending', identitySubmittedAt: '2026-01-01',
    }));
    await assertFails(setDoc(doc(db, 'users/client-forged'), {
      uid: 'client-new', email: 'client-new@test.dev', role: 'client', accountStatus: 'approved',
      createdAt: '2026-01-01', approvalSubmittedAt: '2026-01-01',
      identityDocumentName: 'identite.pdf',
      identityDocumentPath: 'client-identity/other-user/identity-100.pdf',
      identityVerificationStatus: 'pending',
    }));
  });

  test('un gérant modifie son catalogue mais jamais celui d’une autre boutique', async () => {
    const ownDb = testEnv.authenticatedContext('store-a', verifiedToken('store-a@test.dev')).firestore();
    await assertSucceeds(setDoc(doc(ownDb, 'products/product-created'), {
      id: 'product-created', boutiqueId: 'boutique-a', name: 'Pantalon',
    }));
    await assertSucceeds(updateDoc(doc(ownDb, 'products/product-a'), { name: 'Chemise premium' }));

    const otherDb = testEnv.authenticatedContext('store-b', verifiedToken('store-b@test.dev')).firestore();
    await assertFails(updateDoc(doc(otherDb, 'products/product-a'), { name: 'Intrusion' }));
  });

  test('une réservation doit appartenir au client authentifié', async () => {
    const db = testEnv.authenticatedContext('client-a', verifiedToken('client-a@test.dev')).firestore();
    await assertSucceeds(setDoc(doc(db, 'orders/reservation-ok'), {
      id: 'reservation-ok', boutiqueId: 'boutique-a', clientId: 'client-a', clientName: 'Client A', source: 'reservation',
    }));
    await assertFails(setDoc(doc(db, 'orders/reservation-forged'), {
      id: 'reservation-forged', boutiqueId: 'boutique-a', clientId: 'client-b', clientName: 'Client B', source: 'reservation',
    }));
  });

  test('la messagerie est limitée aux deux participants et à l’admin', async () => {
    const clientDb = testEnv.authenticatedContext('client-a', verifiedToken('client-a@test.dev')).firestore();
    const ownerDb = testEnv.authenticatedContext('store-a', verifiedToken('store-a@test.dev')).firestore();
    const outsiderDb = testEnv.authenticatedContext('client-b', verifiedToken('client-b@test.dev')).firestore();
    const adminDb = testEnv.authenticatedContext('admin-a', verifiedToken('admin@test.dev')).firestore();
    const path = 'chats/client-a_boutique-a_msg-1';
    await assertSucceeds(getDoc(doc(clientDb, path)));
    await assertSucceeds(getDoc(doc(ownerDb, path)));
    await assertFails(getDoc(doc(outsiderDb, path)));
    await assertSucceeds(getDoc(doc(adminDb, path)));
  });

  test('seul un administrateur peut supprimer les données privées d’une boutique', async () => {
    const adminDb = testEnv.authenticatedContext('admin-a', verifiedToken('admin@test.dev')).firestore();
    const ownerDb = testEnv.authenticatedContext('store-a', verifiedToken('store-a@test.dev')).firestore();

    await assertFails(deleteDoc(doc(ownerDb, 'moderationNotes/note-a')));
    await assertFails(deleteDoc(doc(ownerDb, 'chats/client-a_boutique-a_msg-1')));
    await assertSucceeds(deleteDoc(doc(adminDb, 'moderationNotes/note-a')));
    await assertSucceeds(deleteDoc(doc(adminDb, 'chats/client-a_boutique-a_msg-1')));
  });

  test('seul un administrateur peut supprimer un profil client', async () => {
    const adminDb = testEnv.authenticatedContext('admin-a', verifiedToken('admin@test.dev')).firestore();
    const clientDb = testEnv.authenticatedContext('client-a', verifiedToken('client-a@test.dev')).firestore();
    await assertFails(deleteDoc(doc(clientDb, 'users/client-a')));
    await assertSucceeds(deleteDoc(doc(adminDb, 'users/client-a')));
  });

  test('le dossier légal est privé pour le propriétaire et l’admin', async () => {
    const ownerDb = testEnv.authenticatedContext('store-a', verifiedToken('store-a@test.dev')).firestore();
    const otherDb = testEnv.authenticatedContext('store-b', verifiedToken('store-b@test.dev')).firestore();
    const adminDb = testEnv.authenticatedContext('admin-a', verifiedToken('admin@test.dev')).firestore();
    const path = 'boutiqueApplications/boutique-a';
    await assertSucceeds(getDoc(doc(ownerDb, path)));
    await assertFails(getDoc(doc(otherDb, path)));
    await assertSucceeds(getDoc(doc(adminDb, path)));
  });

  test('seul un administrateur peut suspendre ou vérifier une boutique', async () => {
    const adminDb = testEnv.authenticatedContext('admin-a', verifiedToken('admin@test.dev')).firestore();
    const clientDb = testEnv.authenticatedContext('client-a', verifiedToken('client-a@test.dev')).firestore();
    await assertSucceeds(updateDoc(doc(adminDb, 'boutiques/boutique-a'), { isSuspended: true }));
    await assertFails(updateDoc(doc(clientDb, 'boutiques/boutique-a'), { isSuspended: false }));
  });
});

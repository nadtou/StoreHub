import { after, before, describe, test } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteObject, getBytes, ref, uploadBytes } from 'firebase/storage';

const PROJECT_ID = 'demo-storehub';
let testEnv: RulesTestEnvironment;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    storage: { rules: readFileSync('storage.rules', 'utf8') },
  });
});

after(async () => testEnv.cleanup());

describe('Règles Storage StoreHub', () => {
  test('le propriétaire envoie une image WebP de moins de 1 Mo', async () => {
    const storage = testEnv.authenticatedContext('store-a').storage();
    await assertSucceeds(uploadBytes(
      ref(storage, 'boutique-media/store-a/boutique-a/logos/logo-1.webp'),
      new Uint8Array(512),
      { contentType: 'image/webp', customMetadata: { boutiqueId: 'boutique-a' } },
    ));
  });

  test('une image trop lourde, un faux type ou un autre propriétaire sont refusés', async () => {
    const ownerStorage = testEnv.authenticatedContext('store-a').storage();
    const outsiderStorage = testEnv.authenticatedContext('store-b').storage();
    const path = 'boutique-media/store-a/boutique-a/covers/cover-denied.webp';

    await assertFails(uploadBytes(ref(ownerStorage, path), new Uint8Array(1024 * 1024 + 1), {
      contentType: 'image/webp', customMetadata: { boutiqueId: 'boutique-a' },
    }));
    await assertFails(uploadBytes(ref(ownerStorage, path), new Uint8Array(128), {
      contentType: 'text/plain', customMetadata: { boutiqueId: 'boutique-a' },
    }));
    await assertFails(uploadBytes(ref(outsiderStorage, path), new Uint8Array(128), {
      contentType: 'image/webp', customMetadata: { boutiqueId: 'boutique-a' },
    }));
  });

  test('un avatar ne peut être modifié que par son utilisateur', async () => {
    const ownerStorage = testEnv.authenticatedContext('client-a').storage();
    const otherStorage = testEnv.authenticatedContext('client-b').storage();
    const path = 'users/client-a/avatars/avatar-1.webp';
    await assertSucceeds(uploadBytes(ref(ownerStorage, path), new Uint8Array(256), { contentType: 'image/webp' }));
    await assertFails(uploadBytes(ref(otherStorage, path), new Uint8Array(256), { contentType: 'image/webp' }));
  });

  test('le document légal respecte format, poids, chemin et métadonnées', async () => {
    const storage = testEnv.authenticatedContext('store-a').storage();
    const validPath = 'boutique-verification/store-a/boutique-a/registration-100.pdf';
    await assertSucceeds(uploadBytes(ref(storage, validPath), new Uint8Array(1024), {
      contentType: 'application/pdf',
      customMetadata: { ownerId: 'store-a', boutiqueId: 'boutique-a', documentType: 'legal-verification' },
    }));

    await assertFails(uploadBytes(ref(storage, 'boutique-verification/store-a/boutique-a/evil.exe'), new Uint8Array(32), {
      contentType: 'application/octet-stream',
      customMetadata: { ownerId: 'store-a', boutiqueId: 'boutique-a', documentType: 'legal-verification' },
    }));
    await assertFails(uploadBytes(ref(storage, 'boutique-verification/store-a/boutique-a/registration-101.pdf'), new Uint8Array(32), {
      contentType: 'application/pdf',
      customMetadata: { ownerId: 'store-b', boutiqueId: 'boutique-a', documentType: 'legal-verification' },
    }));
  });

  test('les documents légaux sont lisibles uniquement par le propriétaire ou un admin', async () => {
    const ownerStorage = testEnv.authenticatedContext('store-a').storage();
    const otherStorage = testEnv.authenticatedContext('store-b').storage();
    const adminStorage = testEnv.authenticatedContext('admin-a', { role: 'admin' }).storage();
    const path = 'boutique-verification/store-a/boutique-a/registration-200.webp';
    await assertSucceeds(uploadBytes(ref(ownerStorage, path), new Uint8Array(128), {
      contentType: 'image/webp',
      customMetadata: { ownerId: 'store-a', boutiqueId: 'boutique-a', documentType: 'legal-verification' },
    }));
    await assertSucceeds(getBytes(ref(ownerStorage, path)));
    await assertFails(getBytes(ref(otherStorage, path)));
    await assertSucceeds(getBytes(ref(adminStorage, path)));
  });

  test('la pièce d’identité client est privée et peut être nettoyée par l’admin', async () => {
    const ownerStorage = testEnv.authenticatedContext('client-a').storage();
    const otherStorage = testEnv.authenticatedContext('client-b').storage();
    const adminStorage = testEnv.authenticatedContext('admin-a', { role: 'admin' }).storage();
    const path = 'client-identity/client-a/identity-300.pdf';
    await assertSucceeds(uploadBytes(ref(ownerStorage, path), new Uint8Array(256), {
      contentType: 'application/pdf',
      customMetadata: { userId: 'client-a', documentType: 'client-identity' },
    }));
    await assertSucceeds(getBytes(ref(ownerStorage, path)));
    await assertFails(getBytes(ref(otherStorage, path)));
    await assertSucceeds(getBytes(ref(adminStorage, path)));
    await assertSucceeds(deleteObject(ref(adminStorage, path)));
  });

  test('un propriétaire peut supprimer son fichier, jamais celui d’un autre', async () => {
    const ownerStorage = testEnv.authenticatedContext('store-a').storage();
    const otherStorage = testEnv.authenticatedContext('store-b').storage();
    const path = 'boutique-media/store-a/boutique-a/products/product-delete.webp';
    await assertSucceeds(uploadBytes(ref(ownerStorage, path), new Uint8Array(128), {
      contentType: 'image/webp', customMetadata: { boutiqueId: 'boutique-a' },
    }));
    await assertFails(deleteObject(ref(otherStorage, path)));
    await assertSucceeds(deleteObject(ref(ownerStorage, path)));
  });
});

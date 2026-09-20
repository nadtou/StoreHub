import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { strict as assert } from 'node:assert';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';

const temporaryDirectory = mkdtempSync(join(tmpdir(), 'storehub-backup-roundtrip-'));
const snapshotPath = join(temporaryDirectory, 'firestore-snapshot.json');
const environment = await initializeTestEnvironment({ projectId: 'demo-storehub-backup' });

try {
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'backupValidation/phase-3'), {
      marker: 'STOREHUB_BACKUP_OK',
      nested: { stock: 7, status: 'verified' },
      createdAt: '2026-09-17T00:00:00.000Z',
    });
    await setDoc(doc(db, 'backupValidation/phase-3-secondary'), {
      marker: 'STOREHUB_SECOND_DOCUMENT',
      active: true,
    });

    const documents = await getDocs(collection(db, 'backupValidation'));
    const snapshot = documents.docs.map((entry) => ({ id: entry.id, data: entry.data() }));
    writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), 'utf8');
  });

  await environment.clearFirestore();
  const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8')) as Array<{ id: string; data: Record<string, unknown> }>;
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    for (const entry of snapshot) await setDoc(doc(db, 'backupValidation', entry.id), entry.data);

    const restored = await getDoc(doc(db, 'backupValidation/phase-3'));
    assert.equal(restored.exists(), true, 'Le document sauvegardé n’a pas été restauré.');
    assert.equal(restored.data()?.marker, 'STOREHUB_BACKUP_OK');
    assert.deepEqual(restored.data()?.nested, { stock: 7, status: 'verified' });
    assert.equal((await getDocs(collection(db, 'backupValidation'))).size, 2);
  });
} finally {
  await environment.cleanup();
  const resolvedTemporaryDirectory = resolve(temporaryDirectory);
  const resolvedTempRoot = resolve(tmpdir());
  if (!resolvedTemporaryDirectory.startsWith(`${resolvedTempRoot}\\`) || !resolvedTemporaryDirectory.includes('storehub-backup-roundtrip-')) {
    throw new Error(`Refus de supprimer un dossier inattendu : ${resolvedTemporaryDirectory}`);
  }
  rmSync(resolvedTemporaryDirectory, { recursive: true, force: true });
}

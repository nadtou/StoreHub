import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveStoreHubApiUrl, STOREHUB_PUBLIC_URL } from '../src/config/runtimeUrls';

test('l’adresse publique de secours utilise Firebase Hosting en HTTPS', () => {
  assert.equal(STOREHUB_PUBLIC_URL, 'https://store-hub-2026.web.app');
});

test('une route API relative utilise le domaine de production configuré', () => {
  assert.equal(
    resolveStoreHubApiUrl('/api/products', 'https://api.storehub.example'),
    'https://api.storehub.example/api/products',
  );
});

test('le développement local conserve les routes relatives sans origine configurée', () => {
  assert.equal(resolveStoreHubApiUrl('/api/health', ''), '/api/health');
});

test('une origine distante non sécurisée est refusée', () => {
  assert.throws(
    () => resolveStoreHubApiUrl('/api/products', 'http://api.storehub.example'),
    /HTTPS/,
  );
});

test('les URL externes et les objets URL ne sont pas transformés', () => {
  const external = 'https://firebasestorage.googleapis.com/example';
  const objectUrl = new URL('https://example.com/data');
  assert.equal(resolveStoreHubApiUrl(external, 'https://api.storehub.example'), external);
  assert.equal(resolveStoreHubApiUrl(objectUrl, 'https://api.storehub.example'), objectUrl);
});

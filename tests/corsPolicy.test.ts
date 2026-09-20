import assert from 'node:assert/strict';
import test from 'node:test';
import { isStoreHubOriginAllowed, parseAllowedOrigins } from '../src/utils/corsPolicy';

test('la production autorise Firebase Hosting et Capacitor', () => {
  const origins = parseAllowedOrigins(
    'https://store-hub-2026.web.app, capacitor://localhost',
  );

  assert.equal(isStoreHubOriginAllowed('https://store-hub-2026.web.app', origins), true);
  assert.equal(isStoreHubOriginAllowed('capacitor://localhost', origins), true);
  assert.equal(isStoreHubOriginAllowed('https://example.com', origins), false);
});

test('les requêtes natives sans Origin restent autorisées', () => {
  const origins = parseAllowedOrigins('https://store-hub-2026.web.app');
  assert.equal(isStoreHubOriginAllowed(undefined, origins), true);
});

test('une liste vide conserve le développement local ouvert', () => {
  assert.equal(isStoreHubOriginAllowed('http://localhost:3000', new Set()), true);
});

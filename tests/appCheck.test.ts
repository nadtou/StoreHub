import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { decideAppCheckAccess, parseAppCheckMode } from '../src/utils/appCheckPolicy';

describe('Politique App Check', () => {
  test('utilise le mode observation par défaut', () => {
    assert.equal(parseAppCheckMode(undefined), 'monitor');
    assert.equal(parseAppCheckMode('ENFORCE'), 'enforce');
    assert.equal(parseAppCheckMode('valeur-inconnue'), 'monitor');
  });

  test('le mode observation journalise sans interrompre les utilisateurs', () => {
    assert.deepEqual(decideAppCheckAccess('monitor', 'missing'), { allow: true, shouldLog: true });
    assert.deepEqual(decideAppCheckAccess('monitor', 'invalid'), { allow: true, shouldLog: true });
  });

  test('le mode renforcé refuse les jetons absents ou invalides', () => {
    assert.deepEqual(decideAppCheckAccess('enforce', 'missing'), { allow: false, shouldLog: true, statusCode: 401 });
    assert.deepEqual(decideAppCheckAccess('enforce', 'invalid'), { allow: false, shouldLog: true, statusCode: 403 });
    assert.deepEqual(decideAppCheckAccess('enforce', 'valid'), { allow: true, shouldLog: false });
  });
});

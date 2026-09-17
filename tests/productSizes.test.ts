import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ALL_SHOE_SIZES,
  SHOE_SIZE_MAX,
  SHOE_SIZE_MIN,
  ensureRequiredClothingSizes,
  generateShoeSizes,
  getShoeSizeError,
  isShoeCategory,
} from '../src/utils/productSizes';

test('la liste globale contient toutes les pointures de 16 à 49', () => {
  assert.equal(ALL_SHOE_SIZES.length, 34);
  assert.equal(ALL_SHOE_SIZES.at(0), String(SHOE_SIZE_MIN));
  assert.equal(ALL_SHOE_SIZES.at(-1), String(SHOE_SIZE_MAX));
});

test('la détection des chaussures ignore les espaces et la casse', () => {
  assert.equal(isShoeCategory(' Chaussures '), true);
  assert.equal(isShoeCategory('CHAUSSURE DE SPORT'), true);
  assert.equal(isShoeCategory('Pantalons'), false);
  assert.equal(isShoeCategory(undefined), false);
});

test('les pointures configurées sont générées de façon inclusive', () => {
  assert.deepEqual(generateShoeSizes(37, 40), ['37', '38', '39', '40']);
});

test('une plage de pointures invalide est refusée', () => {
  assert.deepEqual(generateShoeSizes(15, 40), []);
  assert.deepEqual(generateShoeSizes(37, 50), []);
  assert.deepEqual(generateShoeSizes(40, 40), []);
  assert.deepEqual(generateShoeSizes(40, 39), []);
  assert.deepEqual(generateShoeSizes(37.5, 40), []);
});

test('les messages de validation expliquent précisément la plage incorrecte', () => {
  assert.equal(getShoeSizeError(37.5, 40), 'Les pointures doivent être des nombres entiers.');
  assert.equal(getShoeSizeError(15, 40), 'Les pointures doivent être comprises entre 16 et 49.');
  assert.equal(getShoeSizeError(40, 40), 'La pointure minimale doit être inférieure à la pointure maximale.');
  assert.equal(getShoeSizeError(37, 40), null);
});

test('XL et XXL sont ajoutées aux vêtements sans créer de doublon', () => {
  assert.deepEqual(
    ensureRequiredClothingSizes(['S', 'M', 'XL', 'S'], 'T-shirts'),
    ['S', 'M', 'XL', 'XXL'],
  );
});

test('les tailles de vêtements ne sont pas ajoutées aux chaussures et accessoires', () => {
  assert.deepEqual(ensureRequiredClothingSizes(['38', '39'], 'Chaussures'), ['38', '39']);
  assert.deepEqual(ensureRequiredClothingSizes(['Moyenne'], 'Sacs'), ['Moyenne']);
  assert.deepEqual(ensureRequiredClothingSizes(['Unique'], 'Bijoux'), ['Unique']);
});

test('une taille unique ou une liste vide reste inchangée', () => {
  assert.deepEqual(ensureRequiredClothingSizes(['Taille unique'], 'Hauts'), ['Taille unique']);
  assert.deepEqual(ensureRequiredClothingSizes([], 'Hauts'), []);
  assert.deepEqual(ensureRequiredClothingSizes(undefined, 'Hauts'), []);
});

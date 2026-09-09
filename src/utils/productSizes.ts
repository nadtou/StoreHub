export const SHOE_SIZE_MIN = 16;
export const SHOE_SIZE_MAX = 49;

export const ALL_SHOE_SIZES = Array.from(
  { length: SHOE_SIZE_MAX - SHOE_SIZE_MIN + 1 },
  (_, index) => String(SHOE_SIZE_MIN + index),
);

const NO_CLOTHING_SIZE_CATEGORIES = ['accessoires', 'bijoux', 'sacs'];
const UNIQUE_SIZE_LABELS = ['unique', 'taille unique', 'one size', 'moyenne'];

export function isShoeCategory(category?: string): boolean {
  return (category ?? '').trim().toLocaleLowerCase('fr').includes('chauss');
}

export function generateShoeSizes(min: number, max: number): string[] {
  if (
    !Number.isInteger(min)
    || !Number.isInteger(max)
    || min < SHOE_SIZE_MIN
    || max > SHOE_SIZE_MAX
    || min >= max
  ) {
    return [];
  }

  return Array.from({ length: max - min + 1 }, (_, index) => String(min + index));
}

export function getShoeSizeError(min: number, max: number): string | null {
  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    return 'Les pointures doivent être des nombres entiers.';
  }
  if (min < SHOE_SIZE_MIN || max > SHOE_SIZE_MAX) {
    return `Les pointures doivent être comprises entre ${SHOE_SIZE_MIN} et ${SHOE_SIZE_MAX}.`;
  }
  if (min >= max) {
    return 'La pointure minimale doit être inférieure à la pointure maximale.';
  }
  return null;
}

export function ensureRequiredClothingSizes(sizes: string[] | undefined, category?: string): string[] {
  const uniqueSizes = Array.from(
    new Set((sizes ?? []).map((size) => String(size).trim()).filter(Boolean)),
  );

  const normalizedCategory = (category ?? '').trim().toLocaleLowerCase('fr');
  const hasOnlyUniqueSize = uniqueSizes.length > 0 && uniqueSizes.every((size) => (
    UNIQUE_SIZE_LABELS.includes(size.toLocaleLowerCase('fr'))
  ));

  if (
    isShoeCategory(category)
    || uniqueSizes.length === 0
    || hasOnlyUniqueSize
    || NO_CLOTHING_SIZE_CATEGORIES.some((name) => normalizedCategory.includes(name))
  ) {
    return uniqueSizes;
  }

  for (const requiredSize of ['XL', 'XXL']) {
    if (!uniqueSizes.some((size) => size.toLocaleUpperCase('fr') === requiredSize)) {
      uniqueSizes.push(requiredSize);
    }
  }

  return uniqueSizes;
}

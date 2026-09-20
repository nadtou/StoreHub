import { ManualOrder, Product } from '../types';
import {
  ALL_SHOE_SIZES,
  ensureRequiredClothingSizes,
  generateShoeSizes,
  getShoeSizeError,
  isShoeCategory,
} from './productSizes';

export type ProductPersistenceResult =
  | { ok: true; product: Partial<Product> & { sizes: string[]; stock: number; isAvailable: boolean; currency: 'DZD' } }
  | { ok: false; error: string };

function finiteStock(value: unknown, fallback = 0): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? Math.max(0, Math.floor(numericValue)) : fallback;
}

function inferShoeRange(sizes: string[]): { min?: number; max?: number } {
  const numericSizes = sizes
    .map(Number)
    .filter((size) => Number.isInteger(size))
    .sort((a, b) => a - b);
  return { min: numericSizes.at(0), max: numericSizes.at(-1) };
}

/** Applies exactly the same catalogue rules on creation and on modification. */
export function normalizeProductForPersistence(
  changes: Partial<Product>,
  current?: Product,
): ProductPersistenceResult {
  const merged = { ...(current || {}), ...changes } as Partial<Product>;
  const category = String(merged.category || '').trim();
  const submittedSizes = Array.isArray(merged.sizes) ? merged.sizes.map(String) : [];
  let sizes = ensureRequiredClothingSizes(submittedSizes, category);
  let shoeSizeMin = merged.shoeSizeMin;
  let shoeSizeMax = merged.shoeSizeMax;

  if (isShoeCategory(category)) {
    const inferred = inferShoeRange(submittedSizes);
    const min = Number(shoeSizeMin ?? inferred.min);
    const max = Number(shoeSizeMax ?? inferred.max);
    const error = getShoeSizeError(min, max);
    if (error) return { ok: false, error };
    shoeSizeMin = min;
    shoeSizeMax = max;
    sizes = generateShoeSizes(min, max);
  }

  const stock = finiteStock(merged.stock, 0);
  const requestedAvailability = changes.isAvailable ?? current?.isAvailable ?? true;
  const product: ProductPersistenceResult & any = {
    ...changes,
    sizes,
    stock,
    isAvailable: Boolean(requestedAvailability) && stock > 0,
    currency: 'DZD',
  };
  if (isShoeCategory(category)) {
    product.shoeSizeMin = shoeSizeMin;
    product.shoeSizeMax = shoeSizeMax;
  } else {
    product.shoeSizeMin = undefined;
    product.shoeSizeMax = undefined;
  }
  return { ok: true, product };
}

export function getReservationSelectionError(
  product: Product,
  selectedSize: string,
  selectedColor: string,
): string | null {
  if (!product.isAvailable || (Number.isFinite(Number(product.stock)) && Number(product.stock) <= 0)) {
    return "Cet article n’est plus disponible.";
  }

  const configuredSizes = isShoeCategory(product.category)
    ? (product.shoeSizeMin !== undefined && product.shoeSizeMax !== undefined
      ? generateShoeSizes(product.shoeSizeMin, product.shoeSizeMax)
      : product.sizes)
    : ensureRequiredClothingSizes(product.sizes, product.category);
  const allowedSizes = configuredSizes.length > 0
    ? configuredSizes
    : (isShoeCategory(product.category) ? ALL_SHOE_SIZES : ['Taille unique']);
  const allowedColors = product.colors.length > 0 ? product.colors : ['Standard'];

  if (!allowedSizes.includes(String(selectedSize)) || !allowedColors.includes(selectedColor)) {
    return "La taille ou la couleur sélectionnée n’est pas disponible.";
  }
  return null;
}

export function calculateDeliveredStock(
  previousStatus: ManualOrder['status'],
  nextStatus: ManualOrder['status'],
  stock: number | undefined,
  quantity: number | undefined,
): { changed: false } | { changed: true; remainingStock: number; isAvailable: boolean } {
  const wasDelivered = previousStatus === 'livre';
  const willBeDelivered = nextStatus === 'livre';
  if (wasDelivered === willBeDelivered) return { changed: false };

  const safeQuantity = Math.max(1, Math.floor(Number(quantity) || 1));
  const safeStock = Number.isFinite(Number(stock)) ? Math.max(0, Number(stock)) : 0;

  if (willBeDelivered) {
    if (safeStock < safeQuantity) {
      throw new Error("Stock insuffisant pour marquer cette commande comme livrée.");
    }
    const remainingStock = safeStock - safeQuantity;
    return { changed: true, remainingStock, isAvailable: remainingStock > 0 };
  }

  // livre -> en_attente / en_cours : la boutique gère manuellement, on remet le stock.
  const remainingStock = safeStock + safeQuantity;
  return { changed: true, remainingStock, isAvailable: remainingStock > 0 };
}

export function isOrderStatusTransitionAllowed(
  _previousStatus: ManualOrder['status'],
  _nextStatus: ManualOrder['status'],
): boolean {
  // Livraison gérée manuellement : la boutique peut réattribuer n'importe
  // quel statut, y compris repasser une commande livrée en attente ou en cours.
  return true;
}

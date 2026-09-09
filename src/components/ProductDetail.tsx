import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Product } from '../types';
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Check,
  ChevronDown,
  Eye,
  Heart,
  Loader2,
  ShoppingBag,
  Store,
} from 'lucide-react';
import {
  ALL_SHOE_SIZES,
  ensureRequiredClothingSizes,
  generateShoeSizes,
  isShoeCategory,
} from '../utils/productSizes';

const COLOR_HEX: Record<string, string> = {
  noir: '#171717',
  blanc: '#FAFAFA',
  ivoire: '#FFFFF0',
  anthracite: '#3F4248',
  gris: '#8A8D91',
  bordeaux: '#6B1124',
  rouge: '#C62828',
  rose: '#E9A6B2',
  terracotta: '#C15C3D',
  orange: '#E67E22',
  jaune: '#E1AD01',
  or: '#D4AF37',
  sauge: '#9FAF90',
  emeraude: '#046307',
  vert: '#5E6B54',
  ciel: '#87CEEB',
  marine: '#0D1B2A',
  bleu: '#3567A8',
  indigo: '#3F51A3',
  lilas: '#D6CADD',
  violet: '#735A9B',
  beige: '#D2B48C',
  cognac: '#9A461E',
  brun: '#5C4033',
};

function colorToHex(color: string): string {
  if (/^#[0-9a-f]{3,8}$/i.test(color)) return color;
  const normalized = color.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const match = Object.keys(COLOR_HEX).find((name) => normalized.includes(name));
  return match ? COLOR_HEX[match] : '#C5A850';
}

interface ProductDetailProps {
  product: Product;
  onBack: () => void;
  onVisitBoutique: (boutiqueId: string) => void;
  onProductClick: (product: Product) => void;
  favorites: string[];
  toggleFavorite: (productId: string) => void;
  shouldTrackView?: boolean;
  onReserve: (selection: { selectedSize: string; selectedColor: string }) => Promise<void>;
}

type DetailSection = 'description' | 'details' | 'boutique';

export default function ProductDetail({
  product,
  onBack,
  onVisitBoutique,
  favorites,
  toggleFavorite,
  shouldTrackView = true,
  onReserve,
}: ProductDetailProps) {
  const pageRef = useRef<HTMLDivElement>(null);
  const isShoeProduct = isShoeCategory(product.category);
  const normalizedClothingSizes = ensureRequiredClothingSizes(product.sizes, product.category);
  const configuredShoeSizes = product.shoeSizeMin !== undefined && product.shoeSizeMax !== undefined
    ? generateShoeSizes(product.shoeSizeMin, product.shoeSizeMax)
    : product.sizes.filter((size) => ALL_SHOE_SIZES.includes(String(size)));
  const availableShoeSizes = configuredShoeSizes.length > 0 ? configuredShoeSizes : ALL_SHOE_SIZES;
  const availableShoeSizeSet = new Set(availableShoeSizes);
  const availableSizes = isShoeProduct
    ? availableShoeSizes
    : (normalizedClothingSizes.length > 0 ? normalizedClothingSizes : ['Taille unique']);
  const availableColors = product.colors.length > 0 ? product.colors : ['Standard'];
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>(availableSizes[0]);
  const [selectedColor, setSelectedColor] = useState<string>(availableColors[0]);
  const [isReserved, setIsReserved] = useState(false);
  const [isReserving, setIsReserving] = useState(false);
  const [reservationError, setReservationError] = useState('');
  const [openSection, setOpenSection] = useState<DetailSection | null>('description');

  useEffect(() => {
    setSelectedSize(availableSizes[0]);
    setSelectedColor(availableColors[0]);
    setActiveImageIdx(0);
    setIsReserved(false);
    setIsReserving(false);
    setReservationError('');
  }, [product.id]);

  useEffect(() => {
    if (!shouldTrackView) return;
    const sessionKey = `storehub_product_view_${product.id}`;
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, '1');

    fetch(`/api/analytics/products/${product.id}/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boutiqueId: product.boutiqueId }),
    }).catch((error) => console.error('Error tracking product view:', error));
  }, [product.id, product.boutiqueId, shouldTrackView]);

  useLayoutEffect(() => {
    pageRef.current?.closest('main')?.scrollTo({ top: 0, behavior: 'auto' });
  }, [product.id]);

  const isFav = favorites.includes(product.id);
  const activeImage = product.images[activeImageIdx]?.url || product.images[0]?.url;

  const toggleSection = (section: DetailSection) => {
    setOpenSection((current) => (current === section ? null : section));
  };

  const handleReservation = async () => {
    if (isReserving || isReserved || !product.isAvailable) return;
    setIsReserving(true);
    setReservationError('');
    try {
      await onReserve({ selectedSize, selectedColor });
      setIsReserved(true);
    } catch (error) {
      setReservationError(error instanceof Error ? error.message : 'La réservation n’a pas pu être enregistrée.');
    } finally {
      setIsReserving(false);
    }
  };

  return (
    <div ref={pageRef} className="bg-luxury-dark pb-8 text-white">
      <div className="mx-auto w-full max-w-xl px-4 pt-4">
        <div className="mb-5 flex items-center justify-between border-b border-luxury-border pb-3">
          <button
            type="button"
            onClick={onBack}
            className="flex min-h-11 items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-300 transition-colors hover:text-luxury-gold"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Retour</span>
          </button>

          <button
            type="button"
            aria-label={isFav ? `Retirer ${product.name} des favoris` : `Ajouter ${product.name} aux favoris`}
            onClick={() => toggleFavorite(product.id)}
            className="flex h-11 w-11 items-center justify-center border border-luxury-border bg-luxury-panel text-zinc-300 transition-colors hover:border-luxury-gold hover:text-luxury-gold"
          >
            <Heart className={`h-5 w-5 ${isFav ? 'fill-luxury-gold text-luxury-gold' : ''}`} />
          </button>
        </div>

        <div className="flex flex-col gap-0">
          <section className="order-2">
            <div className="relative -mx-4 aspect-square overflow-hidden bg-[#EEECE7]">
              {activeImage ? (
                <img
                  src={activeImage}
                  alt={`${product.name}, vue ${activeImageIdx + 1}`}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs uppercase tracking-widest text-zinc-500">
                  Visuel indisponible
                </div>
              )}

              {product.images.length > 1 && (
                <div className="absolute bottom-0 left-0 h-1 w-full bg-black/15">
                  <div
                    className="h-full bg-luxury-gold transition-[width] duration-300"
                    style={{ width: `${((activeImageIdx + 1) / product.images.length) * 100}%` }}
                  />
                </div>
              )}

              <span className="absolute bottom-4 right-4 bg-black px-2.5 py-1 font-mono text-[10px] text-white">
                {activeImageIdx + 1} / {Math.max(product.images.length, 1)}
              </span>
            </div>

            {product.images.length > 1 && (
              <div className="border-b border-luxury-border py-5">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-white">Photos de l’article</h2>
                  <span className="font-mono text-[10px] text-zinc-500">Faites défiler</span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {product.images.map((image, index) => (
                    <button
                      key={`${image.url}-${index}`}
                      type="button"
                      aria-label={`Afficher la vue ${index + 1}`}
                      aria-current={activeImageIdx === index ? 'true' : undefined}
                      onClick={() => setActiveImageIdx(index)}
                      className={`h-24 w-20 shrink-0 overflow-hidden border-2 bg-[#EEECE7] transition-colors ${
                        activeImageIdx === index ? 'border-luxury-gold' : 'border-transparent hover:border-zinc-600'
                      }`}
                    >
                      <img src={image.url} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <aside className="contents">
            <div className="order-1 border-b border-luxury-border pb-5">
              <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[10px] uppercase tracking-[0.12em]">
                <button
                  type="button"
                  onClick={() => onVisitBoutique(product.boutiqueId)}
                  className="text-luxury-gold underline decoration-luxury-gold/40 underline-offset-4 hover:text-white"
                >
                  {product.boutiqueName}
                </button>
                <span className="text-zinc-700">/</span>
                <span className="text-zinc-400">{product.category}</span>
                <span className="border border-luxury-gold/30 bg-luxury-gold/10 px-2 py-1 text-luxury-gold">
                  {product.isAvailable ? 'Disponible' : 'Indisponible'}
                </span>
              </div>

              <div className="mb-3 flex items-center gap-3 text-xs text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" />
                  {product.stats.views} vues
                </span>
                <span className="h-3 w-px bg-luxury-border" />
                <span>{product.stats.favorites} favoris</span>
              </div>

              <h1 className="text-3xl font-extrabold uppercase leading-[1.05] tracking-[0.035em] text-white">
                {product.name}
              </h1>
              <p className="mt-3 font-mono text-xl font-bold text-luxury-gold">
                {product.price} DA
              </p>
            </div>

            <div className="order-3 pt-5">
              <div className="border-b border-luxury-border pb-6">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-white">Coloris</h2>
                    <p className="mt-1 text-xs text-zinc-400">{selectedColor}</p>
                  </div>
                  <span className="font-mono text-[10px] text-zinc-500">{availableColors.length} choix</span>
                </div>

                <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Couleur de l’article">
                  {availableColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      role="radio"
                      aria-checked={selectedColor === color}
                      aria-label={color}
                      title={color}
                      onClick={() => setSelectedColor(color)}
                      className={`relative h-10 w-10 rounded-full border-2 transition-transform active:scale-95 ${
                        selectedColor === color
                          ? 'border-luxury-gold ring-2 ring-luxury-gold/35 ring-offset-2 ring-offset-luxury-dark'
                          : 'border-zinc-600 hover:border-white'
                      }`}
                      style={{ backgroundColor: colorToHex(color) }}
                    >
                      {selectedColor === color && (
                        <Check
                          className={`absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 ${
                            ['blanc', 'ivoire', 'ciel', 'jaune', 'or', 'beige'].some((name) =>
                              color.toLowerCase().includes(name),
                            )
                              ? 'text-black'
                              : 'text-white'
                          }`}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-b border-luxury-border py-6">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-white">
                      {isShoeProduct ? 'Choisir une pointure' : 'Choisir une taille'}
                    </h2>
                    <p className="mt-1 text-xs text-zinc-400">Sélection : {selectedSize}</p>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-luxury-gold">Guide des tailles</span>
                </div>

                {isShoeProduct ? (
                  <div className="relative">
                    <select
                      id={`shoe-size-${product.id}`}
                      aria-label="Pointure de l’article"
                      value={selectedSize}
                      onChange={(event) => setSelectedSize(event.target.value)}
                      className="min-h-14 w-full appearance-none border border-zinc-700 bg-luxury-panel px-4 pr-12 text-sm font-semibold text-white outline-none transition-colors focus:border-luxury-gold"
                    >
                      {ALL_SHOE_SIZES.map((shoeSize) => {
                        const isAvailable = availableShoeSizeSet.has(shoeSize);
                        return (
                          <option key={shoeSize} value={shoeSize} disabled={!isAvailable}>
                            {shoeSize}{isAvailable ? '' : ' — indisponible'}
                          </option>
                        );
                      })}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-7 h-4 w-4 -translate-y-1/2 text-luxury-gold" />
                    <p className="mt-2 text-[11px] text-zinc-500">
                      Une seule pointure peut être sélectionnée.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Taille de l’article">
                    {availableSizes.map((size) => (
                      <button
                        key={size}
                        type="button"
                        role="radio"
                        aria-checked={selectedSize === size}
                        onClick={() => setSelectedSize(size)}
                        className={`min-h-12 border px-2 text-xs font-semibold transition-colors ${
                          selectedSize === size
                            ? 'border-luxury-gold bg-luxury-gold text-black'
                            : 'border-zinc-700 bg-luxury-panel text-white hover:border-white'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 z-20 -mx-4 border-b border-luxury-border bg-luxury-dark/95 px-4 py-4 backdrop-blur-md">
                <button
                  type="button"
                  disabled={!product.isAvailable || isReserving || isReserved}
                  onClick={handleReservation}
                  className={`flex min-h-14 w-full items-center justify-between border px-5 text-xs font-extrabold uppercase tracking-[0.13em] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    isReserved
                      ? 'border-emerald-500 bg-emerald-600 text-white'
                      : 'border-luxury-gold bg-luxury-gold text-black hover:bg-[#E7C85C]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {isReserving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingBag className="h-4 w-4" />}
                    {isReserved ? 'Réservation envoyée' : isReserving ? 'Envoi en cours…' : 'Réserver cet article'}
                  </span>
                  {isReserved ? <Check className="h-5 w-5" /> : <ArrowRight className="h-5 w-5" />}
                </button>

                {reservationError && (
                  <div role="alert" className="mt-2 flex items-start gap-2 border border-red-900/70 bg-red-950/30 p-3 text-xs leading-relaxed text-red-300">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{reservationError}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => onVisitBoutique(product.boutiqueId)}
                  className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 border border-zinc-700 bg-transparent px-4 text-[10px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:border-luxury-gold hover:text-luxury-gold"
                >
                  <Store className="h-4 w-4" />
                  Visiter {product.boutiqueName}
                </button>
              </div>

              <div className="divide-y divide-luxury-border border-b border-luxury-border">
                <div>
                  <button
                    type="button"
                    aria-expanded={openSection === 'description'}
                    onClick={() => toggleSection('description')}
                    className="flex min-h-14 w-full items-center justify-between text-left text-xs font-bold uppercase tracking-[0.14em] text-white"
                  >
                    Description
                    <ChevronDown className={`h-4 w-4 transition-transform ${openSection === 'description' ? 'rotate-180' : ''}`} />
                  </button>
                  {openSection === 'description' && (
                    <p className="pb-5 text-sm font-light leading-6 text-zinc-300">{product.description}</p>
                  )}
                </div>

                <div>
                  <button
                    type="button"
                    aria-expanded={openSection === 'details'}
                    onClick={() => toggleSection('details')}
                    className="flex min-h-14 w-full items-center justify-between text-left text-xs font-bold uppercase tracking-[0.14em] text-white"
                  >
                    Détails et matières
                    <ChevronDown className={`h-4 w-4 transition-transform ${openSection === 'details' ? 'rotate-180' : ''}`} />
                  </button>
                  {openSection === 'details' && (
                    <div className="space-y-4 pb-5 text-sm text-zinc-300">
                      <div>
                        <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-zinc-500">Matières</p>
                        <div className="flex flex-wrap gap-2">
                          {product.materials.map((material) => (
                            <span key={material} className="border border-zinc-700 px-3 py-1.5 text-xs">
                              {material}
                            </span>
                          ))}
                        </div>
                      </div>
                      {product.collection && (
                        <p>
                          <span className="text-zinc-500">Collection :</span> {product.collection}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <button
                    type="button"
                    aria-expanded={openSection === 'boutique'}
                    onClick={() => toggleSection('boutique')}
                    className="flex min-h-14 w-full items-center justify-between text-left text-xs font-bold uppercase tracking-[0.14em] text-white"
                  >
                    Boutique
                    <ChevronDown className={`h-4 w-4 transition-transform ${openSection === 'boutique' ? 'rotate-180' : ''}`} />
                  </button>
                  {openSection === 'boutique' && (
                    <div className="pb-5">
                      <p className="text-sm leading-6 text-zinc-300">
                        Cet article est proposé par <span className="text-white">{product.boutiqueName}</span>.
                      </p>
                      <button
                        type="button"
                        onClick={() => onVisitBoutique(product.boutiqueId)}
                        className="mt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-luxury-gold underline underline-offset-4"
                      >
                        Voir la boutique
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

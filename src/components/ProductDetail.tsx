import { useState, useEffect } from 'react';
import { Product } from '../types';
import { mockProducts } from '../mockData';
import { ArrowLeft, Heart, ShoppingBag, Eye, Store, Star, Compass, AlertCircle } from 'lucide-react';

interface ProductDetailProps {
  product: Product;
  onBack: () => void;
  onVisitBoutique: (boutiqueId: string) => void;
  onProductClick: (product: Product) => void;
  favorites: string[];
  toggleFavorite: (productId: string) => void;
}

export default function ProductDetail({
  product,
  onBack,
  onVisitBoutique,
  onProductClick,
  favorites,
  toggleFavorite
}: ProductDetailProps) {
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>(product.sizes[0] || 'M');
  const [selectedColor, setSelectedColor] = useState<string>(product.colors[0] || 'Default');
  const [isAddedToBag, setIsAddedToBag] = useState(false);
  const [products, setProducts] = useState<Product[]>(mockProducts);

  // Fetch live products on mount
  useEffect(() => {
    const fetchLiveProducts = async () => {
      try {
        const res = await fetch('/api/products');
        if (res.ok) {
          const liveProducts = await res.json();
          if (liveProducts && liveProducts.length > 0) setProducts(liveProducts);
        }
      } catch (err) {
        console.error("Error fetching live products in ProductDetail:", err);
      }
    };
    fetchLiveProducts();
  }, []);

  const isFav = favorites.includes(product.id);

  // Filter similar products from the same category or style (excluding itself)
  const similarProducts = products.filter(
    p => p.id !== product.id && (p.category === product.category || p.styles.some(s => product.styles.includes(s)))
  );

  return (
    <div className="pb-24">
      
      {/* Back button and Floating overlay */}
      <div className="absolute top-[45px] left-6 z-30 flex gap-4">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-luxury-dark/80 backdrop-blur-md border border-luxury-border flex items-center justify-center text-white hover:text-luxury-gold transition-all duration-300 shadow-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-6 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          
          {/* Left: Product Images Gallery */}
          <div className="space-y-4">
            <div className="aspect-[3/4] relative bg-luxury-panel rounded-none overflow-hidden border border-luxury-border">
              <img
                src={product.images[activeImageIdx]?.url}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.03]"
              />
              
              {/* Image counter indicator */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 bg-luxury-dark/80 backdrop-blur-md px-3.5 py-1.5 rounded-none border border-luxury-border">
                {product.images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIdx(idx)}
                    className={`h-1.5 transition-all duration-300 rounded-none ${
                      idx === activeImageIdx ? 'w-5 bg-luxury-gold' : 'w-1.5 bg-luxury-border'
                    }`}
                  />
                ))}
              </div>

              {/* Heart Favorite Trigger */}
              <button
                onClick={() => toggleFavorite(product.id)}
                className="absolute top-4 right-4 w-11 h-11 rounded-full bg-luxury-dark/80 backdrop-blur-md border border-luxury-border flex items-center justify-center text-zinc-400 hover:text-luxury-gold transition-all duration-300 shadow-md"
              >
                <Heart className={`w-5 h-5 ${isFav ? 'fill-luxury-gold text-luxury-gold scale-110' : 'text-zinc-400'}`} />
              </button>
            </div>

            {/* Thumbnails list */}
            {product.images.length > 1 && (
              <div className="flex gap-3">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIdx(idx)}
                    className={`w-20 h-24 rounded-none overflow-hidden border transition-all ${
                      idx === activeImageIdx ? 'border-luxury-gold ring-1 ring-luxury-gold' : 'border-luxury-border hover:border-zinc-700'
                    }`}
                  >
                    <img src={img.url} alt={product.name} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Detailed info Sheet */}
          <div className="space-y-6 flex flex-col justify-between">
            <div>
              {/* Boutique Name & Verification badge */}
              <div 
                onClick={() => onVisitBoutique(product.boutiqueId)}
                className="inline-flex items-center gap-2 cursor-pointer bg-luxury-panel border border-luxury-border hover:border-luxury-gold/30 px-3.5 py-1.5 rounded-none text-[10px] font-mono uppercase text-luxury-gold tracking-widest font-semibold transition-all mb-4"
              >
                <Store className="w-3.5 h-3.5 text-luxury-gold" />
                <span>Atelier : {product.boutiqueName}</span>
              </div>

              {/* Title & Price */}
              <div className="space-y-2">
                <h1 className="serif-title text-3xl md:text-4xl font-light text-white tracking-wide leading-tight">
                  {product.name}
                </h1>
                <p className="font-mono text-xl text-luxury-gold font-semibold">
                  {product.price} {product.currency}
                </p>
              </div>

              {/* Description */}
              <p className="text-zinc-300 text-sm font-light leading-relaxed mt-4">
                {product.description}
              </p>

              {/* Options selectors (Colors & Sizes) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-luxury-border mt-6 font-mono">
                
                {/* Size picker */}
                <div>
                  <span className="text-[10px] uppercase text-zinc-500 tracking-widest block mb-2 font-semibold">Tailles Disponibles</span>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map(sz => (
                      <button
                        key={sz}
                        onClick={() => setSelectedSize(sz)}
                        className={`w-10 h-10 text-xs flex items-center justify-center rounded-none border transition-all ${
                          selectedSize === sz
                            ? 'bg-luxury-gold text-black border-luxury-gold font-semibold shadow-md'
                            : 'bg-luxury-panel border-luxury-border text-zinc-400 hover:border-zinc-700 hover:text-white'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color picker */}
                <div>
                  <span className="text-[10px] uppercase text-zinc-500 tracking-widest block mb-2 font-semibold">Nuances</span>
                  <div className="flex flex-wrap gap-2">
                    {product.colors.map(col => (
                      <button
                        key={col}
                        onClick={() => setSelectedColor(col)}
                        className={`px-3 py-2 text-[10px] rounded-none border transition-all uppercase tracking-wider ${
                          selectedColor === col
                            ? 'bg-luxury-gold text-black border-luxury-gold font-semibold shadow-md'
                            : 'bg-luxury-panel border-luxury-border text-zinc-400 hover:border-zinc-700 hover:text-white'
                        }`}
                      >
                        {col}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Materials & Care tags */}
              <div className="pt-6 border-t border-luxury-border mt-6 text-xs space-y-3">
                <div className="flex items-start gap-2.5">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-500 font-semibold mt-0.5">Matériaux :</span>
                  <div className="flex flex-wrap gap-1.5 text-zinc-300 font-light">
                    {product.materials.map((m, idx) => (
                      <span key={m} className="bg-luxury-panel border border-luxury-border px-2.5 py-1 rounded-none">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
                {product.collection && (
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-500 font-semibold">Collection :</span>
                    <span className="text-luxury-gold font-light font-mono text-[11px]">{product.collection}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Large primary bag add button */}
            <div className="pt-6 border-t border-luxury-border mt-6">
              <button
                onClick={() => {
                  setIsAddedToBag(true);
                  setTimeout(() => setIsAddedToBag(false), 2000);
                }}
                className={`w-full py-4 rounded-none text-xs tracking-[0.2em] font-semibold uppercase transition-all duration-300 flex items-center justify-center gap-2 shadow-lg ${
                  isAddedToBag
                    ? 'bg-emerald-600 text-white shadow-emerald-600/10'
                    : 'bg-luxury-gold text-black hover:bg-luxury-gold/90 shadow-luxury-gold/15'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{isAddedToBag ? 'Ajouté à la Wishlist !' : 'Réserver en Boutique / Wishlist'}</span>
              </button>
              
              <div className="flex items-center justify-center gap-1.5 mt-3 text-zinc-600 font-mono text-[9px] uppercase tracking-widest">
                <Eye className="w-3.5 h-3.5" />
                <span>{product.stats.views} Vues • {product.stats.favorites} Coups de cœur ce mois-ci</span>
              </div>
            </div>

          </div>
        </div>

        {/* Section: Similar Products */}
        <div className="mt-20 pt-8 border-t border-luxury-border">
          <div className="flex items-center gap-2 mb-2">
            <Compass className="w-4 h-4 text-luxury-gold" />
            <span className="font-mono text-[10px] uppercase text-luxury-gold tracking-[0.3em] font-semibold">
              Inspirations Complémentaires
            </span>
          </div>
          <h2 className="serif-title text-2xl font-light text-white tracking-wide mb-8">
            Pièces similaires
          </h2>

          {similarProducts.length === 0 ? (
            <p className="text-zinc-500 text-sm font-light">Aucune pièce similaire disponible.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {similarProducts.slice(0, 4).map(p => {
                const isFav = favorites.includes(p.id);
                return (
                  <div
                    key={p.id}
                    className="group relative flex flex-col bg-luxury-panel/30 rounded-none overflow-hidden border border-luxury-border hover:border-luxury-gold/25 transition-all duration-500"
                  >
                    <div 
                      className="relative aspect-[3/4] cursor-pointer overflow-hidden bg-luxury-panel"
                      onClick={() => onProductClick(p)}
                    >
                      <img
                        src={p.images[0].url}
                        alt={p.name}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-104"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(p.id);
                        }}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-luxury-dark/80 backdrop-blur-md border border-luxury-border flex items-center justify-center text-zinc-400 hover:text-luxury-gold transition-all duration-300 z-10"
                      >
                        <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-luxury-gold text-luxury-gold' : 'text-zinc-400'}`} />
                      </button>
                    </div>

                    <div className="p-4 flex-grow flex flex-col justify-between">
                      <h4 
                        onClick={() => onProductClick(p)}
                        className="serif-title text-sm font-light text-white tracking-wide clamp-1 group-hover:text-luxury-gold cursor-pointer transition-colors"
                      >
                        {p.name}
                      </h4>
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-luxury-border">
                        <span className="font-mono text-xs text-luxury-gold font-semibold">
                          {p.price} {p.currency}
                        </span>
                        <span className="font-sans text-[10px] text-zinc-500 uppercase tracking-widest">
                          {p.category}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Floating Bottom action - View Boutique details */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 w-max">
        <button
          onClick={() => onVisitBoutique(product.boutiqueId)}
          className="flex items-center gap-2 bg-luxury-dark/90 backdrop-blur-md border border-luxury-gold/30 text-luxury-gold hover:text-white px-6 py-3.5 rounded-none text-xs tracking-widest uppercase font-mono shadow-xl hover:border-luxury-gold transition-all duration-300"
        >
          <Store className="w-4 h-4 text-luxury-gold" />
          <span>Visiter la boutique {product.boutiqueName}</span>
        </button>
      </div>

    </div>
  );
}

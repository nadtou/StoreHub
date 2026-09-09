import { Product } from '../types';
import { Heart, Share2, Compass, ArrowRight, Trash2, Check } from 'lucide-react';
import { useState, useEffect } from 'react';

interface FavoritesProps {
  favorites: string[];
  toggleFavorite: (productId: string) => void;
  onProductClick: (product: Product) => void;
}

export default function Favorites({ favorites, toggleFavorite, onProductClick }: FavoritesProps) {
  const [copied, setCopied] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);

  // Fetch live products on mount
  useEffect(() => {
    const fetchLiveProducts = async () => {
      try {
        const res = await fetch('/api/products');
        if (res.ok) {
          const liveProducts = await res.json();
          setProducts(Array.isArray(liveProducts) ? liveProducts : []);
        }
      } catch (err) {
        console.error("Error fetching live products in Favorites:", err);
      }
    };
    fetchLiveProducts();
  }, []);

  // Filter products currently marked as favorites
  const favProducts = products.filter(p => favorites.includes(p.id));

  const handleShareWishlist = () => {
    // Generate a shareable simulated link containing the wishlist IDs
    const query = favorites.join(',');
    const simulatedLink = `${window.location.origin}/?wishlist=${query}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(simulatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 mt-[45px] pb-6">
      
      {/* Title & Share bar */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between pb-6 border-b border-luxury-border mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-4 h-4 text-luxury-gold animate-pulse" />
            <span className="font-mono text-[10px] uppercase text-luxury-gold tracking-[0.3em] font-semibold">
              Votre Vestiaire
            </span>
          </div>
          <h1 className="serif-title text-3xl font-light text-white tracking-wide">
            Vos Coups de Cœur
          </h1>
        </div>

        {favProducts.length > 0 && (
          <button
            onClick={handleShareWishlist}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-luxury-panel border border-luxury-border hover:border-luxury-gold/30 text-zinc-300 hover:text-white rounded-none text-xs tracking-widest uppercase font-semibold font-mono transition-all duration-300 shadow-md self-start sm:self-auto"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-500" />
                <span className="text-emerald-400">Lien Copié !</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 text-luxury-gold" />
                <span>Partager ma Wishlist</span>
              </>
            )}
          </button>
        )}
      </div>

      {favProducts.length === 0 ? (
        <div className="text-center py-24 border border-dashed border-luxury-border rounded-none">
          <Heart className="w-12 h-12 text-zinc-700 mx-auto mb-4 animate-bounce" />
          <h3 className="serif-title text-lg font-light text-white tracking-wide mb-1">
            Aucun coup de cœur pour le moment
          </h3>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto leading-relaxed mb-6">
            Explorez les créations d'exception des ateliers et cliquez sur l'icône de cœur pour les conserver ici.
          </p>
          <button 
            onClick={() => window.location.reload()} // Actually, let's keep it simple
            className="px-6 py-2.5 bg-luxury-gold text-black rounded-none text-xs tracking-widest uppercase font-semibold hover:bg-luxury-gold/90 transition-colors shadow-lg shadow-luxury-gold/15"
          >
            Parcourir les pièces
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:gap-6 animate-fadeIn">
          {favProducts.map(p => {
            return (
              <div
                key={p.id}
                className="group relative flex flex-col bg-luxury-panel/30 rounded-none overflow-hidden border border-luxury-border hover:border-luxury-gold/25 transition-all duration-500"
                dir="ltr"
              >
                {/* Product Image preview */}
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

                  {/* Immediate remove trigger */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(p.id);
                    }}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-luxury-dark/85 backdrop-blur-md border border-luxury-border flex items-center justify-center text-zinc-400 hover:text-red-500 transition-all duration-300 z-10"
                    title="Retirer des favoris"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Info block */}
                <div className="p-4 flex-grow flex flex-col justify-between">
                  <div>
                    <span className="font-mono text-[8px] uppercase text-zinc-500 tracking-widest block mb-0.5">
                      {p.boutiqueName}
                    </span>
                    <h4 
                      onClick={() => onProductClick(p)}
                      className="serif-title text-sm font-light text-white tracking-wide clamp-1 group-hover:text-luxury-gold cursor-pointer transition-colors"
                    >
                      {p.name}
                    </h4>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-luxury-border">
                    <span className="font-mono text-xs text-luxury-gold font-semibold">
                      {p.price} DA
                    </span>
                    <button
                      onClick={() => onProductClick(p)}
                      className="text-[9px] uppercase tracking-wider font-mono text-zinc-500 hover:text-luxury-gold transition-colors flex items-center gap-1"
                    >
                      <span>Voir</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

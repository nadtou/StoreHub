import React, { useState, useEffect } from 'react';
import { Boutique, Product, UserPreferences } from '../types';
import { Sparkles, ArrowRight, ArrowLeft, Star, Heart, Flame, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import FennecMascot from './FennecMascot';
import { productMatchesGenre } from './bb_template';

interface HomeProps {
  preferences: UserPreferences | null;
  onBoutiqueClick: (boutique: Boutique) => void;
  onProductClick: (product: Product) => void;
  favorites: string[];
  toggleFavorite: (productId: string) => void;
  onNavigateToStylist: () => void;
  onLogout: () => void;
  onMessagesClick: () => void;
  hasUnreadMessages: boolean;
}

export default function Home({
  preferences,
  onBoutiqueClick,
  onProductClick,
  favorites,
  toggleFavorite,
  onNavigateToStylist,
  onLogout,
  onMessagesClick,
  hasUnreadMessages
}: HomeProps) {
  const [activeCategory, setActiveCategory] = useState<string>('Tout');
  const [boutiques, setBoutiques] = useState<Boutique[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [parallaxIndex, setParallaxIndex] = useState(0);
  const [recommendedIndex, setRecommendedIndex] = useState(0);
  const [trendIndex, setTrendIndex] = useState(0);

  // Fetch live Firestore collections from Express API
  useEffect(() => {
    const fetchLiveData = async () => {
      try {
        const [resB, resP] = await Promise.all([
          fetch('/api/boutiques'),
          fetch('/api/products')
        ]);
        if (resB.ok) {
          const liveBoutiques = await resB.json();
          setBoutiques(Array.isArray(liveBoutiques) ? liveBoutiques : []);
        }
        if (resP.ok) {
          const liveProducts = await resP.json();
          setProducts(Array.isArray(liveProducts) ? liveProducts : []);
        }
      } catch (error) {
        console.error("Error fetching live data in Home:", error);
      }
    };
    fetchLiveData();
  }, []);

  // Scroll management for the horizontal boutique carousel
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    if (container.clientWidth > 0) {
      const index = Math.round(container.scrollLeft / container.clientWidth);
      if (index !== parallaxIndex && index >= 0 && index < boutiques.length) {
        setParallaxIndex(index);
      }
    }
  };

  const scrollBoutique = (direction: 'left' | 'right') => {
    const container = document.getElementById('boutique-scroller');
    if (container) {
      const scrollAmount = direction === 'left' ? -container.clientWidth : container.clientWidth;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Scroll management for recommended products
  const handleRecommendedScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    if (container.clientWidth > 0) {
      const index = Math.round(container.scrollLeft / container.clientWidth);
      if (index !== recommendedIndex && index >= 0 && index < recommendedProducts.length) {
        setRecommendedIndex(index);
      }
    }
  };

  const scrollRecommended = (direction: 'left' | 'right') => {
    const container = document.getElementById('recommended-scroller');
    if (container) {
      const scrollAmount = direction === 'left' ? -container.clientWidth : container.clientWidth;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Scroll management for Trend cards
  const handleTrendScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    if (container.clientWidth > 0) {
      const index = Math.round(container.scrollLeft / container.clientWidth);
      if (index !== trendIndex && index >= 0 && index < 2) {
        setTrendIndex(index);
      }
    }
  };

  const scrollTrend = (direction: 'left' | 'right') => {
    const container = document.getElementById('trend-scroller');
    if (container) {
      const scrollAmount = direction === 'left' ? -container.clientWidth : container.clientWidth;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Personalized recommendations based on the three onboarding signals.
  const categoryMatchesPreferences = (product: Product) => {
    if (!preferences) return false;
    const selected = preferences.favoriteCategories;
    if (selected.includes(product.category)) return true;
    if (selected.includes('vetements') && ['robes', 'hauts', 'tops', 'ensembles'].includes(product.category.toLowerCase())) return true;
    if (selected.includes('accessoires') && ['accessoires', 'bijoux', 'sacs'].includes(product.category.toLowerCase())) return true;
    return false;
  };

  const contentMatches = (product: Product) => {
    if (!preferences) return product.isFeatured;
    const styleMatch = product.styles.some(style => preferences.styles.includes(style));
    return styleMatch || categoryMatchesPreferences(product);
  };

  const contentRecommendations = products.filter(contentMatches);
  const audienceRecommendations = preferences?.audiences?.length
    ? contentRecommendations.filter(product => preferences.audiences!.some(audience => productMatchesGenre(product, audience)))
    : contentRecommendations;

  // A new audience with no inventory yet still receives useful catalogue results.
  const recommendedProducts = audienceRecommendations.length > 0
    ? audienceRecommendations
    : contentRecommendations.length > 0
      ? contentRecommendations
      : products.filter(product => product.isFeatured);

  const categories = ['Tout', 'robes', 'outerwear', 'bijoux', 'hauts', 'accessoires'];

  const filteredProducts = activeCategory === 'Tout'
    ? products
    : products.filter(p => p.category.toLowerCase() === activeCategory.toLowerCase());

  return (
    <div className="flex-1 flex flex-col justify-between pb-0 overflow-x-hidden bg-luxury-dark text-white min-h-full">
      {/* 1. Header (Floating / Centered Logo) */}
      <header className="sticky top-0 z-20 bg-luxury-dark/95 backdrop-blur-md border-b border-luxury-gold/20 px-6 pt-[45px] pb-4 shrink-0">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <button 
            onClick={onLogout}
            className="w-10 h-10 border border-luxury-gold/20 rounded-none flex items-center justify-center bg-luxury-panel hover:border-luxury-gold hover:bg-luxury-gold/10 transition-all duration-300 group cursor-pointer"
            title="Se déconnecter (Retour)"
          >
            <ArrowLeft className="w-5 h-5 text-luxury-gold transform group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <div className="flex items-center gap-2.5">
            <FennecMascot size="sm" showGlow={true} />
            <h1 className="serif-title text-2xl font-light tracking-[0.25em] text-white">
              STORE<span className="text-luxury-gold font-normal">HUB</span>
            </h1>
          </div>
          <button 
            onClick={onMessagesClick}
            className="w-10 h-10 border border-luxury-gold/20 rounded-none flex items-center justify-center bg-luxury-panel hover:border-luxury-gold hover:bg-luxury-gold/10 transition-all duration-300 relative cursor-pointer group"
            title="Messagerie Privée"
          >
            <MessageSquare className="w-4 h-4 text-luxury-gold group-hover:scale-110 transition-transform" />
            {hasUnreadMessages && (
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-black animate-pulse" />
            )}
          </button>
        </div>
      </header>

      {/* 2. Vertically Stacked Boutiques List */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 pt-6 pb-2 space-y-6 flex flex-col justify-between">
        <div className="text-center space-y-2 mb-4 shrink-0">
          <div className="flex items-center justify-center gap-2">
            <div className="w-8 h-[1px] bg-luxury-gold/50" />
            <span className="font-mono text-[10px] uppercase text-luxury-gold tracking-[0.3em] font-semibold">
              Ateliers & Créateurs
            </span>
            <div className="w-8 h-[1px] bg-luxury-gold/50" />
          </div>
          <h2 className="serif-title text-3xl font-light text-white tracking-wide">
            Nos Boutiques Privées
          </h2>
          <p className="text-zinc-500 text-xs font-light max-w-md mx-auto">
            Découvrez nos créateurs exclusifs et échangez directement avec eux pour commander des pièces uniques.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 flex-1 w-full justify-items-center">
          {boutiques.map((btq) => (
            <div
              key={btq.id}
              onClick={() => onBoutiqueClick(btq)}
              className="bg-luxury-panel/30 border border-luxury-border hover:border-luxury-gold/40 transition-all duration-500 overflow-hidden cursor-pointer group flex flex-col justify-between text-right p-[16px_20px] w-full max-w-[413px] h-[309px]"
            >
              {/* Cover Image */}
              <div className="w-full h-[140px] sm:h-[170px] relative overflow-hidden bg-black shrink-0">
                <img
                  src={btq.coverImage}
                  alt={btq.name}
                  className="w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-[1500ms]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-luxury-dark via-transparent to-transparent z-10" />
                
                {/* Logo badge overlay */}
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between z-20">
                  <div className="flex items-center gap-2">
                    <img
                      src={btq.logo}
                      alt={btq.name}
                      className="w-9 h-9 rounded-full border border-luxury-gold/40 object-cover bg-black shrink-0"
                    />
                    <div className="text-left">
                      <div className="flex items-center gap-1">
                        <h3 className="serif-title text-xs sm:text-sm font-light text-white tracking-wide group-hover:text-luxury-gold transition-colors truncate max-w-[110px]">
                          {btq.name}
                        </h3>
                        {btq.isVerified && (
                          <span className="w-2 h-2 rounded-full bg-luxury-gold inline-block" title="Vérifié" />
                        )}
                      </div>
                      <p className="font-mono text-[8px] uppercase tracking-widest text-zinc-300 truncate">
                        {btq.location.city}, {btq.location.country}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content Area */}
              <div className="p-4 flex flex-col justify-between flex-grow overflow-hidden">
                <div>
                  {/* Description */}
                  <p className="text-[11px] text-zinc-400 font-light leading-relaxed line-clamp-2">
                    {btq.description}
                  </p>
                </div>

                {/* Footer stats & Action */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-luxury-border/60 gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="font-mono text-xs text-luxury-gold font-semibold">
                        {btq.stats.followersCount}
                      </span>
                      <span className="font-sans text-[8px] text-zinc-500 uppercase tracking-widest">
                        Abonnés
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="font-mono text-xs text-luxury-gold font-semibold">
                        {btq.stats.productsCount}
                      </span>
                      <span className="font-sans text-[8px] text-zinc-500 uppercase tracking-widest">
                        Pièces
                      </span>
                    </div>
                  </div>

                  <span className="flex items-center gap-1 text-[10px] text-luxury-gold group-hover:text-white transition-colors uppercase tracking-widest font-mono font-medium shrink-0">
                    Visiter <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

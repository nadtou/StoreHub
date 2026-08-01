import React, { useState, useEffect } from 'react';
import { Boutique, Product, UserPreferences } from '../types';
import { mockBoutiques, mockProducts } from '../mockData';
import { Sparkles, ArrowRight, ArrowLeft, Star, Heart, Flame, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';

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
  const [boutiques, setBoutiques] = useState<Boutique[]>(mockBoutiques);
  const [products, setProducts] = useState<Product[]>(mockProducts);
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
          if (liveBoutiques && liveBoutiques.length > 0) setBoutiques(liveBoutiques);
        }
        if (resP.ok) {
          const liveProducts = await resP.json();
          if (liveProducts && liveProducts.length > 0) setProducts(liveProducts);
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

  // Personalized recommendations based on quiz
  const recommendedProducts = products.filter(p => {
    if (!preferences) return p.isFeatured;
    // Match styles or category
    const styleMatch = p.styles.some(style => preferences.styles.includes(style));
    const categoryMatch = preferences.favoriteCategories.includes(p.category);
    return styleMatch || categoryMatch;
  });

  const categories = ['Tout', 'robes', 'outerwear', 'bijoux', 'hauts', 'accessoires'];

  const filteredProducts = activeCategory === 'Tout'
    ? products
    : products.filter(p => p.category.toLowerCase() === activeCategory.toLowerCase());

  return (
    <div className="pb-24 overflow-x-hidden min-h-screen bg-luxury-dark text-white">
      {/* 1. Header (Floating / Centered Logo) */}
      <header className="sticky top-0 z-20 bg-luxury-dark/95 backdrop-blur-md border-b border-luxury-gold/20 px-6 pt-[45px] pb-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <button 
            onClick={onLogout}
            className="w-10 h-10 border border-luxury-gold/20 rounded-none flex items-center justify-center bg-luxury-panel hover:border-luxury-gold hover:bg-luxury-gold/10 transition-all duration-300 group cursor-pointer"
            title="Se déconnecter (Retour)"
          >
            <ArrowLeft className="w-5 h-5 text-luxury-gold transform group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <h1 className="serif-title text-2xl font-light tracking-[0.25em] text-white">
            STORE<span className="text-luxury-gold font-normal">HUB</span>
          </h1>
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
      <main className="max-w-4xl mx-auto px-6 py-10 space-y-10">
        <div className="text-center space-y-2 mb-12">
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

        <div className="space-y-8">
          {boutiques.map((btq) => (
            <div
              key={btq.id}
              onClick={() => onBoutiqueClick(btq)}
              className="bg-luxury-panel/30 border border-luxury-border hover:border-luxury-gold/40 transition-all duration-500 overflow-hidden cursor-pointer group flex flex-col md:flex-row md:items-stretch min-h-[220px] md:min-h-[250px]"
            >
              {/* Cover Image (Left column on desktop, top on mobile) */}
              <div className="w-full md:w-[32%] lg:w-[40%] h-[180px] md:h-auto relative overflow-hidden bg-black shrink-0">
                <img
                  src={btq.coverImage}
                  alt={btq.name}
                  className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-[1500ms] absolute inset-0 md:absolute"
                />
                <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-luxury-dark/80 via-transparent to-transparent z-10" />
              </div>

              {/* Content Area (Right column) */}
              <div className="p-5 sm:p-6 md:p-8 flex flex-col justify-between flex-grow overflow-hidden min-w-0">
                <div>
                  {/* Header Row: Logo & Title */}
                  <div className="flex items-start gap-3.5 mb-3">
                    <img
                      src={btq.logo}
                      alt={btq.name}
                      className="w-11 h-11 rounded-full border border-luxury-gold/30 object-cover bg-black shrink-0 mt-0.5"
                    />
                    <div className="min-w-0">
                      <h3 className="serif-title text-base sm:text-xl font-light text-white tracking-wide group-hover:text-luxury-gold transition-colors leading-tight">
                        {btq.name}
                      </h3>
                      {btq.isVerified && (
                        <div className="mt-1">
                          <span className="inline-block text-[7px] sm:text-[8px] bg-luxury-gold/10 border border-luxury-gold/30 text-luxury-gold px-1.5 py-0.5 uppercase tracking-widest font-mono font-semibold">
                            Vérifié
                          </span>
                        </div>
                      )}
                      <p className="font-mono text-[9px] uppercase tracking-widest text-zinc-500 mt-1 truncate">
                        {btq.location.city}, {btq.location.country}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-zinc-400 font-light leading-relaxed line-clamp-3">
                    {btq.description}
                  </p>
                </div>

                {/* Footer stats & Action */}
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-luxury-border/60 gap-4">
                  <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-mono text-xs text-luxury-gold font-semibold">
                        {btq.stats.followersCount}
                      </span>
                      <span className="font-sans text-[8px] text-zinc-500 uppercase tracking-widest">
                        Abonnés
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-mono text-xs text-luxury-gold font-semibold">
                        {btq.stats.productsCount}
                      </span>
                      <span className="font-sans text-[8px] text-zinc-500 uppercase tracking-widest">
                        Produits
                      </span>
                    </div>
                  </div>

                  <span className="flex items-center gap-1 text-[10px] sm:text-xs text-luxury-gold group-hover:text-white transition-colors uppercase tracking-widest font-mono font-medium shrink-0 ml-2">
                    Visiter <ArrowRight className="w-3.5 h-3.5" />
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

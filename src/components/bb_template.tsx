import React from 'react';
import { ArrowRight, MessageSquare, UserPlus, Check, Plus, MapPin, CheckCircle2, ChevronDown } from 'lucide-react';
import { Product } from '../types';

/**
 * bb_template
 * This is the official template for rendering Boutique Lists and Boutique Details headers.
 * 
 * Rules:
 * 1. Vertically stacked cards for boutiques list.
 * 2. Stats (Abonnés / Produits) are inline (not stacked vertically beneath the numbers).
 * 3. Responsive contact and follow actions are left-aligned on mobile ("vers la gauche") 
 *    and expand to fill the container perfectly without horizontal overflow.
 */

interface BoutiqueTemplateProps {
  boutique: {
    id: string;
    name: string;
    logo: string;
    coverImage: string;
    description: string;
    isVerified?: boolean;
    location: {
      city: string;
      country: string;
    };
    stats: {
      followersCount: number;
      productsCount: number;
    };
  };
  isFollowing?: boolean;
  onVisit?: () => void;
  onContact?: () => void;
  onFollowToggle?: () => void;
}

/**
 * Template 1: Vertical Boutique Card List Item
 * Used in Home / Main Boutique directory
 */
export function BoutiqueListItemTemplate({
  boutique,
  onVisit
}: BoutiqueTemplateProps) {
  return (
    <div
      onClick={onVisit}
      className="bg-luxury-panel/30 border border-luxury-border hover:border-luxury-gold/40 transition-all duration-500 overflow-hidden cursor-pointer group flex flex-col md:flex-row md:items-stretch min-h-[220px] md:min-h-[250px]"
    >
      {/* Cover Image (Left column on desktop, top on mobile) */}
      <div className="w-full md:w-[32%] lg:w-[40%] h-[180px] md:h-auto relative overflow-hidden bg-black shrink-0">
        <img
          src={boutique.coverImage}
          alt={boutique.name}
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
              src={boutique.logo}
              alt={boutique.name}
              className="w-11 h-11 rounded-full border border-luxury-gold/30 object-cover bg-black shrink-0 mt-0.5"
            />
            <div className="min-w-0">
              <h3 className="serif-title text-base sm:text-xl font-light text-white tracking-wide group-hover:text-luxury-gold transition-colors leading-tight">
                {boutique.name}
              </h3>
              {boutique.isVerified && (
                <div className="mt-1">
                  <span className="inline-block text-[7px] sm:text-[8px] bg-luxury-gold/10 border border-luxury-gold/30 text-luxury-gold px-1.5 py-0.5 uppercase tracking-widest font-mono font-semibold">
                    Vérifié
                  </span>
                </div>
              )}
              <p className="font-mono text-[9px] uppercase tracking-widest text-zinc-500 mt-1 truncate">
                {boutique.location.city}, {boutique.location.country}
              </p>
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-zinc-400 font-light leading-relaxed line-clamp-3">
            {boutique.description}
          </p>
        </div>

        {/* Footer stats & Action */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-luxury-border/60 gap-4">
          <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="font-mono text-xs text-luxury-gold font-semibold">
                {boutique.stats.followersCount}
              </span>
              <span className="font-sans text-[8px] text-zinc-500 uppercase tracking-widest">
                Abonnés
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="font-mono text-xs text-luxury-gold font-semibold">
                {boutique.stats.productsCount}
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
  );
}

/**
 * Template 2: Responsive Boutique Header & Actions Block
 * Used inside Boutique Detail Page / Profile
 */
export function BoutiqueDetailHeaderTemplate({
  boutique,
  isFollowing,
  onContact,
  onFollowToggle
}: BoutiqueTemplateProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center pb-8 border-b border-luxury-border">
      {/* Logo & Name Info */}
      <div className="flex flex-row gap-4 items-center">
        <img
          src={boutique.logo}
          alt={boutique.name}
          className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-luxury-gold object-cover bg-luxury-panel shadow-xl shrink-0"
        />
        
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="serif-title text-2xl sm:text-4xl font-light text-white tracking-wide leading-tight">
              {boutique.name}
            </h1>
            {boutique.isVerified && (
              <CheckCircle2 className="w-5 h-5 text-luxury-gold fill-luxury-gold/10" />
            )}
          </div>

          {/* Unified Stats, Follow & Contact Row - Matches screenshot perfectly */}
          <div className="flex flex-col gap-2 mt-2">
            <div className="flex items-center gap-3 bg-[#0d0d0d]/90 border border-luxury-gold/20 py-1 px-3 w-fit">
              {/* Follow badge button (circle icon) */}
              <button
                onClick={onFollowToggle}
                className={`w-5 h-5 rounded-full flex items-center justify-center transition-all focus:outline-none shrink-0 ${
                  isFollowing 
                    ? 'bg-luxury-gold text-black hover:bg-luxury-gold/90' 
                    : 'border border-luxury-gold/40 text-luxury-gold hover:bg-luxury-gold hover:text-black'
                }`}
                title={isFollowing ? "Désabonner" : "Suivre la boutique"}
              >
                {isFollowing ? (
                  <Check className="w-3.5 h-3.5 stroke-[3.5]" />
                ) : (
                  <Plus className="w-3.5 h-3.5 stroke-[3.5]" />
                )}
              </button>

              {/* Followers count */}
              <div className="flex items-center gap-1 font-mono text-xs">
                <span className="text-luxury-gold font-bold">{boutique.stats.followersCount}</span>
                <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-sans">Abonnés</span>
              </div>

              {/* Products count */}
              <div className="flex items-center gap-1 font-mono text-xs">
                <span className="text-luxury-gold font-bold">{boutique.stats.productsCount}</span>
                <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-sans">Produits</span>
              </div>

              {/* Vertical divider line */}
              <div className="h-4 w-[1px] bg-luxury-border/80 mx-0.5" />

              {/* Message bubble button */}
              <button
                onClick={onContact}
                className="text-zinc-400 hover:text-luxury-gold transition-colors focus:outline-none p-0.5"
                title="Contacter le créateur"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            </div>

            {/* Location row */}
            <div className="flex items-center gap-1.5 text-zinc-500 font-mono text-[9px] uppercase tracking-[0.25em]">
              <MapPin className="w-3 h-3 text-luxury-gold/70" />
              <span>{boutique.location.city}, {boutique.location.country}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Reusable premium filters component for boutiques
 */
export function BoutiqueProductFilters({
  selectedCategory,
  setSelectedCategory,
  selectedGenre,
  setSelectedGenre,
}: {
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  selectedGenre: string;
  setSelectedGenre: (genre: string) => void;
}) {
  const categories = [
    'Tout',
    'T-shirt',
    'Short',
    'Sac',
    'Accessoire',
    'Pantalon',
    'Chemisier',
    'Robes',
    'Outerwear',
    'Bijoux',
    'Hauts'
  ];

  const genres = ['Tout', 'Homme', 'Femme', 'Enfants'];

  return (
    <div className="bg-luxury-panel/20 border border-luxury-border p-4 mb-6 flex flex-col sm:flex-row gap-4 items-end justify-between animate-fadeIn">
      <div className="flex flex-wrap gap-4 w-full sm:w-auto">
        {/* Catégorie Dropdown */}
        <div className="flex-grow sm:flex-initial min-w-[160px]">
          <label className="font-mono text-[9px] uppercase tracking-widest text-zinc-500 mb-1.5 block">
            Catégorie
          </label>
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-luxury-dark/95 border border-luxury-border text-white text-xs font-light px-3.5 py-2 pr-10 focus:border-luxury-gold/60 focus:outline-none appearance-none rounded-none cursor-pointer tracking-wide"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat} className="bg-luxury-dark text-white">
                  {cat}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-luxury-gold/80">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Genre Dropdown */}
        <div className="flex-grow sm:flex-initial min-w-[160px]">
          <label className="font-mono text-[9px] uppercase tracking-widest text-zinc-500 mb-1.5 block">
            Genre
          </label>
          <div className="relative">
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="w-full bg-luxury-dark/95 border border-luxury-border text-white text-xs font-light px-3.5 py-2 pr-10 focus:border-luxury-gold/60 focus:outline-none appearance-none rounded-none cursor-pointer tracking-wide"
            >
              {genres.map((g) => (
                <option key={g} value={g} className="bg-luxury-dark text-white">
                  {g}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-luxury-gold/80">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Active filters state indicator */}
      {(selectedCategory !== 'Tout' || selectedGenre !== 'Tout') && (
        <button
          onClick={() => {
            setSelectedCategory('Tout');
            setSelectedGenre('Tout');
          }}
          className="text-[10px] font-mono uppercase tracking-widest text-luxury-gold hover:text-white transition-colors flex items-center gap-1 shrink-0 self-start sm:self-auto py-2"
        >
          <span>Réinitialiser les filtres</span>
        </button>
      )}
    </div>
  );
}

/**
 * Robust Category matching helper for custom/mock products
 */
export function productMatchesCategory(p: Product, cat: string): boolean {
  if (cat === 'Tout') return true;

  const cLower = cat.toLowerCase();

  // Direct match on category
  if (p.category.toLowerCase() === cLower) return true;
  if (p.subCategory?.toLowerCase() === cLower) return true;

  const content = [
    p.name,
    p.description,
    p.category,
    p.subCategory || '',
    ...(p.tags || []),
    ...(p.searchKeywords || [])
  ].join(' ').toLowerCase();

  if (cLower === 't-shirt') {
    return content.includes('t-shirt') || content.includes('tshirt') || content.includes('tee') || content.includes('hauts');
  }

  if (cLower === 'short') {
    return content.includes('short');
  }

  if (cLower === 'sac') {
    return content.includes('sac') || content.includes('bag') || content.includes('messager') || content.includes('accessoires');
  }

  if (cLower === 'accessoire') {
    return content.includes('accessoire') || content.includes('accessory') || content.includes('accessories') || content.includes('bag') || content.includes('sac') || content.includes('bijoux') || content.includes('sautoir');
  }

  if (cLower === 'pantalon') {
    return content.includes('pantalon') || content.includes('pant') || content.includes('jeans') || content.includes('trouser');
  }

  if (cLower === 'chemisier') {
    return content.includes('chemisier') || content.includes('chemise') || content.includes('blouse') || content.includes('shirt') || content.includes('pull') || content.includes('sweater') || content.includes('hauts');
  }

  if (cLower === 'robes') {
    return content.includes('robe') || content.includes('dress');
  }

  if (cLower === 'outerwear') {
    return content.includes('outerwear') || content.includes('jacket') || content.includes('veste') || content.includes('coat') || content.includes('trench');
  }

  if (cLower === 'bijoux') {
    return content.includes('bijoux') || content.includes('jewelry') || content.includes('or') || content.includes('collier') || content.includes('necklace') || content.includes('sautoir');
  }

  if (cLower === 'hauts') {
    return content.includes('haut') || content.includes('top') || content.includes('pull') || content.includes('sweater') || content.includes('chemise') || content.includes('chemisier');
  }

  return false;
}

/**
 * Robust Gender matching helper for custom/mock products
 */
export function productMatchesGenre(p: Product, genre: string): boolean {
  if (genre === 'Tout') return true;

  const gLower = genre.toLowerCase();

  // Explicit overrides for mock data accuracy
  if (p.id === 'prod_1') return gLower === 'femme';
  if (p.id === 'prod_3') return gLower === 'femme';

  const content = [
    p.name,
    p.description,
    p.category,
    p.subCategory || '',
    ...(p.tags || []),
    ...(p.searchKeywords || [])
  ].join(' ').toLowerCase();

  if (gLower === 'homme') {
    if (content.includes('homme') || content.includes('man') || content.includes('men') || content.includes('garçon') || content.includes('unisex') || content.includes('uniseque') || p.id === 'prod_2' || p.id === 'prod_4' || p.id === 'prod_5' || p.id === 'prod_6') {
      return true;
    }
    return false;
  }

  if (gLower === 'femme') {
    if (content.includes('femme') || content.includes('woman') || content.includes('women') || content.includes('fille') || content.includes('robe') || content.includes('sautoir') || content.includes('unisex') || content.includes('uniseque') || p.id === 'prod_1' || p.id === 'prod_2' || p.id === 'prod_3' || p.id === 'prod_4' || p.id === 'prod_5' || p.id === 'prod_6') {
      return true;
    }
    return false;
  }

  if (gLower === 'enfants') {
    return content.includes('enfant') || content.includes('kids') || content.includes('kid') || content.includes('baby') || content.includes('bébé') || content.includes('child');
  }

  return true;
}

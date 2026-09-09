import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { Boutique, Product, Collection } from '../types';
import { Heart, Instagram, Facebook, Music2, Globe, MapPin, ArrowLeft, CheckCircle2, UserPlus, Users, FolderHeart, Calendar, MessageSquare, Check, Plus, Camera, LoaderCircle } from 'lucide-react';
import { BoutiqueProductFilters, productMatchesCategory, productMatchesGenre } from './bb_template';
import { compressImageToWebP } from '../utils/imageCompression';

interface BoutiqueDetailProps {
  boutique: Boutique;
  onBack: () => void;
  onProductClick: (product: Product) => void;
  favorites: string[];
  toggleFavorite: (productId: string) => void;
  onContactClick?: () => void;
  shouldTrackView?: boolean;
  isFollowing?: boolean;
  onFollowChange?: (following: boolean) => Promise<void>;
  canEditCover?: boolean;
  onCoverImageChange?: (coverImage: string) => Promise<void>;
}

export default function BoutiqueDetail({
  boutique,
  onBack,
  onProductClick,
  favorites,
  toggleFavorite,
  onContactClick,
  shouldTrackView = true,
  isFollowing = false,
  onFollowChange,
  canEditCover = false,
  onCoverImageChange
}: BoutiqueDetailProps) {
  const [activeTab, setActiveTab] = useState<'products' | 'collections' | 'about'>('products');
  const [followersCount, setFollowersCount] = useState(boutique.stats.followersCount);
  const [isFollowPending, setIsFollowPending] = useState(false);
  const [followError, setFollowError] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('Tout');
  const [selectedGenre, setSelectedGenre] = useState('Tout');
  const [coverImage, setCoverImage] = useState(boutique.coverImage);
  const [isUpdatingCover, setIsUpdatingCover] = useState(false);
  const [coverError, setCoverError] = useState('');
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCoverImage(boutique.coverImage);
  }, [boutique.coverImage]);

  const handleCoverSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !onCoverImageChange) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setCoverError('Choisissez une image JPG, PNG ou WebP.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setCoverError("L'image ne doit pas dépasser 5 Mo.");
      return;
    }

    setIsUpdatingCover(true);
    setCoverError('');

    try {
      const nextCoverImage = await compressImageToWebP(file);
      await onCoverImageChange(nextCoverImage.dataUrl);
      setCoverImage(nextCoverImage.dataUrl);
    } catch (error) {
      setCoverError(error instanceof Error ? error.message : 'La couverture n’a pas pu être enregistrée.');
    } finally {
      setIsUpdatingCover(false);
    }
  };

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
        console.error("Error fetching live products in BoutiqueDetail:", err);
      }
    };
    fetchLiveProducts();
  }, []);

  useEffect(() => {
    if (!shouldTrackView) return;
    const sessionKey = `storehub_boutique_view_${boutique.id}`;
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, '1');

    fetch(`/api/analytics/boutiques/${boutique.id}/view`, { method: 'POST' })
      .catch((error) => console.error('Error tracking boutique view:', error));
  }, [boutique.id, shouldTrackView]);

  const handleFollowToggle = async () => {
    if (!onFollowChange || isFollowPending) return;
    const nextFollowing = !isFollowing;
    setIsFollowPending(true);
    setFollowError('');
    try {
      await onFollowChange(nextFollowing);
      setFollowersCount((previous) => Math.max(0, previous + (nextFollowing ? 1 : -1)));
    } catch (error) {
      setFollowError(error instanceof Error ? error.message : 'Impossible de modifier cet abonnement.');
    } finally {
      setIsFollowPending(false);
    }
  };

  // Filter products belonging to this boutique
  const boutiqueProducts = products.filter(p => p.boutiqueId === boutique.id);

  // Apply category and genre filters to products inside this boutique
  const filteredBoutiqueProducts = boutiqueProducts.filter(p => 
    productMatchesCategory(p, selectedCategory) && 
    productMatchesGenre(p, selectedGenre)
  );

  // Filter collections belonging to this boutique
  const boutiqueCollections: Collection[] = [];

  return (
    <div className="pb-6">
      {/* 1. Header Cover Image with Parallax & Back Button */}
      <div className="relative h-[320px] md:h-[420px] w-full overflow-hidden bg-black">
        <img
          src={coverImage}
          alt={boutique.name}
          className="w-full h-full object-cover opacity-60 scale-100"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-luxury-dark via-black/10 to-transparent" />

        {canEditCover && (
          <>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleCoverSelection}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              disabled={isUpdatingCover}
              className="absolute top-[45px] right-6 z-20 flex items-center gap-2 rounded-full border border-white/25 bg-black/65 px-3.5 py-2 text-[10px] font-mono font-semibold uppercase tracking-wider text-white backdrop-blur-md transition-all hover:border-luxury-gold hover:text-luxury-gold disabled:cursor-wait disabled:opacity-70"
              aria-label="Changer la photo de couverture"
            >
              {isUpdatingCover ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              <span className="hidden sm:inline">Changer la couverture</span>
            </button>
            {coverError && (
              <div className="absolute top-[94px] right-6 z-20 max-w-[260px] rounded-lg border border-red-400/30 bg-black/85 px-3 py-2 text-[10px] text-red-200 backdrop-blur-md">
                {coverError}
              </div>
            )}
          </>
        )}
        
        {/* Floating Back Button */}
        <button
          onClick={onBack}
          className="absolute top-[45px] left-6 w-10 h-10 rounded-full bg-luxury-dark/80 backdrop-blur-md border border-luxury-border flex items-center justify-center text-white hover:text-luxury-gold transition-all duration-300 z-10"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Boutique Profile Section */}
      <div className="max-w-6xl mx-auto px-6 relative -mt-20 z-10">
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
                  {onFollowChange && (
                    <button
                      onClick={handleFollowToggle}
                      disabled={isFollowPending}
                      className={`w-5 h-5 rounded-full flex items-center justify-center transition-all focus:outline-none shrink-0 disabled:cursor-wait disabled:opacity-60 ${
                        isFollowing
                          ? 'bg-luxury-gold text-black hover:bg-luxury-gold/90'
                          : 'border border-luxury-gold/40 text-luxury-gold hover:bg-luxury-gold hover:text-black'
                      }`}
                      title={isFollowing ? "Ne plus suivre" : "Suivre la boutique"}
                    >
                      {isFollowPending ? (
                        <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                      ) : isFollowing ? (
                        <Check className="w-3.5 h-3.5 stroke-[3.5]" />
                      ) : (
                        <Plus className="w-3.5 h-3.5 stroke-[3.5]" />
                      )}
                    </button>
                  )}

                  {/* Followers count */}
                  <div className="flex items-center gap-1 font-mono text-xs">
                    <span className="text-luxury-gold font-bold">{followersCount}</span>
                    <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-sans">Abonnés</span>
                  </div>

                  {/* Products count */}
                  <div className="flex items-center gap-1 font-mono text-xs">
                    <span className="text-luxury-gold font-bold">{boutiqueProducts.length}</span>
                    <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-sans">Produits</span>
                  </div>

                  {/* Vertical divider line */}
                  <div className="h-4 w-[1px] bg-luxury-border/80 mx-0.5" />

                  {/* Message bubble button */}
                  <button
                    onClick={onContactClick}
                    className="text-zinc-400 hover:text-luxury-gold transition-colors focus:outline-none p-0.5"
                    title="Contacter le créateur"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </div>
                {followError && <p className="text-[9px] text-red-400">{followError}</p>}

                {/* Location row */}
                <div className="flex items-center gap-1.5 text-zinc-500 font-mono text-[9px] uppercase tracking-[0.25em]">
                  <MapPin className="w-3 h-3 text-luxury-gold/70" />
                  <span>{boutique.location.city}, {boutique.location.country}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Filter Tabs (Products / Collections / About) */}
        <div className="flex justify-center md:justify-start gap-8 mt-8 border-b border-luxury-border font-mono text-xs uppercase tracking-widest">
          <button
            onClick={() => setActiveTab('products')}
            className={`pb-4 border-b-2 transition-colors ${
              activeTab === 'products' ? 'border-luxury-gold text-luxury-gold font-semibold' : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Pièces ({boutiqueProducts.length})
          </button>
          <button
            onClick={() => setActiveTab('collections')}
            className={`pb-4 border-b-2 transition-colors ${
              activeTab === 'collections' ? 'border-luxury-gold text-luxury-gold font-semibold' : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Collections ({boutiqueCollections.length})
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`pb-4 border-b-2 transition-colors ${
              activeTab === 'about' ? 'border-luxury-gold text-luxury-gold font-semibold' : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            À propos
          </button>
        </div>

        {/* 4. Tab Content area */}
        <div className="mt-8">
          
          {/* PRODUCTS TAB */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              <BoutiqueProductFilters
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                selectedGenre={selectedGenre}
                setSelectedGenre={setSelectedGenre}
              />

              {filteredBoutiqueProducts.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-luxury-border rounded-none">
                  <p className="text-zinc-500 text-sm font-light mb-4">
                    Aucune pièce ne correspond à vos critères de recherche dans cette boutique.
                  </p>
                  <button
                    onClick={() => {
                      setSelectedCategory('Tout');
                      setSelectedGenre('Tout');
                    }}
                    className="px-5 py-2 bg-luxury-gold/10 hover:bg-luxury-gold/20 border border-luxury-gold/30 text-luxury-gold font-mono text-[10px] uppercase tracking-widest transition-all cursor-pointer"
                  >
                    Réinitialiser les filtres
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 md:gap-6">
                  {filteredBoutiqueProducts.map(p => {
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
                              {p.price} DA
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
          )}

          {/* COLLECTIONS TAB */}
          {activeTab === 'collections' && (
            <div className="space-y-12">
              {boutiqueCollections.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-luxury-border rounded-none">
                  <p className="text-zinc-500 text-sm font-light">Aucune collection n'est publiée pour le moment.</p>
                </div>
              ) : (
                boutiqueCollections.map(c => {
                  // Get products in this collection
                  const collectionProducts = products.filter(p => c.productIds.includes(p.id));
                  return (
                    <div key={c.id} className="relative rounded-none overflow-hidden border border-luxury-border bg-luxury-panel/25 p-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                        <div className="md:col-span-1 h-[240px] rounded-none overflow-hidden bg-luxury-panel border border-luxury-border">
                          <img
                            src={c.coverImage}
                            alt={c.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="md:col-span-2 space-y-4">
                          <span className="font-mono text-[9px] uppercase tracking-widest bg-luxury-gold/10 border border-luxury-gold/20 text-luxury-gold px-3 py-1 rounded-none">
                            Collection Officielle
                          </span>
                          <h3 className="serif-title text-2xl font-light text-white tracking-wide">
                            {c.name}
                          </h3>
                          <p className="text-zinc-400 text-xs font-light leading-relaxed">
                            {c.description}
                          </p>
                          
                          <div className="pt-2">
                            <h4 className="font-mono text-[9px] uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-1.5">
                              <FolderHeart className="w-3.5 h-3.5 text-luxury-gold/70" />
                              Pièces dans cette collection :
                            </h4>
                            <div className="flex gap-4 overflow-x-auto pb-2">
                              {collectionProducts.map(p => (
                                <div 
                                  key={p.id}
                                  onClick={() => onProductClick(p)}
                                  className="flex items-center gap-3 bg-luxury-panel/80 hover:bg-luxury-panel border border-luxury-border hover:border-luxury-gold/20 rounded-none p-2.5 cursor-pointer min-w-[180px] transition-all"
                                >
                                  <img src={p.images[0].url} alt={p.name} className="w-10 h-10 rounded-none object-cover" />
                                  <div>
                                    <h5 className="serif-title text-xs text-white tracking-wide truncate max-w-[100px]">{p.name}</h5>
                                    <span className="font-mono text-[10px] text-luxury-gold font-semibold">{p.price} DA</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ABOUT TAB */}
          {activeTab === 'about' && (
            <div className="max-w-3xl mx-auto space-y-8 py-4">
              <div className="space-y-4">
                <h3 className="serif-title text-2xl font-light text-white tracking-wide">
                  L'Âme de l'Atelier
                </h3>
                <p className="text-zinc-300 text-sm font-light leading-relaxed">
                  {boutique.description}
                </p>
              </div>

              {/* Social and links panel */}
              <div className="grid grid-cols-2 gap-4 sm:gap-6 pt-6 border-t border-luxury-border font-mono text-xs uppercase tracking-wider">
                <div className="space-y-4">
                  <h4 className="font-semibold text-luxury-gold">Informations Pratiques</h4>
                  <div className="space-y-2.5 text-zinc-400 text-[11px]">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-zinc-500" />
                      <span>{boutique.location.city}, {boutique.location.country}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-zinc-500" />
                      <span>Inscrit en {new Date(boutique.createdAt).getFullYear()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-zinc-500" />
                      <span>{followersCount} Abonnés Style</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-luxury-gold">Contact & Réseaux</h4>
                  <div className="space-y-2.5 text-zinc-400 text-[11px]">
                    {boutique.social.instagram && (
                      <a href={`https://instagram.com/${boutique.social.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-white transition-colors">
                        <Instagram className="w-4 h-4 text-zinc-500" />
                        <span>{boutique.social.instagram}</span>
                      </a>
                    )}
                    {boutique.social.tiktok && (
                      <a href={`https://www.tiktok.com/@${boutique.social.tiktok.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-white transition-colors">
                        <Music2 className="w-4 h-4 text-zinc-500" />
                        <span>{boutique.social.tiktok}</span>
                      </a>
                    )}
                    {boutique.social.facebook && (
                      <a href={boutique.social.facebook.startsWith('http') ? boutique.social.facebook : `https://www.facebook.com/${boutique.social.facebook.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-white transition-colors">
                        <Facebook className="w-4 h-4 text-zinc-500" />
                        <span>{boutique.social.facebook}</span>
                      </a>
                    )}
                    {boutique.social.website && (
                      <a href={boutique.social.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-white transition-colors">
                        <Globe className="w-4 h-4 text-zinc-500" />
                        <span>{boutique.social.website.replace('https://', '')}</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Tag pills */}
              <div className="pt-6 border-t border-luxury-border">
                <h4 className="font-mono text-xs uppercase tracking-widest text-zinc-500 mb-3 font-semibold">Identifiants d'expression :</h4>
                <div className="flex flex-wrap gap-2">
                  {boutique.tags.map(tag => (
                    <span
                      key={tag}
                      className="bg-luxury-panel text-zinc-400 border border-luxury-border px-3.5 py-1.5 rounded-none text-xs font-mono tracking-wider font-light"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

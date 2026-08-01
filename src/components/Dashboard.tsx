import { useState, useEffect } from 'react';
import { Product, Boutique } from '../types';
import { mockBoutiques, mockProducts } from '../mockData';
import { Eye, Heart, Layers, Plus, TrendingUp, Sparkles, CheckCircle2, ChevronRight, RefreshCw, Star, Trash2 } from 'lucide-react';

interface DashboardProps {
  onAddProductClick: () => void;
  onEditProductClick: (product: Product) => void;
  onProductClick: (product: Product) => void;
}

export default function Dashboard({ onAddProductClick, onEditProductClick, onProductClick }: DashboardProps) {
  const [activeBoutique, setActiveBoutique] = useState<Boutique>(mockBoutiques[0]); // Default to owner's first boutique (Atelier Noir)
  const [products, setProducts] = useState<Product[]>(
    mockProducts.filter(p => p.boutiqueId === mockBoutiques[0].id)
  );

  // Fetch live dashboard data on mount or boutique change
  useEffect(() => {
    const fetchLiveData = async () => {
      try {
        const [resB, resP] = await Promise.all([
          fetch('/api/boutiques'),
          fetch('/api/products')
        ]);
        if (resB.ok) {
          const liveBoutiques = await resB.json();
          if (liveBoutiques && liveBoutiques.length > 0) {
            // Find active boutique in the live list or default to the first
            const liveActive = liveBoutiques.find((b: Boutique) => b.id === activeBoutique.id) || liveBoutiques[0];
            setActiveBoutique(liveActive);
          }
        }
        if (resP.ok) {
          const liveProducts = await resP.json();
          if (liveProducts && liveProducts.length > 0) {
            setProducts(liveProducts.filter((p: Product) => p.boutiqueId === activeBoutique.id));
          }
        }
      } catch (err) {
        console.error("Error loading live dashboard data:", err);
      }
    };
    fetchLiveData();
  }, [activeBoutique.id]);

  const toggleAvailability = (productId: string) => {
    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        return { ...p, isAvailable: !p.isAvailable };
      }
      return p;
    }));
  };

  const deleteProduct = (productId: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette pièce de votre collection ?")) {
      setProducts(prev => prev.filter(p => p.id !== productId));
    }
  };

  // KPI Calculations
  const activeProductsCount = products.filter(p => p.isAvailable).length;
  const unavailableProductsCount = products.length - activeProductsCount;
  const totalViews = products.reduce((sum, p) => sum + p.stats.views, 0);
  const totalFavorites = products.reduce((sum, p) => sum + p.stats.favorites, 0);
  const availabilityPercentage = products.length > 0 ? Math.round((activeProductsCount / products.length) * 100) : 0;

  // Custom premium SVG chart points (representing 30-day views count)
  // Let's draw an elegant curved line with golden glow
  const chartData = [
    { day: '1 Juin', views: 120 },
    { day: '5 Juin', views: 150 },
    { day: '10 Juin', views: 240 },
    { day: '15 Juin', views: 190 },
    { day: '20 Juin', views: 310 },
    { day: '24 Juin', views: 342 }
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 mt-[45px] pb-32 animate-fadeIn">
      
      {/* 1. Header with Boutique profile overview */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-6 border-b border-luxury-border mb-8 gap-4">
        <div className="flex items-center gap-4">
          <img
            src={activeBoutique.logo}
            alt={activeBoutique.name}
            className="w-16 h-16 rounded-full border border-luxury-gold/30 object-cover"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="serif-title text-2xl font-light text-white tracking-wide">
                Console {activeBoutique.name}
              </h1>
              {activeBoutique.isVerified && (
                <CheckCircle2 className="w-4 h-4 text-luxury-gold fill-luxury-gold/10" />
              )}
            </div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-zinc-500 mt-0.5">
              Espace Propriétaire • Gérer votre atelier haute couture
            </p>
          </div>
        </div>
      </div>

      {/* 2. KPI Metrics Section */}
      <div className="space-y-6 mb-12">
        
        {/* Top Hero Card - Pièces Actives (Information cruciale) */}
        <div className="p-8 sm:p-10 bg-luxury-panel/40 border border-luxury-gold/30 relative overflow-hidden group hover:border-luxury-gold/60 transition-all duration-300">
          {/* Subtle top golden accent bar */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-luxury-gold to-transparent opacity-80" />
          
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            
            {/* Left Column: Big Ratio & Title */}
            <div className="space-y-3 flex-1 text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
                <span className="font-sans text-[10px] text-luxury-gold uppercase tracking-[0.25em] font-semibold">
                  Disponibilité du Catalogue • Statut Vente
                </span>
              </div>
              
              <div className="flex items-baseline justify-center lg:justify-start gap-3">
                <span className="font-mono text-5xl sm:text-6xl text-white font-light tracking-tight">
                  {activeProductsCount}
                </span>
                <span className="font-mono text-2xl sm:text-3xl text-zinc-500 font-extralight">
                  / {products.length}
                </span>
                <span className="font-sans text-xs text-zinc-400 font-normal uppercase tracking-wider ml-1">
                  {products.length > 1 ? 'pièces publiées' : 'pièce publiée'}
                </span>
              </div>

              <p className="font-sans text-xs text-zinc-400 max-w-md">
                Ratio des créations immédiatement réservables par vos clients en boutique.
              </p>
            </div>

            {/* Right Column: Executive Metric Breakdown Card */}
            <div className="w-full lg:w-80 bg-black/60 border border-luxury-border p-5 space-y-4 shrink-0 backdrop-blur-sm">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800 text-[10px] uppercase font-mono tracking-widest text-zinc-400">
                <span>Rapport d'activité</span>
                <span className="text-luxury-gold font-bold">{availabilityPercentage}% Actif</span>
              </div>

              {/* Minimalist Dual Segment Progress Indicator */}
              <div className="space-y-1.5">
                <div className="w-full bg-zinc-900 h-2 flex overflow-hidden p-0.5 border border-zinc-800">
                  <div 
                    className="bg-emerald-500 h-full transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
                    style={{ width: `${availabilityPercentage}%` }} 
                  />
                  <div 
                    className="bg-red-500 h-full transition-all duration-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" 
                    style={{ width: `${100 - availabilityPercentage}%` }} 
                  />
                </div>
              </div>

              {/* Status Breakdown Grid */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-2.5 bg-zinc-900/80 border border-emerald-500/20 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-mono font-medium uppercase">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                    En Vitrine
                  </div>
                  <span className="font-mono text-xl text-white font-medium pl-3.5">
                    {activeProductsCount}
                  </span>
                </div>

                <div className="p-2.5 bg-zinc-900/80 border border-red-500/20 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-red-400 text-[10px] font-mono font-medium uppercase">
                    <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
                    Indisponible
                  </div>
                  <span className="font-mono text-xl text-white font-medium pl-3.5">
                    {unavailableProductsCount}
                  </span>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* Row Below - Vues Atelier & Coups de Cœur on the same line */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          
          {/* Card 1: Vues Atelier */}
          <div className="p-8 sm:p-10 bg-luxury-panel/30 border border-luxury-border rounded-none flex flex-col items-center justify-center text-center relative overflow-hidden group hover:border-luxury-gold/30 transition-all min-h-[160px]">
            <div className="space-y-2 flex flex-col items-center justify-center">
              <span className="font-sans text-[11px] text-zinc-400 uppercase tracking-widest block font-medium">
                Vues Atelier (7j)
              </span>
              <span className="font-mono text-4xl text-white font-light block tracking-tight">
                {totalViews}
              </span>
              <span className="font-mono text-[11px] text-emerald-500 flex items-center justify-center gap-1.5 font-medium">
                <TrendingUp className="w-4 h-4" /> +12.4% ce mois
              </span>
            </div>
          </div>

          {/* Card 2: Coups de cœur */}
          <div className="p-8 sm:p-10 bg-luxury-panel/30 border border-luxury-border rounded-none flex flex-col items-center justify-center text-center relative overflow-hidden group hover:border-luxury-gold/30 transition-all min-h-[160px]">
            <div className="space-y-2 flex flex-col items-center justify-center">
              <span className="font-sans text-[11px] text-zinc-400 uppercase tracking-widest block font-medium">
                Coups de cœur
              </span>
              <span className="font-mono text-4xl text-white font-light block tracking-tight">
                {totalFavorites}
              </span>
              <span className="font-mono text-[11px] text-luxury-gold flex items-center justify-center gap-1.5 font-medium">
                <Star className="w-4 h-4 fill-luxury-gold/20 text-luxury-gold" /> Boutique populaire
              </span>
            </div>
          </div>

        </div>

      </div>

      {/* 3. Analytics Chart Curve using elegant CSS / SVG */}
      <div className="p-6 bg-luxury-panel/30 border border-luxury-border rounded-none mb-10">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="serif-title text-lg font-light text-white tracking-wide">Évolution de la Visibilité</h3>
            <p className="font-mono text-[9px] uppercase tracking-widest text-zinc-500 mt-0.5">Visites de vos fiches produits sur 30 jours</p>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-luxury-gold">
            <TrendingUp className="w-4 h-4" />
            <span>Mise à jour toutes les 5min</span>
          </div>
        </div>

        {/* SVG Curve chart */}
        <div className="relative h-48 w-full bg-luxury-panel/20 border border-luxury-border rounded-none p-4 flex flex-col justify-end">
          
          {/* Main SVG Curve */}
          <svg className="w-full h-32 overflow-visible" viewBox="0 0 600 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            {/* Background shadow path */}
            <path
              d="M 0 80 Q 120 70 240 40 T 480 20 T 600 10 L 600 100 L 0 100 Z"
              fill="url(#chartGlow)"
            />
            {/* Main golden line path */}
            <path
              d="M 0 80 Q 120 70 240 40 T 480 20 T 600 10"
              fill="none"
              stroke="#D4AF37"
              strokeWidth="2"
              className="drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]"
            />
            {/* Floating marker points */}
            <circle cx="240" cy="40" r="4" fill="#D4AF37" />
            <circle cx="480" cy="20" r="4" fill="#D4AF37" />
            <circle cx="600" cy="10" r="4" fill="#D4AF37" />
          </svg>

          {/* X Axis indicators */}
          <div className="flex justify-between items-center text-[10px] font-mono text-zinc-600 mt-4 pt-2 border-t border-luxury-border">
            {chartData.map((d, idx) => (
              <span key={idx}>{d.day}</span>
            ))}
          </div>

        </div>
      </div>

      {/* 4. Active products list with availability toggles & Edit/Delete actions */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="serif-title text-xl font-light text-white tracking-wide">Votre Catalogue</h3>
            <p className="font-mono text-[9px] uppercase tracking-widest text-zinc-500 mt-0.5">Modifier les stocks, modifier les prix ou supprimer</p>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-luxury-border rounded-none">
            <Plus className="w-10 h-10 text-zinc-700 mx-auto mb-4" />
            <p className="text-sm font-light text-zinc-400 mb-1">Aucune pièce dans votre boutique.</p>
            <p className="text-xs text-zinc-600 mb-4">Commencez dès maintenant à ajouter vos créations d'exception.</p>
            <button 
              onClick={onAddProductClick}
              className="px-5 py-2 border border-luxury-gold text-luxury-gold rounded-none text-xs uppercase tracking-wider hover:bg-luxury-gold hover:text-black transition-all duration-300"
            >
              Ajouter une pièce
            </button>
          </div>
        ) : (
          <div className="border border-luxury-border rounded-none bg-luxury-panel/10 divide-y divide-luxury-border">
            {products.map(p => {
              return (
                <div key={p.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 gap-4 hover:bg-luxury-panel/20 transition-colors">
                  
                  {/* Thumbnail and name */}
                  <div 
                    onClick={() => onProductClick(p)}
                    className="flex items-center gap-4 cursor-pointer flex-grow"
                  >
                    <img
                      src={p.images[0].url}
                      alt={p.name}
                      className="w-12 h-16 rounded-none object-cover border border-luxury-border"
                    />
                    <div>
                      <h4 className="serif-title text-base font-light text-white hover:text-luxury-gold transition-colors tracking-wide">{p.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-xs text-luxury-gold font-semibold">{p.price} €</span>
                        <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest bg-luxury-panel border border-luxury-border px-2 py-0.5 rounded-none">
                          {p.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & toggles */}
                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                    {/* Status Toggle */}
                    <div className="flex items-center gap-2.5 font-mono text-[10px] uppercase">
                      <span 
                        className={`w-2.5 h-2.5 rounded-full inline-block transition-all ${
                          p.isAvailable 
                            ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' 
                            : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
                        }`}
                        title={p.isAvailable ? 'Disponible' : 'Indisponible'}
                      />
                      <button
                        onClick={() => toggleAvailability(p.id)}
                        className={`w-10 h-5 rounded-none p-0.5 transition-colors relative flex items-center ${
                          p.isAvailable ? 'bg-luxury-gold' : 'bg-luxury-border'
                        }`}
                        title={p.isAvailable ? 'Marquer comme indisponible' : 'Marquer comme disponible'}
                      >
                        <span className={`w-4 h-4 rounded-none bg-black shadow transition-transform ${
                          p.isAvailable ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>

                    {/* Edit & Delete operations */}
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => deleteProduct(p.id)}
                        className="w-9 h-9 rounded-none bg-luxury-panel hover:bg-red-950/20 border border-luxury-border hover:border-red-900 text-zinc-500 hover:text-red-400 flex items-center justify-center transition-colors"
                        title="Supprimer la pièce"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}

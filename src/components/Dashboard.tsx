import { useEffect, useMemo, useRef, useState } from 'react';
import { Boutique, ManualOrder, Product, VisibilityPoint } from '../types';
import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eye,
  Layers,
  Package,
  Plus,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Trash2,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import FennecMascot from './FennecMascot';
import FenncoAICenter from './FenncoAICenter';
import { firebaseAuthenticatedFetch } from '../utils/firebaseAuthenticatedFetch';

interface DashboardProps {
  boutiqueId: string;
  onAddProductClick: () => void;
  onEditProductClick: (product: Product) => void;
  onProductClick: (product: Product) => void;
  onOrdersClick: () => void;
  onOpenQA?: () => void;
}

type StatusFilter = 'all' | 'active' | 'out_of_stock';
const CATALOG_PAGE_SIZE = 6;

export default function Dashboard({ boutiqueId, onAddProductClick, onEditProductClick, onProductClick, onOrdersClick }: DashboardProps) {
  const [activeBoutique, setActiveBoutique] = useState<Boutique | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<ManualOrder[]>([]);
  const [visibility, setVisibility] = useState<VisibilityPoint[]>([]);
  const [isFenncoOpen, setIsFenncoOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<StatusFilter>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [catalogPage, setCatalogPage] = useState(1);
  const [isCatalogExpanded, setIsCatalogExpanded] = useState(true);
  const catalogSectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const fetchLiveData = async () => {
      try {
        const [boutiquesResponse, productsResponse, ordersResponse, visibilityResponse] = await Promise.all([
          fetch('/api/boutiques'),
          fetch('/api/products'),
          firebaseAuthenticatedFetch(`/api/orders?boutiqueId=${encodeURIComponent(boutiqueId)}`),
          fetch(`/api/analytics/boutiques/${encodeURIComponent(boutiqueId)}/visibility?days=30`),
        ]);

        if (boutiquesResponse.ok) {
          const liveBoutiques: Boutique[] = await boutiquesResponse.json();
          setActiveBoutique(liveBoutiques.find((boutique) => boutique.id === boutiqueId) || null);
        }

        if (productsResponse.ok) {
          const liveProducts: Product[] = await productsResponse.json();
          setProducts(liveProducts.filter((product) => product.boutiqueId === boutiqueId));
        }
        if (ordersResponse.ok) setOrders(await ordersResponse.json());
        if (visibilityResponse.ok) setVisibility(await visibilityResponse.json());
      } catch (error) {
        console.error('Error loading live dashboard data:', error);
      }
    };

    fetchLiveData();
    const interval = window.setInterval(fetchLiveData, 5 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [boutiqueId]);

  // Keep the order counter fresh without reloading the heavier dashboard data.
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await firebaseAuthenticatedFetch(`/api/orders?boutiqueId=${encodeURIComponent(boutiqueId)}`);
        if (response.ok) setOrders(await response.json());
      } catch (error) {
        console.error('Error refreshing dashboard orders:', error);
      }
    };

    const interval = window.setInterval(fetchOrders, 10_000);
    return () => window.clearInterval(interval);
  }, [boutiqueId]);

  const toggleAvailability = async (productId: string) => {
    const product = products.find((item) => item.id === productId);
    if (!product) return;
    const isAvailable = !product.isAvailable;
    try {
      const response = await firebaseAuthenticatedFetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable, updatedAt: new Date().toISOString() })
      });
      if (!response.ok) throw new Error('Availability could not be saved');
      setProducts((currentProducts) => currentProducts.map((item) => (
        item.id === productId ? { ...item, isAvailable } : item
      )));
    } catch (error) {
      console.error('Error saving product availability:', error);
    }
  };

  const deleteProduct = async (productId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette pièce de votre collection ?')) {
      try {
        const response = await firebaseAuthenticatedFetch(`/api/products/${productId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Product could not be deleted');
        setProducts((currentProducts) => currentProducts.filter((product) => product.id !== productId));
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  };

  const productMetrics = useMemo(() => products.reduce((metrics, product) => {
    if (product.isAvailable) metrics.activeProductsCount += 1;
    metrics.totalViews += product.stats.views;
    return metrics;
  }, { activeProductsCount: 0, totalViews: 0 }), [products]);
  const activeProductsCount = productMetrics.activeProductsCount;
  const outOfStockCount = products.length - activeProductsCount;
  const totalViews = productMetrics.totalViews;
  const ordersCount = orders.length;
  const clientsCount = useMemo(() => new Set(
    orders.map((order) => order.clientName.trim().toLocaleLowerCase('fr')).filter(Boolean)
  ).size, [orders]);
  const availabilityPercentage = products.length > 0
    ? Math.round((activeProductsCount / products.length) * 100)
    : 0;
  const boutiqueViews = activeBoutique?.stats?.viewsCount ?? 0;
  const categoryCounts = useMemo(() => products.reduce<Record<string, number>>((counts, product) => {
    counts[product.category] = (counts[product.category] || 0) + 1;
    return counts;
  }, {}), [products]);
  const availableCategories = useMemo(() => Object.keys(categoryCounts).sort((a, b) => (
    a.localeCompare(b, 'fr')
  )), [categoryCounts]);
  const catalogCount = availableCategories.length;

  const filteredProducts = useMemo(() => {
    const normalizedSearch = catalogSearch.trim().toLocaleLowerCase('fr');
    return products.filter((product) => {
      const matchesSearch = !normalizedSearch
        || product.name.toLocaleLowerCase('fr').includes(normalizedSearch)
        || product.category.toLocaleLowerCase('fr').includes(normalizedSearch)
        || product.price.toString().includes(normalizedSearch)
        || product.tags.some((tag) => tag.toLocaleLowerCase('fr').includes(normalizedSearch));
      const matchesStatus = selectedStatusFilter === 'all'
        || (selectedStatusFilter === 'active' && product.isAvailable)
        || (selectedStatusFilter === 'out_of_stock' && !product.isAvailable);
      const matchesCategory = selectedCategoryFilter === 'all' || product.category === selectedCategoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [catalogSearch, products, selectedCategoryFilter, selectedStatusFilter]);

  const catalogPageCount = Math.max(1, Math.ceil(filteredProducts.length / CATALOG_PAGE_SIZE));
  const catalogPageStart = (catalogPage - 1) * CATALOG_PAGE_SIZE;
  const visibleCatalogProducts = useMemo(() => (
    filteredProducts.slice(catalogPageStart, catalogPageStart + CATALOG_PAGE_SIZE)
  ), [catalogPageStart, filteredProducts]);
  const firstVisibleProductNumber = filteredProducts.length === 0 ? 0 : catalogPageStart + 1;
  const lastVisibleProductNumber = Math.min(catalogPageStart + CATALOG_PAGE_SIZE, filteredProducts.length);

  useEffect(() => {
    setCatalogPage(1);
  }, [catalogSearch, selectedCategoryFilter, selectedStatusFilter]);

  useEffect(() => {
    setCatalogPage((currentPage) => Math.min(currentPage, catalogPageCount));
  }, [catalogPageCount]);

  const changeCatalogPage = (nextPage: number) => {
    const safePage = Math.min(Math.max(nextPage, 1), catalogPageCount);
    setCatalogPage(safePage);
    window.requestAnimationFrame(() => {
      catalogSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const topViewedProducts = useMemo(() => (
    [...products].sort((a, b) => b.stats.views - a.stats.views).slice(0, 2)
  ), [products]);
  const topSellingProducts = useMemo(() => {
    const deliveredSales = orders.reduce<Record<string, number>>((sales, order) => {
      if (order.status === 'livre' && order.productId) {
        sales[order.productId] = (sales[order.productId] || 0) + Math.max(1, order.quantity || 1);
      }
      return sales;
    }, {});

    return products
      .map((product) => ({ product, sales: deliveredSales[product.id] || 0 }))
      .filter((entry) => entry.sales > 0)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 2);
  }, [orders, products]);

  const chartMax = Math.max(
    1,
    ...visibility.map((point) => Math.max(point.boutiqueViews, point.productViews))
  );
  const toChartPoints = (values: number[]) => values.map((value, index) => {
    const x = values.length <= 1 ? 0 : (index / (values.length - 1)) * 600;
    const y = 92 - (value / chartMax) * 78;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const boutiqueChartPoints = toChartPoints(visibility.map((point) => point.boutiqueViews));
  const productChartPoints = toChartPoints(visibility.map((point) => point.productViews));
  const chartDays = Array.from({ length: Math.min(7, visibility.length) }, (_, index) => {
    const position = visibility.length <= 1 ? 0 : Math.round(index * (visibility.length - 1) / 6);
    const point = visibility[position];
    return point ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(`${point.date}T12:00:00`)) : '';
  });
  const currentDateLabel = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date()).toUpperCase();

  const secondaryStats: Array<{
    icon: typeof Eye;
    label: string;
    value: number;
    sub: string;
    accent: string;
    filterValue?: StatusFilter;
  }> = [
    {
      icon: Layers,
      label: 'Total Articles',
      value: products.length,
      sub: 'Pièces enregistrées',
      accent: 'text-luxury-gold',
      filterValue: 'all',
    },
    {
      icon: CheckCircle2,
      label: 'Produits Actifs',
      value: activeProductsCount,
      sub: `${availabilityPercentage}% en vitrine`,
      accent: 'text-emerald-400',
      filterValue: 'active',
    },
    {
      icon: BookOpen,
      label: 'Catalogues',
      value: catalogCount,
      sub: 'Catégories actives',
      accent: 'text-luxury-gold',
    },
    {
      icon: Users,
      label: 'Clients',
      value: clientsCount,
      sub: 'Comptes enregistrés',
      accent: 'text-luxury-gold',
    },
  ];

  const resetFilters = () => {
    setCatalogSearch('');
    setSelectedStatusFilter('all');
    setSelectedCategoryFilter('all');
    setCatalogPage(1);
  };

  if (!activeBoutique) {
    return <div className="w-full min-h-64 flex items-center justify-center text-zinc-500 font-mono text-xs">Chargement des données boutique…</div>;
  }

  return (
    <div className="w-full min-h-full max-w-6xl mx-auto px-4 sm:px-6 pt-[45px] pb-6 animate-fadeIn">
      {/* Locked boutique profile zone, intentionally unchanged. */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-luxury-border/60 gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <img
            src={activeBoutique.logo}
            alt={activeBoutique.name}
            className="w-16 h-16 rounded-full border border-luxury-gold/30 object-cover shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="serif-title text-2xl sm:text-3xl font-light text-white tracking-wide truncate">
                Console {activeBoutique.name}
              </h1>
              {activeBoutique.isVerified && (
                <CheckCircle2 className="w-5 h-5 text-luxury-gold fill-luxury-gold/10 shrink-0" />
              )}
            </div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400 mt-0.5 truncate">
              Espace Propriétaire • Gérer votre atelier haute couture
            </p>
          </div>
        </div>
      </div>

      {/* Locked FENNCO IA zone, intentionally unchanged. */}
      <div className="mb-8 flex justify-center w-full">
        <button
          onClick={() => setIsFenncoOpen(true)}
          className="relative w-full bg-[#0A0A0A] border border-[#D4AF37]/70 hover:border-[#D4AF37] px-4 sm:px-5 py-3 shadow-[0_0_20px_rgba(212,175,55,0.2)] hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] hover:scale-[1.008] active:scale-[0.985] transition-all duration-300 flex items-center justify-between gap-3 cursor-pointer group rounded-none overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <FennecMascot size="md" showGlow={true} className="group-hover:scale-105 transition-transform shrink-0" />
            <div className="text-left min-w-0">
              <div className="flex items-center gap-2">
                <span className="serif-title text-base sm:text-xl text-[#D4AF37] font-normal tracking-wide leading-none truncate block">
                  FENNCO IA
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              </div>
              <p className="font-mono text-[9px] sm:text-[10px] text-zinc-300 uppercase tracking-widest mt-0.5 truncate">
                Votre conseiller intelligent
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono text-[#D4AF37] bg-[#D4AF37]/10 px-2.5 sm:px-3 py-1.5 border border-[#D4AF37]/30 group-hover:bg-[#D4AF37] group-hover:text-black transition-colors shrink-0 font-bold uppercase tracking-wider">
            <span>Analyser</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </button>
      </div>

      <FenncoAICenter
        isOpen={isFenncoOpen}
        onClose={() => setIsFenncoOpen(false)}
        boutique={activeBoutique}
        products={products}
      />

      <div dir="rtl" className="space-y-4 mb-10 w-full text-right pt-5">
        <section aria-labelledby="daily-summary-title" className="bg-[#0C0C0C] border border-luxury-gold/45 p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-2.5">
            <CalendarDays className="w-4 h-4 text-luxury-gold shrink-0" />
            <h2 id="daily-summary-title" className="font-mono text-[10px] uppercase tracking-[0.18em] text-luxury-gold font-bold">
              Résumé du jour · {currentDateLabel}
            </h2>
          </div>
          <p dir="ltr" className="text-sm text-zinc-200 leading-relaxed text-right">
            <span className="text-luxury-gold font-semibold">{activeBoutique.name}</span> a généré{' '}
            <span className="text-white font-bold">{boutiqueViews.toLocaleString('fr-FR')}</span> vues boutique et{' '}
            <span className="text-white font-bold">{totalViews.toLocaleString('fr-FR')}</span> vues produits.{' '}
            <span className="text-emerald-400 font-bold">{activeProductsCount}</span> pièces actives sur{' '}
            <span className="text-white font-bold">{products.length}</span>,{' '}
            <span className="text-luxury-gold font-bold">{ordersCount}</span> commande{ordersCount > 1 ? 's' : ''} en suivi.
          </p>
        </section>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <button
            type="button"
            onClick={onOrdersClick}
            aria-label="Ouvrir la gestion des commandes"
            className="min-h-32 bg-luxury-panel/30 border border-luxury-gold/35 hover:border-luxury-gold hover:bg-luxury-gold/5 p-4 flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 text-zinc-400">
              <ShoppingBag className="w-4 h-4 text-luxury-gold" />
              <span className="font-mono text-[9px] sm:text-[10px] uppercase tracking-wider">Commandes</span>
            </div>
            <strong className="font-mono text-3xl font-light text-white">{ordersCount.toLocaleString('fr-FR')}</strong>
            <span className="text-[10px] sm:text-xs text-zinc-500">En cours de suivi</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedStatusFilter('out_of_stock')}
            aria-pressed={selectedStatusFilter === 'out_of_stock'}
            className={`min-h-32 p-4 border flex flex-col items-center justify-center gap-2 transition-colors ${
              selectedStatusFilter === 'out_of_stock'
                ? 'bg-red-950/25 border-red-500/70'
                : 'bg-luxury-panel/30 border-luxury-gold/35 hover:border-red-500/60'
            }`}
          >
            <div className="flex items-center gap-2 text-zinc-400">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="font-mono text-[9px] sm:text-[10px] uppercase tracking-wider">Hors stock</span>
            </div>
            <strong className="font-mono text-3xl font-light text-white">{outOfStockCount.toLocaleString('fr-FR')}</strong>
            <span className="text-[10px] sm:text-xs text-zinc-500">À réapprovisionner</span>
          </button>
        </div>

        <section aria-labelledby="visibility-title" className="p-4 sm:p-5 bg-luxury-panel/30 border border-luxury-gold/35 overflow-hidden">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h3 id="visibility-title" className="font-mono text-[11px] uppercase tracking-[0.16em] text-white font-bold">Évolution de la visibilité</h3>
              <p className="font-mono text-[8px] sm:text-[9px] uppercase tracking-widest text-zinc-500 mt-1">Visites de vos fiches produits sur 30 jours</p>
              <div className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider text-luxury-gold mt-2">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Mise à jour toutes les 5 min</span>
              </div>
            </div>

            <dl className="space-y-2 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-luxury-gold" />
                <div>
                  <dt className="text-[9px] text-zinc-500">Vues boutique</dt>
                  <dd className="font-mono text-lg text-white leading-none">{boutiqueViews.toLocaleString('fr-FR')}</dd>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <div>
                  <dt className="text-[9px] text-zinc-500">Vues produits</dt>
                  <dd className="font-mono text-lg text-white leading-none">{totalViews.toLocaleString('fr-FR')}</dd>
                </div>
              </div>
            </dl>
          </div>

          <div dir="ltr" className="relative h-44 w-full bg-black/30 border border-luxury-border p-3 flex flex-col justify-end" aria-label="Courbe de visibilité sur 30 jours">
            <svg className="w-full h-28 overflow-visible" viewBox="0 0 600 100" preserveAspectRatio="none" role="img" aria-label="La visibilité progresse sur les trente derniers jours">
              {boutiqueChartPoints && (
                <polygon points={`0,100 ${boutiqueChartPoints} 600,100`} fill="rgba(212,175,55,0.10)" />
              )}
              <polyline points={boutiqueChartPoints} fill="none" stroke="#D4AF37" strokeWidth="2.25" vectorEffect="non-scaling-stroke" />
              <polyline points={productChartPoints} fill="none" stroke="#10B981" strokeWidth="1.5" opacity="0.7" vectorEffect="non-scaling-stroke" />
            </svg>
            <div className="flex justify-between items-center text-[8px] sm:text-[9px] font-mono text-zinc-600 mt-3 pt-2 border-t border-luxury-border">
              {chartDays.map((day) => <span key={day}>{day}</span>)}
            </div>
          </div>
        </section>

        <section ref={catalogSectionRef} aria-labelledby="catalog-actions-title" className="scroll-mt-4 bg-luxury-panel/20 border border-luxury-gold/35">
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 id="catalog-actions-title" className="font-mono text-[11px] uppercase tracking-[0.16em] text-white font-bold">Actions catalogue</h3>
                <button
                  type="button"
                  onClick={() => setIsCatalogExpanded((isExpanded) => !isExpanded)}
                  aria-expanded={isCatalogExpanded}
                  aria-controls="catalog-results"
                  className="mt-1 flex min-h-8 items-center gap-1 font-mono text-[8px] uppercase tracking-wider text-luxury-gold hover:text-white"
                >
                  {isCatalogExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  {isCatalogExpanded ? 'Réduire la liste' : `Afficher les articles (${filteredProducts.length})`}
                </button>
              </div>
              <button
                type="button"
                onClick={onAddProductClick}
                className="min-h-11 px-3 bg-luxury-gold text-black font-mono text-[9px] font-bold uppercase tracking-wide whitespace-nowrap hover:bg-amber-300 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter une pièce</span>
              </button>
            </div>

            {isCatalogExpanded && (
              <>
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={catalogSearch}
                onChange={(event) => setCatalogSearch(event.target.value)}
                placeholder="Rechercher par nom, catégorie, prix ou référence..."
                dir="ltr"
                className="w-full min-h-11 bg-black/70 border border-luxury-border pr-10 pl-9 py-2.5 text-xs text-right text-white placeholder-zinc-500 focus:outline-none focus:border-luxury-gold transition-colors"
              />
              {catalogSearch && (
                <button type="button" onClick={() => setCatalogSearch('')} aria-label="Effacer la recherche" className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="relative">
              <SlidersHorizontal className="w-4 h-4 text-zinc-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedCategoryFilter}
                onChange={(event) => setSelectedCategoryFilter(event.target.value)}
                className="w-full min-h-11 appearance-none bg-black/70 border border-luxury-border pr-10 pl-3 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-luxury-gold font-mono cursor-pointer"
              >
                <option value="all">Toutes les catégories ({products.length})</option>
                {availableCategories.map((category) => (
                  <option key={category} value={category}>{category} ({categoryCounts[category]})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2" aria-label="Filtres de statut">
              {([
                ['all', `Tous (${products.length})`],
                ['active', `En vitrine (${activeProductsCount})`],
                ['out_of_stock', `Hors stock (${outOfStockCount})`],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSelectedStatusFilter(value)}
                  aria-pressed={selectedStatusFilter === value}
                  className={`min-h-10 px-2 border font-mono text-[8px] sm:text-[9px] uppercase tracking-wider transition-colors ${
                    selectedStatusFilter === value
                      ? value === 'out_of_stock'
                        ? 'bg-red-950/40 border-red-500 text-red-300'
                        : value === 'active'
                          ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300'
                          : 'bg-luxury-gold border-luxury-gold text-black font-bold'
                      : 'bg-black/50 border-luxury-border text-zinc-400 hover:border-luxury-gold/50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div aria-live="polite" className="font-mono text-[9px] text-zinc-500">
              Pièces <span className="text-white font-bold">{firstVisibleProductNumber}-{lastVisibleProductNumber}</span> sur <span className="text-white font-bold">{filteredProducts.length}</span>
              <span className="text-zinc-600"> · {products.length} au total</span>
            </div>
              </>
            )}
          </div>

          {!isCatalogExpanded ? (
            <button
              type="button"
              onClick={() => setIsCatalogExpanded(true)}
              className="flex min-h-14 w-full items-center justify-between border-t border-luxury-border px-4 font-mono text-[9px] uppercase tracking-wider text-zinc-400 hover:bg-white/[0.02] hover:text-luxury-gold"
            >
              <span>{filteredProducts.length} pièce{filteredProducts.length > 1 ? 's' : ''} dans la sélection</span>
              <span className="flex items-center gap-1 text-luxury-gold">Ouvrir <ChevronDown className="h-3.5 w-3.5" /></span>
            </button>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-10 px-5 border-t border-luxury-border">
              <AlertCircle className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
              <p className="text-sm text-zinc-300">Aucune pièce ne correspond à vos filtres.</p>
              <button type="button" onClick={resetFilters} className="mt-4 min-h-10 px-4 border border-luxury-gold/40 text-luxury-gold font-mono text-[9px] uppercase tracking-wider">
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <>
            <div id="catalog-results" className="divide-y divide-luxury-border border-t border-luxury-border">
              {visibleCatalogProducts.map((product, index) => (
                <article key={product.id} className="p-3 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors">
                  <button type="button" onClick={() => onProductClick(product)} className="min-w-0 flex-1 flex items-center gap-3 text-right">
                    <img src={product.images[0]?.url} alt={product.name} loading="lazy" decoding="async" className="w-12 h-14 object-cover border border-luxury-border shrink-0" />
                    <span className="w-7 h-7 rounded-full border border-luxury-gold/45 text-luxury-gold font-mono text-[10px] flex items-center justify-center shrink-0">{catalogPageStart + index + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="serif-title text-sm text-white block truncate">{product.name}</span>
                      <span className="font-mono text-[10px] text-luxury-gold">{product.stats.views} vues · {product.price} DA</span>
                    </span>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => toggleAvailability(product.id)} title={product.isAvailable ? 'Masquer la pièce' : 'Publier la pièce'} aria-label={product.isAvailable ? `Masquer ${product.name}` : `Publier ${product.name}`} className={`w-10 h-10 border flex items-center justify-center ${product.isAvailable ? 'border-emerald-800 text-emerald-400' : 'border-red-900 text-red-400'}`}>
                      {product.isAvailable ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    </button>
                    <button type="button" onClick={() => onEditProductClick(product)} title="Modifier la pièce" aria-label={`Modifier ${product.name}`} className="w-10 h-10 border border-luxury-border text-luxury-gold hover:border-luxury-gold flex items-center justify-center">
                      <SlidersHorizontal className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => deleteProduct(product.id)} title="Supprimer la pièce" aria-label={`Supprimer ${product.name}`} className="w-10 h-10 border border-luxury-border text-zinc-500 hover:text-red-400 hover:border-red-800 flex items-center justify-center">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
            {catalogPageCount > 1 && (
              <nav aria-label="Pagination du catalogue" className="flex items-center justify-between gap-3 border-t border-luxury-border bg-black/35 p-3">
                <button
                  type="button"
                  onClick={() => changeCatalogPage(catalogPage - 1)}
                  disabled={catalogPage === 1}
                  className="flex min-h-11 min-w-11 items-center justify-center gap-1 border border-luxury-border px-3 font-mono text-[9px] uppercase tracking-wider text-zinc-300 hover:border-luxury-gold hover:text-luxury-gold disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                  <span className="hidden sm:inline">Précédent</span>
                </button>
                <span className="text-center font-mono text-[9px] uppercase tracking-wider text-zinc-500">
                  Page <strong className="text-white">{catalogPage}</strong> / {catalogPageCount}
                </span>
                <button
                  type="button"
                  onClick={() => changeCatalogPage(catalogPage + 1)}
                  disabled={catalogPage === catalogPageCount}
                  className="flex min-h-11 min-w-11 items-center justify-center gap-1 border border-luxury-border px-3 font-mono text-[9px] uppercase tracking-wider text-zinc-300 hover:border-luxury-gold hover:text-luxury-gold disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <span className="hidden sm:inline">Suivant</span>
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </nav>
            )}
            </>
          )}
        </section>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {secondaryStats.map((card) => {
            const Icon = card.icon;
            const isActive = Boolean(card.filterValue && selectedStatusFilter === card.filterValue);
            const content = (
              <>
                <div className="flex items-center gap-2 text-zinc-400">
                  <Icon className={`w-4 h-4 ${card.accent}`} />
                  <span className="font-mono text-[9px] sm:text-[10px] uppercase tracking-wider">{card.label}</span>
                </div>
                <strong className="font-mono text-2xl sm:text-3xl font-light text-white">{card.value.toLocaleString('fr-FR')}</strong>
                <span className="text-[10px] sm:text-xs text-zinc-500">{card.sub}</span>
              </>
            );

            return card.filterValue ? (
              <button key={card.label} type="button" onClick={() => setSelectedStatusFilter(card.filterValue!)} aria-pressed={isActive} className={`min-h-28 p-3 border flex flex-col items-center justify-center gap-1.5 transition-colors ${isActive ? 'bg-zinc-900 border-luxury-gold' : 'bg-luxury-panel/30 border-luxury-gold/30 hover:border-luxury-gold/60'}`}>
                {content}
              </button>
            ) : (
              <div key={card.label} className="min-h-28 p-3 border border-luxury-gold/30 bg-luxury-panel/30 flex flex-col items-center justify-center gap-1.5">
                {content}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <section aria-labelledby="top-viewed-title" className="order-2 p-3 bg-luxury-panel/30 border border-luxury-gold/30 min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4 text-luxury-gold" />
              <h3 id="top-viewed-title" dir="ltr" className="font-mono text-[7px] sm:text-[8px] uppercase tracking-normal text-right text-white whitespace-nowrap">Produits les plus consultés</h3>
            </div>
            <div className="divide-y divide-luxury-border">
              {topViewedProducts.map((product, index) => (
                <button key={product.id} type="button" onClick={() => onProductClick(product)} className="w-full py-2 flex items-center justify-between gap-2 text-right">
                  <img src={product.images[0]?.url} alt="" className="w-8 h-9 object-cover border border-luxury-border shrink-0" />
                  <span className="font-mono text-[10px] text-luxury-gold whitespace-nowrap">{product.stats.views} vues</span>
                  <span className="font-mono text-xs text-white">{index + 1}</span>
                </button>
              ))}
            </div>
          </section>

          <section aria-labelledby="top-selling-title" className="order-1 p-3 bg-luxury-panel/30 border border-luxury-gold/30 min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <ShoppingBag className="w-4 h-4 text-luxury-gold" />
              <h3 id="top-selling-title" dir="ltr" className="font-mono text-[7px] sm:text-[8px] uppercase tracking-normal text-right text-white whitespace-nowrap">Produits les plus vendus</h3>
            </div>
            <div className="divide-y divide-luxury-border">
              {topSellingProducts.map(({ product, sales }, index) => (
                <button key={product.id} type="button" onClick={() => onProductClick(product)} className="w-full py-2 flex items-center justify-between gap-2 text-right">
                  <img src={product.images[0]?.url} alt="" className="w-8 h-9 object-cover border border-luxury-border shrink-0" />
                  <span className="font-mono text-[10px] text-luxury-gold whitespace-nowrap">{sales} vente{sales > 1 ? 's' : ''}</span>
                  <span className="font-mono text-xs text-white">{index + 1}</span>
                </button>
              ))}
              {topSellingProducts.length === 0 && (
                <p className="py-4 text-[9px] text-zinc-500 font-mono">Aucune vente livrée</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

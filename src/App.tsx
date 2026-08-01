import { useState, useEffect } from 'react';
import Splash from './components/Splash';
import Onboarding from './components/Onboarding';
import Login from './components/Login';
import Home from './components/Home';
import BoutiqueDetail from './components/BoutiqueDetail';
import ProductDetail from './components/ProductDetail';
import Search from './components/Search';
import Favorites from './components/Favorites';
import Dashboard from './components/Dashboard';
import AddProduct from './components/AddProduct';
import StylistChat from './components/StylistChat';
import AdminConsole from './components/AdminConsole';
import BoutiqueChatWindow from './components/BoutiqueChatWindow';
import BoutiqueChatThreads from './components/BoutiqueChatThreads';
import Messagerie from './components/Messagerie';
import { UserPreferences, UserRole, Boutique, Product } from './types';
import { mockBoutiques, mockProducts } from './mockData';
import { Home as HomeIcon, Search as SearchIcon, Heart, Sparkles, LayoutDashboard, UserCircle2, LogOut, ArrowRight, Store, Zap, ArrowLeft, Plus, MessageSquare, ShoppingBag } from 'lucide-react';
import { initFirebase } from './firebase';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [user, setUser] = useState<{ role: UserRole; email: string; uid?: string; displayName?: string; photoURL?: string } | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);

  // Initialize Firebase client on mount
  useEffect(() => {
    initFirebase().catch(err => {
      console.warn("Could not auto-initialize Firebase on boot:", err);
    });
  }, []);
  
  // Navigation / views
  const [currentView, setCurrentView] = useState<'home' | 'search' | 'favorites' | 'stylist' | 'dashboard' | 'profile' | 'admin' | 'messages'>('home');
  const [selectedBoutique, setSelectedBoutique] = useState<Boutique | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [messagerieTab, setMessagerieTab] = useState<'messages' | 'orders'>('messages');
  const [showQuickAddMenu, setShowQuickAddMenu] = useState(false);
  const [activeChat, setActiveChat] = useState<{ chatId: string; boutique: Boutique; client: any } | null>(null);

  // Favorites / Wishlist list
  const [favorites, setFavorites] = useState<string[]>([]);

  // Live database collections
  const [boutiques, setBoutiques] = useState<Boutique[]>(mockBoutiques);
  const [products, setProducts] = useState<Product[]>(mockProducts);

  // Fetch live products and boutiques from Firebase Firestore
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
        console.error("Error loading live data from Firestore in App.tsx:", error);
      }
    };
    fetchLiveData();
  }, []);

  // Real-time private chat unread count tracking
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      try {
        const isClient = user.role === UserRole.CLIENT;
        const userIdentifier = isClient ? user.uid || "" : "boutique_1";
        if (!userIdentifier) return;

        const url = isClient
          ? `/api/chats/threads/client/${userIdentifier}`
          : `/api/chats/threads/boutique/${userIdentifier}`;

        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          let count = 0;
          for (const thread of data) {
            const lastRead = localStorage.getItem(`last_read_${thread.chatId}`);
            const hasNew = !lastRead || new Date(thread.lastMessageTime).getTime() > new Date(lastRead).getTime();
            const isOtherSender = thread.senderRole !== (isClient ? "client" : "boutique");
            if (hasNew && isOtherSender) {
              count++;
            }
          }
          setUnreadCount(count);
        }
      } catch (error) {
        console.error("Error fetching unread thread count:", error);
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 4000); // Check every 4 seconds for immediate responsive notifications
    return () => clearInterval(interval);
  }, [user]);

  // Load from local storage on mount
  useEffect(() => {
    const savedFavs = localStorage.getItem('storehub_favorites');
    if (savedFavs) {
      try {
        setFavorites(JSON.parse(savedFavs));
      } catch (err) {
        console.error("Failed to load local favorites:", err);
      }
    }

    const savedPrefs = localStorage.getItem('storehub_preferences');
    if (savedPrefs) {
      try {
        setPreferences(JSON.parse(savedPrefs));
      } catch (err) {
        console.error("Failed to load local preferences:", err);
      }
    }

    const savedUser = localStorage.getItem('storehub_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        // Set default view based on role
        if (parsed.role === UserRole.ADMIN) {
          setCurrentView('admin');
        } else if (parsed.role === UserRole.BOUTIQUE) {
          setCurrentView('dashboard');
        } else {
          setCurrentView('home');
        }
      } catch (err) {
        console.error("Failed to load user profile:", err);
      }
    }
  }, []);

  const handleLogin = async (role: UserRole, email: string) => {
    let profile: any = { role, email };
    
    try {
      // 1. Fetch user profile from BaaS
      const response = await fetch(`/api/users/profile?email=${encodeURIComponent(email)}`);
      if (response.ok) {
        const liveProfile = await response.json();
        profile = { ...profile, ...liveProfile };
        console.log("Loaded existing user profile from Firestore:", profile);
      } else {
        // 2. If profile is not found, create a new profile in Firestore
        const defaultProfile = {
          uid: `user_${Date.now()}`,
          email,
          displayName: role === UserRole.ADMIN ? "Admin StoreHub" : email.split('@')[0],
          role,
          photoURL: role === UserRole.ADMIN
            ? "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80"
            : role === UserRole.BOUTIQUE 
              ? "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=200&q=80"
              : "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
          createdAt: new Date().toISOString()
        };
        const saveRes = await fetch('/api/users/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(defaultProfile)
        });
        if (saveRes.ok) {
          const result = await saveRes.json();
          profile = { ...profile, ...result.user };
          console.log("Created new user profile in Firestore:", profile);
        }
      }
    } catch (error) {
      console.error("Failed to sync user profile with Firebase BaaS, using fallback:", error);
    }

    setUser(profile);
    localStorage.setItem('storehub_user', JSON.stringify(profile));
    
    // Default view routing
    if (role === UserRole.ADMIN) {
      setCurrentView('admin');
    } else if (role === UserRole.BOUTIQUE) {
      setCurrentView('dashboard');
    } else {
      setCurrentView('home');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('storehub_user');
    setSelectedBoutique(null);
    setSelectedProduct(null);
    setIsAddingProduct(false);
  };

  const handleOnboardingComplete = (prefs: UserPreferences) => {
    setPreferences(prefs);
    localStorage.setItem('storehub_preferences', JSON.stringify(prefs));
  };

  const handleOnboardingSkip = () => {
    const defaultPrefs: UserPreferences = {
      styles: ['Minimaliste'],
      sizes: ['M'],
      favoriteCategories: ['robes', 'outerwear']
    };
    setPreferences(defaultPrefs);
    localStorage.setItem('storehub_preferences', JSON.stringify(defaultPrefs));
  };

  const toggleFavorite = (productId: string) => {
    setFavorites(prev => {
      const updated = prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId];
      localStorage.setItem('storehub_favorites', JSON.stringify(updated));
      return updated;
    });
  };

  const handleVisitBoutique = (boutiqueId: string) => {
    const found = boutiques.find(b => b.id === boutiqueId);
    if (found) {
      setSelectedBoutique(found);
      setSelectedProduct(null); // Clear product view overlay
    }
  };

  const handleAddProductSuccess = async (draft: Partial<Product>) => {
    const completedProduct: Product = {
      id: `new_prod_${Date.now()}`,
      boutiqueId: 'boutique_1',
      boutiqueName: boutiques[0]?.name || 'Atelier Noir',
      boutiqueLogo: boutiques[0]?.logo || mockBoutiques[0].logo,
      name: draft.name || 'Nouvelle Robe',
      description: draft.description || 'Description',
      price: draft.price || 150,
      currency: 'EUR',
      images: (draft.images as any) || [{ url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=600", width: 600, height: 800 }],
      category: draft.category || 'robes',
      styles: ['Minimaliste'],
      colors: draft.colors || ['Blanc'],
      sizes: draft.sizes || ['M'],
      materials: draft.materials || ['Soie'],
      tags: ['nouveau'],
      stats: { views: 12, favorites: 2, clicks: 5 },
      isAvailable: true,
      isFeatured: false,
      searchKeywords: [draft.name || ''],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(completedProduct)
      });
      if (response.ok) {
        console.log("Successfully saved product to Firestore database!");
      } else {
        console.error("Failed to save product to Firestore database API.");
      }
    } catch (err) {
      console.error("Network error while saving product to Firestore:", err);
    }

    // Update frontend products list instantly for seamless UX
    setProducts(prev => [completedProduct, ...prev]);
    setIsAddingProduct(false);
    setCurrentView('dashboard');
  };

  // Rendering flows inside the master layout
  const renderContent = () => {
    if (showSplash) {
      return <Splash onComplete={() => setShowSplash(false)} />;
    }

    if (!user) {
      return <Login onLogin={handleLogin} />;
    }

    // Client is missing style quiz -> onboarding style quiz trigger
    if (user.role === UserRole.CLIENT && !preferences) {
      return <Onboarding onComplete={handleOnboardingComplete} onSkip={handleOnboardingSkip} />;
    }

    if (activeChat) {
      return (
        <BoutiqueChatWindow
          chatId={activeChat.chatId}
          currentUser={user}
          boutique={activeChat.boutique}
          client={activeChat.client}
          onBack={() => setActiveChat(null)}
        />
      );
    }

    return (
      <div className="flex-grow w-full flex flex-col justify-between h-full relative">

        {/* Dynamic Main Body Content Router */}
        <main className="flex-grow w-full overflow-y-auto overflow-x-hidden pb-24">
          {selectedProduct ? (
            <ProductDetail
              product={selectedProduct}
              onBack={() => setSelectedProduct(null)}
              onVisitBoutique={handleVisitBoutique}
              onProductClick={(p) => setSelectedProduct(p)}
              favorites={favorites}
              toggleFavorite={toggleFavorite}
            />
          ) : selectedBoutique ? (
            <BoutiqueDetail
              boutique={selectedBoutique}
              onBack={() => setSelectedBoutique(null)}
              onProductClick={(p) => setSelectedProduct(p)}
              favorites={favorites}
              toggleFavorite={toggleFavorite}
              onContactClick={() => {
                if (user) {
                  const clientId = user.uid || `user_${Date.now()}`;
                  const clientName = user.displayName || user.email.split('@')[0];
                  const clientPhoto = user.photoURL || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80";
                  setActiveChat({
                    chatId: `${clientId}_${selectedBoutique.id}`,
                    boutique: selectedBoutique,
                    client: {
                      uid: clientId,
                      displayName: clientName,
                      photoURL: clientPhoto,
                      email: user.email
                    }
                  });
                }
              }}
            />
          ) : isAddingProduct ? (
            <AddProduct
              onBack={() => setIsAddingProduct(false)}
              onSuccess={handleAddProductSuccess}
            />
          ) : (
            <>
              {/* Standard views based on active nav selection */}
              {currentView === 'home' && (
                <Home
                  preferences={preferences}
                  onBoutiqueClick={(b) => setSelectedBoutique(b)}
                  onProductClick={(p) => setSelectedProduct(p)}
                  favorites={favorites}
                  toggleFavorite={toggleFavorite}
                  onNavigateToStylist={() => setCurrentView('stylist')}
                  onLogout={handleLogout}
                  onMessagesClick={() => setCurrentView('messages')}
                  hasUnreadMessages={unreadCount > 0}
                />
              )}

              {currentView === 'search' && (
                <Search
                  onProductClick={(p) => setSelectedProduct(p)}
                  favorites={favorites}
                  toggleFavorite={toggleFavorite}
                />
              )}

              {currentView === 'favorites' && (
                <Favorites
                  favorites={favorites}
                  toggleFavorite={toggleFavorite}
                  onProductClick={(p) => setSelectedProduct(p)}
                />
              )}

              {currentView === 'stylist' && (
                <StylistChat
                  preferences={preferences}
                  onProductClick={(p) => setSelectedProduct(p)}
                />
              )}

              {currentView === 'messages' && (
                <Messagerie
                  key={`messagerie_${messagerieTab}`}
                  currentUser={user}
                  boutiques={boutiques}
                  initialTab={messagerieTab}
                  onSelectThread={(chatId, boutique, client) => {
                    setActiveChat({ chatId, boutique, client });
                  }}
                  onBack={() => {
                    setCurrentView(user.role === UserRole.CLIENT ? 'home' : 'dashboard');
                  }}
                />
              )}

              {currentView === 'dashboard' && (
                <Dashboard
                  onAddProductClick={() => setIsAddingProduct(true)}
                  onEditProductClick={(p) => setSelectedProduct(p)}
                  onProductClick={(p) => setSelectedProduct(p)}
                />
              )}

              {currentView === 'profile' && (
                <div className="max-w-md mx-auto px-6 mt-16 text-center space-y-8 animate-fadeIn pb-24">
                  
                  {/* Profile card header */}
                  <div className="space-y-4">
                    <div className="w-20 h-20 bg-luxury-card border border-luxury-gold/30 rounded-full flex items-center justify-center mx-auto shadow-lg relative">
                      <UserCircle2 className="w-12 h-12 text-luxury-gold" />
                    </div>
                    <div>
                      <h2 className="serif-title text-2xl font-light text-white tracking-wide">
                        {user.role === UserRole.CLIENT ? 'Marie Laurent' : 'Atelier Noir Owner'}
                      </h2>
                      <p className="font-mono text-[9px] uppercase tracking-widest text-zinc-500 mt-0.5">{user.email}</p>
                    </div>
                  </div>

                  {/* Real-time Customer-Boutique Chat Threads list */}
                  <div className="text-left">
                    <BoutiqueChatThreads
                      currentUser={user}
                      boutiques={boutiques}
                      onSelectThread={(chatId, boutique, client) => {
                        setActiveChat({ chatId, boutique, client });
                      }}
                    />
                  </div>

                  {/* Role switching shortcut for testing/showcasing both roles */}
                  <div className="p-6 bg-luxury-panel/80 border border-luxury-border rounded-lg text-left space-y-4">
                    <div className="flex items-center gap-2 text-luxury-gold">
                      <Store className="w-4 h-4" />
                      <h3 className="font-mono text-xs uppercase tracking-widest font-semibold">Mode Démonstration</h3>
                    </div>
                    <p className="text-zinc-400 text-xs font-light leading-relaxed">
                      StoreHub vous permet de basculer instantanément de rôle pour tester et explorer la console de création boutique (dashboard) ou le vestiaire client.
                    </p>
                    
                    <button
                      onClick={() => {
                        const nextRole = user.role === UserRole.CLIENT ? UserRole.BOUTIQUE : UserRole.CLIENT;
                        handleLogin(nextRole, `${nextRole.toLowerCase()}@storehub.com`);
                      }}
                      className="w-full py-2.5 bg-luxury-card border border-luxury-border text-zinc-300 hover:text-white hover:border-luxury-gold/20 rounded text-xs font-mono uppercase tracking-widest font-medium transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Basculez vers l'espace {user.role === UserRole.CLIENT ? 'Boutique' : 'Client'}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-luxury-gold" />
                    </button>
                  </div>

                  {/* Disconnect action */}
                  <button
                    onClick={handleLogout}
                    className="w-full py-3.5 bg-red-950/10 border border-red-900/30 hover:bg-red-950/20 text-red-400 hover:text-red-300 rounded text-xs tracking-widest uppercase font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Se Déconnecter de StoreHub</span>
                  </button>

                </div>
              )}

              {currentView === 'admin' && (
                <AdminConsole onLogout={handleLogout} />
              )}
            </>
          )}
        </main>

        {/* 5. Responsive / Premium Floating Bottom Navigation Bar */}
        {user && user.role !== UserRole.ADMIN && (
          <nav className="absolute bottom-0 inset-x-0 bg-luxury-dark/95 backdrop-blur-md border-t border-luxury-border px-4 py-2.5 z-20 flex justify-around items-center">
            {user.role === UserRole.CLIENT ? (
              <>
                {/* Feed / Home */}
                <button
                  onClick={() => { setCurrentView('home'); setSelectedBoutique(null); setSelectedProduct(null); }}
                  className={`flex flex-col items-center gap-1 py-1 px-3.5 rounded transition-all duration-300 cursor-pointer ${
                    currentView === 'home' && !selectedBoutique && !selectedProduct ? 'text-luxury-gold font-semibold' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <HomeIcon className="w-5 h-5" />
                  <span className="text-[9px] uppercase tracking-wider font-sans">Découvrir</span>
                </button>

                {/* Classic Search + Visual Search */}
                <button
                  onClick={() => { setCurrentView('search'); setSelectedBoutique(null); setSelectedProduct(null); }}
                  className={`flex flex-col items-center gap-1 py-1 px-3.5 rounded transition-all duration-300 cursor-pointer ${
                    currentView === 'search' ? 'text-luxury-gold font-semibold' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <SearchIcon className="w-5 h-5" />
                  <span className="text-[9px] uppercase tracking-wider font-sans">Explorer</span>
                </button>

                {/* Stylist chat with glowing pulse icon */}
                <button
                  onClick={() => { setCurrentView('stylist'); setSelectedBoutique(null); setSelectedProduct(null); }}
                  className={`flex flex-col items-center gap-1 py-1 px-3.5 rounded transition-all duration-300 relative cursor-pointer ${
                    currentView === 'stylist' ? 'text-luxury-gold font-semibold' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Sparkles className={`w-5 h-5 ${currentView === 'stylist' ? 'text-luxury-gold' : 'text-luxury-gold/80 animate-pulse'}`} />
                  <span className="text-[9px] uppercase tracking-wider font-sans">Styliste IA</span>
                </button>

                {/* Favorites Wishlist */}
                <button
                  onClick={() => { setCurrentView('favorites'); setSelectedBoutique(null); setSelectedProduct(null); }}
                  className={`flex flex-col items-center gap-1 py-1 px-3.5 rounded transition-all duration-300 cursor-pointer ${
                    currentView === 'favorites' ? 'text-luxury-gold font-semibold' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Heart className="w-5 h-5" />
                  <span className="text-[9px] uppercase tracking-wider font-sans">Coups de Cœur</span>
                </button>

                {/* Profile menu icon */}
                <button
                  onClick={() => { setCurrentView('profile'); setSelectedBoutique(null); setSelectedProduct(null); }}
                  className={`flex flex-col items-center gap-1 py-1 px-3.5 rounded transition-all duration-300 cursor-pointer ${
                    currentView === 'profile' ? 'text-luxury-gold font-semibold' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <UserCircle2 className="w-5 h-5" />
                  <span className="text-[9px] uppercase tracking-wider font-sans">Compte</span>
                </button>
              </>
            ) : (
              <div className="w-full grid grid-cols-3 items-center text-center py-1">
                
                {/* Icon 1: Console */}
                <button
                  onClick={() => {
                    setCurrentView('dashboard');
                    setSelectedBoutique(null);
                    setSelectedProduct(null);
                    setIsAddingProduct(false);
                    setShowQuickAddMenu(false);
                  }}
                  className={`flex flex-col items-center gap-1 py-1 bg-transparent transition-all duration-300 cursor-pointer ${
                    currentView === 'dashboard' && !isAddingProduct ? 'text-luxury-gold font-semibold' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <LayoutDashboard className="w-5 h-5" />
                  <span className="text-[9px] uppercase tracking-wider font-sans font-medium">Console</span>
                </button>

                {/* Icon 2: Messages with + button floating directly above it */}
                <div className="relative flex flex-col items-center justify-center">
                  
                  {/* Floating "+" Button positioned nicely right above Messages button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowQuickAddMenu(!showQuickAddMenu);
                    }}
                    className={`absolute -top-10 left-1/2 -translate-x-1/2 w-11 h-11 rounded-full flex items-center justify-center bg-luxury-gold text-black hover:bg-white hover:scale-105 active:scale-95 shadow-xl shadow-luxury-gold/50 transition-all duration-300 cursor-pointer border-2 border-luxury-dark z-30 ${
                      showQuickAddMenu || isAddingProduct ? 'ring-2 ring-white ring-offset-2 ring-offset-luxury-dark' : ''
                    }`}
                    title="Actions rapides (+)"
                  >
                    <Plus className={`w-5 h-5 text-black stroke-[3] transition-transform duration-300 ${showQuickAddMenu ? 'rotate-45' : ''}`} />
                  </button>

                  {/* Quick Actions Floating Popover Menu above + button */}
                  {showQuickAddMenu && (
                    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-60 bg-luxury-dark/95 border border-luxury-gold/50 shadow-2xl p-2 z-40 space-y-1.5 backdrop-blur-lg animate-fadeIn">
                      <button
                        onClick={() => {
                          setCurrentView('dashboard');
                          setSelectedBoutique(null);
                          setSelectedProduct(null);
                          setIsAddingProduct(true);
                          setShowQuickAddMenu(false);
                        }}
                        className="w-full text-left px-3 py-2.5 bg-luxury-panel/60 hover:bg-luxury-gold/20 hover:border-luxury-gold border border-luxury-border text-xs text-white flex items-center gap-2.5 transition-all cursor-pointer"
                      >
                        <div className="w-7 h-7 rounded-full bg-luxury-gold text-black flex items-center justify-center shrink-0">
                          <Plus className="w-4 h-4 stroke-[3]" />
                        </div>
                        <div>
                          <p className="font-semibold text-luxury-gold text-xs">Ajouter une création</p>
                          <p className="text-[9px] text-zinc-400 font-mono">Pièce au catalogue boutique</p>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setCurrentView('messages');
                          setMessagerieTab('orders');
                          setSelectedBoutique(null);
                          setSelectedProduct(null);
                          setIsAddingProduct(false);
                          setShowQuickAddMenu(false);
                        }}
                        className="w-full text-left px-3 py-2.5 bg-luxury-panel/60 hover:bg-luxury-gold/20 hover:border-luxury-gold border border-luxury-border text-xs text-white flex items-center gap-2.5 transition-all cursor-pointer"
                      >
                        <div className="w-7 h-7 rounded-full bg-emerald-500 text-black flex items-center justify-center shrink-0">
                          <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
                        </div>
                        <div>
                          <p className="font-semibold text-emerald-400 text-xs">Commande manuelle</p>
                          <p className="text-[9px] text-zinc-400 font-mono">Nom client & date livraison</p>
                        </div>
                      </button>
                    </div>
                  )}

                  {/* Messages Button */}
                  <button
                    onClick={() => {
                      setCurrentView('messages');
                      setMessagerieTab('messages');
                      setSelectedBoutique(null);
                      setSelectedProduct(null);
                      setIsAddingProduct(false);
                      setShowQuickAddMenu(false);
                    }}
                    className={`flex flex-col items-center gap-1 py-1 bg-transparent transition-all duration-300 relative cursor-pointer ${
                      currentView === 'messages' ? 'text-luxury-gold font-semibold' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <MessageSquare className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-0 right-2 min-w-[14px] h-[14px] rounded-full bg-emerald-500 text-[8px] font-mono font-bold text-black flex items-center justify-center border border-black animate-pulse">
                        {unreadCount}
                      </span>
                    )}
                    <span className="text-[9px] uppercase tracking-wider font-sans font-medium">Messages</span>
                  </button>
                </div>

                {/* Icon 3: Compte */}
                <button
                  onClick={() => {
                    setCurrentView('profile');
                    setSelectedBoutique(null);
                    setSelectedProduct(null);
                    setIsAddingProduct(false);
                    setShowQuickAddMenu(false);
                  }}
                  className={`flex flex-col items-center gap-1 py-1 bg-transparent transition-all duration-300 cursor-pointer ${
                    currentView === 'profile' ? 'text-luxury-gold font-semibold' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <UserCircle2 className="w-5 h-5" />
                  <span className="text-[9px] uppercase tracking-wider font-sans">Compte</span>
                </button>

              </div>
            )}
          </nav>
        )}
      </div>
    );
  };

  return (
    <div className="md:min-h-screen md:bg-[#070707] md:flex md:items-center md:justify-center md:py-8 font-sans antialiased overflow-hidden select-none">
      
      {/* Centered iPhone 17 Pro Max Device Container */}
      <div className="relative w-full h-screen md:h-[92vh] md:max-h-[956px] md:min-h-[800px] md:aspect-[440/956] md:max-w-[440px] md:rounded-[55px] md:border-[11px] md:border-[#C5A850] md:bg-[#0A0A0A] md:shadow-[0_0_80px_rgba(197,168,80,0.12),0_30px_70px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden">
        
        {/* Dynamic Island (iPhone 17 Pro Max Style) */}
        <div className="hidden md:flex absolute top-3.5 left-1/2 -translate-x-1/2 w-[110px] h-[28px] bg-[#0c0c0c] border border-zinc-800/40 rounded-full z-[100] items-center justify-between px-3.5 shadow-inner">
          <div className="w-2.5 h-2.5 bg-[#1a2238] rounded-full border border-blue-900/40 flex items-center justify-center">
            <div className="w-1 h-1 bg-blue-400/30 rounded-full animate-pulse" />
          </div>
          <div className="w-1.5 h-1.5 bg-zinc-900 rounded-full" />
        </div>

        {/* Home Swipe Indicator (iPhone 17 Pro Max Style) */}
        <div className="hidden md:block absolute bottom-2.5 left-1/2 -translate-x-1/2 w-[135px] h-[4.5px] bg-[#C5A850]/40 rounded-full z-[100] hover:bg-[#C5A850]/80 transition-all duration-300 shadow-sm" />

        {/* Viewport Inside Container: This is where our full app runs */}
        <div className="relative w-full h-full flex flex-col overflow-hidden bg-[#0A0A0A] md:rounded-[44px]">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
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
import ClientReservations from './components/ClientReservations';
import ClientAccount from './components/ClientAccount';
import Messagerie from './components/Messagerie';
import BoutiquesList from './components/BoutiquesList';
import QAAuditModal from './components/QAAuditModal';
import BoutiqueAccountSettings, { BoutiqueSettingsInput } from './components/BoutiqueAccountSettings';
import { UserPreferences, UserRole, Boutique, Product, ManualOrder } from './types';
import { Home as HomeIcon, Search as SearchIcon, Heart, Sparkles, LayoutDashboard, UserCircle2, LogOut, Store, Zap, ArrowLeft, MessageSquare, FileCheck, BellRing, X } from 'lucide-react';
import { initFirebase, uploadBoutiqueCover, uploadBoutiqueLogo, uploadClientAvatar, uploadProductImages } from './firebase';
import { onAuthStateChanged, sendPasswordResetEmail, signOut } from 'firebase/auth';
import { ensureRequiredClothingSizes } from './utils/productSizes';
import { getStableChatUserId, getUserBoutique } from './utils/chatIdentity';
import { FirebaseAuthRequiredError, firebaseAuthenticatedFetch } from './utils/firebaseAuthenticatedFetch';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [user, setUser] = useState<{ role: UserRole; email: string; uid?: string; boutiqueId?: string; displayName?: string; photoURL?: string; city?: string; favoriteProductIds?: string[] } | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [showQAModal, setShowQAModal] = useState(false);
  const scrollIndicatorRef = useRef<HTMLDivElement>(null);
  const scrollIndicatorHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // One reliable scroll indicator for every page and nested scrolling area.
  useEffect(() => {
    let animationFrame: number | null = null;
    let latestScrollElement: HTMLElement | null = null;

    const findScrollableElement = (target: EventTarget | null) => {
      let element = target instanceof HTMLElement ? target : null;

      while (element) {
        const overflowY = window.getComputedStyle(element).overflowY;
        if (
          (overflowY === 'auto' || overflowY === 'scroll') &&
          element.scrollHeight > element.clientHeight + 1
        ) {
          return element;
        }
        element = element.parentElement;
      }

      const documentScroller = document.scrollingElement instanceof HTMLElement
        ? document.scrollingElement
        : document.documentElement;
      return documentScroller.scrollHeight > documentScroller.clientHeight + 1
        ? documentScroller
        : null;
    };

    const renderScrollIndicator = () => {
      animationFrame = null;
      const indicator = scrollIndicatorRef.current;
      const scrollElement = latestScrollElement;
      if (!indicator || !scrollElement) return;

      const maximumScroll = scrollElement.scrollHeight - scrollElement.clientHeight;
      if (maximumScroll <= 1) {
        indicator.classList.remove('is-visible');
        return;
      }

      const hostHeight = indicator.parentElement?.clientHeight ?? window.innerHeight;
      const topInset = 14;
      const bottomInset = 18;
      const proportionalHeight = hostHeight * (scrollElement.clientHeight / scrollElement.scrollHeight);
      const indicatorHeight = Math.min(hostHeight * 0.38, Math.max(68, proportionalHeight));
      const availableTravel = Math.max(0, hostHeight - topInset - bottomInset - indicatorHeight);
      const progress = Math.min(1, Math.max(0, scrollElement.scrollTop / maximumScroll));

      indicator.style.height = `${indicatorHeight}px`;
      indicator.style.transform = `translate3d(0, ${topInset + progress * availableTravel}px, 0)`;
      indicator.classList.add('is-visible');

      if (scrollIndicatorHideTimerRef.current) {
        clearTimeout(scrollIndicatorHideTimerRef.current);
      }
      scrollIndicatorHideTimerRef.current = setTimeout(() => {
        indicator.classList.remove('is-visible');
        scrollIndicatorHideTimerRef.current = null;
      }, 480);
    };

    const scheduleScrollIndicator = (scrollElement: HTMLElement | null) => {
      if (!scrollElement) return;
      latestScrollElement = scrollElement;
      if (animationFrame === null) {
        animationFrame = window.requestAnimationFrame(renderScrollIndicator);
      }
    };

    const handleScrollActivity = (event: Event) => {
      const scrollElement = event.target === document
        ? document.scrollingElement instanceof HTMLElement
          ? document.scrollingElement
          : document.documentElement
        : event.target instanceof HTMLElement
          ? event.target
          : null;

      scheduleScrollIndicator(scrollElement);
    };

    const handleScrollIntent = (event: Event) => {
      scheduleScrollIndicator(findScrollableElement(event.target));
    };

    const handleScrollKey = (event: KeyboardEvent) => {
      if (!['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) return;
      scheduleScrollIndicator(findScrollableElement(event.target));
    };

    document.addEventListener('scroll', handleScrollActivity, true);
    document.addEventListener('wheel', handleScrollIntent, { capture: true, passive: true });
    document.addEventListener('touchmove', handleScrollIntent, { capture: true, passive: true });
    document.addEventListener('keydown', handleScrollKey, true);
    return () => {
      document.removeEventListener('scroll', handleScrollActivity, true);
      document.removeEventListener('wheel', handleScrollIntent, true);
      document.removeEventListener('touchmove', handleScrollIntent, true);
      document.removeEventListener('keydown', handleScrollKey, true);
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
      if (scrollIndicatorHideTimerRef.current) clearTimeout(scrollIndicatorHideTimerRef.current);
      scrollIndicatorHideTimerRef.current = null;
      scrollIndicatorRef.current?.classList.remove('is-visible');
    };
  }, []);
  
  // Navigation / views
  const [currentView, setCurrentView] = useState<'home' | 'search' | 'favorites' | 'stylist' | 'dashboard' | 'profile' | 'reservations' | 'admin' | 'messages' | 'boutiques'>('home');
  const [selectedBoutique, setSelectedBoutique] = useState<Boutique | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [messagerieTab, setMessagerieTab] = useState<'messages' | 'orders'>('messages');
  const [showQuickAddMenu, setShowQuickAddMenu] = useState(false);
  const [activeChat, setActiveChat] = useState<{ chatId: string; boutique: Boutique; client: any } | null>(null);
  const [orderNotification, setOrderNotification] = useState<{ order: ManualOrder; count: number } | null>(null);
  const quickAddMenuRef = useRef<HTMLDivElement>(null);
  const orderMonitorRef = useRef<{ boutiqueId: string; latestCreatedAt: number } | null>(null);

  const openOrders = () => {
    setCurrentView('messages');
    setMessagerieTab('orders');
    setSelectedBoutique(null);
    setSelectedProduct(null);
    setIsAddingProduct(false);
    setShowQuickAddMenu(false);
    setOrderNotification(null);
  };

  useEffect(() => {
    if (!showQuickAddMenu) return;

    const closeQuickAddMenuOnOutsideClick = (event: MouseEvent) => {
      if (quickAddMenuRef.current && !quickAddMenuRef.current.contains(event.target as Node)) {
        setShowQuickAddMenu(false);
      }
    };

    document.addEventListener('click', closeQuickAddMenuOnOutsideClick);
    return () => document.removeEventListener('click', closeQuickAddMenuOnOutsideClick);
  }, [showQuickAddMenu]);

  // Favorites / Wishlist list
  const [favorites, setFavorites] = useState<string[]>([]);

  // Live database collections
  const [boutiques, setBoutiques] = useState<Boutique[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [followedBoutiqueIds, setFollowedBoutiqueIds] = useState<string[]>([]);
  const [followedBoutiquesLoading, setFollowedBoutiquesLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!user || user.role !== UserRole.CLIENT) {
      setFollowedBoutiqueIds([]);
      setFollowedBoutiquesLoading(false);
      return;
    }

    const loadFollowedBoutiques = async () => {
      setFollowedBoutiquesLoading(true);
      try {
        const response = await firebaseAuthenticatedFetch('/api/users/followed-boutiques');
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || 'Impossible de charger vos boutiques suivies.');
        if (!cancelled) {
          setFollowedBoutiqueIds(Array.isArray(payload?.followedBoutiqueIds) ? payload.followedBoutiqueIds : []);
        }
      } catch (error) {
        if (!cancelled) {
          setFollowedBoutiqueIds([]);
          console.error('Error loading followed boutiques:', error);
        }
      } finally {
        if (!cancelled) setFollowedBoutiquesLoading(false);
      }
    };

    void loadFollowedBoutiques();
    return () => {
      cancelled = true;
    };
  }, [user]);

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
          setBoutiques(Array.isArray(liveBoutiques) ? liveBoutiques : []);
        }
        if (resP.ok) {
          const liveProducts = await resP.json();
          setProducts(Array.isArray(liveProducts) ? liveProducts : []);
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
        const activeBoutique = getUserBoutique(user, boutiques);
        const userIdentifier = isClient
          ? getStableChatUserId(user)
          : activeBoutique?.id || "";
        if (!userIdentifier) return;

        const url = isClient
          ? `/api/chats/threads/client/${encodeURIComponent(userIdentifier)}`
          : `/api/chats/threads/boutique/${encodeURIComponent(userIdentifier)}?ownerId=${encodeURIComponent(activeBoutique?.ownerId || "")}`;

        const response = await firebaseAuthenticatedFetch(url);
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
        if (error instanceof FirebaseAuthRequiredError) {
          setUnreadCount(0);
          return;
        }
        console.error("Error fetching unread thread count:", error);
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 4000); // Check every 4 seconds for immediate responsive notifications
    return () => clearInterval(interval);
  }, [user, boutiques]);

  // Notify the seller when a new real order appears in the boutique database.
  useEffect(() => {
    if (!user || user.role !== UserRole.BOUTIQUE || !user.uid) {
      orderMonitorRef.current = null;
      setOrderNotification(null);
      return;
    }

    const activeBoutique = getUserBoutique(user, boutiques);
    if (!activeBoutique) return;
    let cancelled = false;

    const checkForNewOrders = async () => {
      try {
        const response = await firebaseAuthenticatedFetch(`/api/orders?boutiqueId=${encodeURIComponent(activeBoutique.id)}`);
        if (!response.ok) return;
        const liveOrders: ManualOrder[] = await response.json();
        if (cancelled) return;

        const storageKey = `storehub_last_order_alert_${activeBoutique.id}`;
        const newestTimestamp = liveOrders.reduce((latest, order) => (
          Math.max(latest, new Date(order.createdAt).getTime() || 0)
        ), 0);

        if (orderMonitorRef.current?.boutiqueId !== activeBoutique.id) {
          const savedTimestamp = Number(localStorage.getItem(storageKey) || 0);
          const initialTimestamp = savedTimestamp || newestTimestamp;
          orderMonitorRef.current = { boutiqueId: activeBoutique.id, latestCreatedAt: initialTimestamp };
          if (!savedTimestamp && newestTimestamp) localStorage.setItem(storageKey, String(newestTimestamp));
          return;
        }

        const previousTimestamp = orderMonitorRef.current.latestCreatedAt;
        const newOrders = liveOrders
          .filter((order) => (new Date(order.createdAt).getTime() || 0) > previousTimestamp)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        if (newOrders.length > 0) {
          const latestTimestamp = Math.max(previousTimestamp, newestTimestamp);
          orderMonitorRef.current.latestCreatedAt = latestTimestamp;
          localStorage.setItem(storageKey, String(latestTimestamp));
          setOrderNotification({ order: newOrders[0], count: newOrders.length });
        }
      } catch (error) {
        console.error('Error checking for new boutique orders:', error);
      }
    };

    checkForNewOrders();
    const interval = window.setInterval(checkForNewOrders, 8_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [user, boutiques]);

  useEffect(() => {
    if (!orderNotification) return;
    const timeout = window.setTimeout(() => setOrderNotification(null), 8_000);
    return () => window.clearTimeout(timeout);
  }, [orderNotification]);

  // Load local preferences immediately, but restore a user only when the
  // persisted identity matches the active Firebase session.
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

    let unsubscribe = () => undefined;
    let cancelled = false;

    void initFirebase()
      .then(({ auth }) => {
        unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          const savedUser = localStorage.getItem('storehub_user');
          if (cancelled) return;

          if (!firebaseUser || !savedUser) {
            setUser(null);
            localStorage.removeItem('storehub_user');
            return;
          }

          try {
            const parsed = JSON.parse(savedUser);
            if (!parsed?.uid || parsed.uid !== firebaseUser.uid) {
              setUser(null);
              localStorage.removeItem('storehub_user');
              return;
            }

            const response = await firebaseAuthenticatedFetch('/api/users/profile');
            if (!response.ok) throw new Error('Stored Firebase profile could not be verified');
            const liveProfile = await response.json();
            const liveStatus = liveProfile.accountStatus || 'approved';
            if (liveProfile.role !== UserRole.ADMIN && liveStatus !== 'approved') {
              await signOut(auth);
              setUser(null);
              localStorage.removeItem('storehub_user');
              return;
            }
            const verifiedProfile = {
              ...parsed,
              ...liveProfile,
              uid: firebaseUser.uid,
              email: firebaseUser.email || liveProfile.email || parsed.email,
            };

            setUser(verifiedProfile);
            setFavorites(Array.isArray(verifiedProfile.favoriteProductIds) ? verifiedProfile.favoriteProductIds : []);
            localStorage.setItem('storehub_user', JSON.stringify(verifiedProfile));
            if (verifiedProfile.role === UserRole.ADMIN) {
              setCurrentView('admin');
            } else if (verifiedProfile.role === UserRole.BOUTIQUE) {
              setCurrentView('dashboard');
            } else {
              setCurrentView('home');
            }
          } catch (err) {
            console.error('Failed to verify stored Firebase profile:', err);
            setUser(null);
            localStorage.removeItem('storehub_user');
          }
        });
      })
      .catch((err) => {
        console.warn('Could not initialize Firebase session:', err);
        setUser(null);
        localStorage.removeItem('storehub_user');
      });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const handleLogin = async (role: UserRole, email: string, extraProfile?: { displayName?: string; photoURL?: string; uid?: string }) => {
    if (!extraProfile?.uid) {
      console.error('Firebase authentication is required before entering the application.');
      return;
    }
    let profile: any = { role, email };
    if (extraProfile?.displayName) profile.displayName = extraProfile.displayName;
    if (extraProfile?.photoURL) profile.photoURL = extraProfile.photoURL;
    if (extraProfile?.uid) profile.uid = extraProfile.uid;
    
    try {
      // 1. Fetch user profile from BaaS
      const response = await firebaseAuthenticatedFetch('/api/users/profile');
      if (response.ok) {
        const liveProfile = await response.json();
        profile = { ...profile, ...liveProfile };
        // The authenticated Firebase uid is authoritative. It must not be
        // replaced by an old demo/profile identifier stored in Firestore.
        if (extraProfile?.uid) profile.uid = extraProfile.uid;
        if (extraProfile?.photoURL && !profile.photoURL) {
          profile.photoURL = extraProfile.photoURL;
        }
        if (extraProfile?.displayName && (!profile.displayName || profile.displayName === email.split('@')[0])) {
          profile.displayName = extraProfile.displayName;
        }
        console.log("Loaded existing user profile from Firestore:", profile);
      } else if (response.status === 404) {
        // 2. If profile is not found, create a new profile in Firestore
        const defaultProfile = {
          uid: extraProfile?.uid || `user_${Date.now()}`,
          email,
          displayName: extraProfile?.displayName || (role === UserRole.ADMIN ? "Admin StoreHub" : email.split('@')[0]),
          role,
          photoURL: extraProfile?.photoURL || (role === UserRole.ADMIN
            ? "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80"
            : role === UserRole.BOUTIQUE 
              ? "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=200&q=80"
              : "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80"),
          createdAt: new Date().toISOString()
        };
        const saveRes = await firebaseAuthenticatedFetch('/api/users/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(defaultProfile)
        });
        if (saveRes.ok) {
          const result = await saveRes.json();
          profile = { ...profile, ...result.user };
          console.log("Created new user profile in Firestore:", profile);
        } else {
          const payload = await saveRes.json().catch(() => null);
          throw new Error(payload?.error || 'Le profil StoreHub n’a pas pu être créé.');
        }
      } else {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Le profil StoreHub n’a pas pu être vérifié.');
      }
    } catch (error) {
      console.error("Failed to verify the Firebase profile:", error);
      throw error;
    }

    const accountStatus = profile.accountStatus || 'approved';
    if (profile.role !== UserRole.ADMIN && accountStatus !== 'approved') {
      const message = accountStatus === 'pending'
        ? "Votre compte est en attente de confirmation par l’administration."
        : accountStatus === 'rejected'
          ? `Votre demande d’ouverture a été refusée${profile.approvalRejectionReason ? ` : ${profile.approvalRejectionReason}` : '.'}`
          : "Votre compte est suspendu. Contactez l’administration.";
      try {
        const { auth } = await initFirebase();
        await signOut(auth);
      } finally {
        setUser(null);
        localStorage.removeItem('storehub_user');
      }
      throw Object.assign(new Error(message), { code: `account/${accountStatus}` });
    }

    setUser(profile);
    setFavorites(Array.isArray(profile.favoriteProductIds) ? profile.favoriteProductIds : []);
    localStorage.setItem('storehub_user', JSON.stringify(profile));

    // The role stored in the verified Firebase profile is authoritative.
    if (profile.role === UserRole.ADMIN) {
      setCurrentView('admin');
    } else if (profile.role === UserRole.BOUTIQUE) {
      setCurrentView('dashboard');
    } else {
      setCurrentView('home');
    }
  };

  const handleLogout = async () => {
    try {
      const { auth } = await initFirebase();
      await signOut(auth);
    } catch (error) {
      console.error('Firebase logout failed:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('storehub_user');
      setSelectedBoutique(null);
      setSelectedProduct(null);
      setIsAddingProduct(false);
      setEditingProduct(null);
    }
  };

  const handleOnboardingComplete = (prefs: UserPreferences) => {
    setPreferences(prefs);
    localStorage.setItem('storehub_preferences', JSON.stringify(prefs));
    if (user?.role === UserRole.CLIENT) {
      void firebaseAuthenticatedFetch('/api/users/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: prefs }),
      }).catch((error) => console.error('Error saving client preferences:', error));
    }
  };

  const handleOnboardingSkip = () => {
    const defaultPrefs: UserPreferences = {
      audiences: ['Femme', 'Homme', 'Enfants'],
      styles: ['Minimaliste'],
      sizes: ['M'],
      favoriteCategories: ['robes', 'outerwear']
    };
    setPreferences(defaultPrefs);
    localStorage.setItem('storehub_preferences', JSON.stringify(defaultPrefs));
  };

  const toggleFavorite = (productId: string) => {
    const updated = favorites.includes(productId)
      ? favorites.filter(id => id !== productId)
      : [...favorites, productId];
    setFavorites(updated);
    localStorage.setItem('storehub_favorites', JSON.stringify(updated));

    if (user?.role === UserRole.CLIENT) {
      void firebaseAuthenticatedFetch('/api/users/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favoriteProductIds: updated }),
      }).then(async (response) => {
        if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || 'Favorites could not be saved');
        setUser((currentUser) => currentUser ? { ...currentUser, favoriteProductIds: updated } : currentUser);
      }).catch((error) => console.error('Error saving favorites:', error));
    }
  };

  useEffect(() => {
    if (products.length === 0) return;
    const sharedWishlist = new URLSearchParams(window.location.search).get('wishlist');
    if (!sharedWishlist) return;
    const validIds = Array.from(new Set(
      sharedWishlist.split(',').map((id) => id.trim()).filter((id) => products.some((product) => product.id === id)),
    ));
    if (validIds.length === 0) return;
    setFavorites(validIds);
    localStorage.setItem('storehub_favorites', JSON.stringify(validIds));
  }, [products]);

  const handleBoutiqueFollowChange = async (boutiqueId: string, following: boolean) => {
    if (!user || user.role !== UserRole.CLIENT) {
      throw new Error('Connectez-vous avec un compte client pour suivre cette boutique.');
    }

    const response = await firebaseAuthenticatedFetch(`/api/users/followed-boutiques/${encodeURIComponent(boutiqueId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ following }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || 'Impossible de modifier cet abonnement.');
    setFollowedBoutiqueIds(Array.isArray(payload?.followedBoutiqueIds) ? payload.followedBoutiqueIds : []);
  };

  const handleClientProfileSave = async (profile: { displayName: string; city: string }) => {
    const response = await firebaseAuthenticatedFetch('/api/users/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || 'Impossible d’enregistrer votre profil.');

    const updatedUser = { ...user, ...payload.user };
    setUser(updatedUser);
    localStorage.setItem('storehub_user', JSON.stringify(updatedUser));
  };

  const handleClientPhotoChange = async (imageDataUrl: string) => {
    if (!user?.uid || user.role !== UserRole.CLIENT) {
      throw new Error('Reconnectez-vous avec votre compte client.');
    }

    const photoURL = await uploadClientAvatar(user.uid, imageDataUrl);
    const response = await firebaseAuthenticatedFetch('/api/users/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoURL }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || 'Impossible d’enregistrer la nouvelle photo.');

    const updatedUser = { ...user, ...payload.user, photoURL };
    setUser(updatedUser);
    localStorage.setItem('storehub_user', JSON.stringify(updatedUser));
  };

  const handleClientPasswordReset = async () => {
    if (!user?.email) throw new Error('Adresse e-mail introuvable.');
    const { auth } = await initFirebase();
    auth.languageCode = 'fr';
    await sendPasswordResetEmail(auth, user.email);
  };

  const handleEditClientPreferences = () => {
    localStorage.removeItem('storehub_preferences');
    setPreferences(null);
  };

  const handleVisitBoutique = (boutiqueId: string) => {
    const found = boutiques.find(b => b.id === boutiqueId);
    if (found) {
      setSelectedBoutique(found);
      setSelectedProduct(null); // Clear product view overlay
    }
  };

  const handleReserveProduct = async (
    product: Product,
    selection: { selectedSize: string; selectedColor: string },
  ) => {
    if (!user || user.role !== UserRole.CLIENT) {
      throw new Error('Connectez-vous avec un compte client pour réserver cet article.');
    }

    const response = await firebaseAuthenticatedFetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: product.id,
        selectedSize: selection.selectedSize,
        selectedColor: selection.selectedColor,
        clientName: user.displayName || user.email.split('@')[0],
        clientPhoto: user.photoURL || '',
      }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error || 'La réservation n’a pas pu être enregistrée.');
    }
  };

  const handleOpenOwnBoutique = () => {
    const ownedBoutique = getUserBoutique(user!, boutiques);

    if (!ownedBoutique) return;

    setCurrentView('dashboard');
    setSelectedBoutique(ownedBoutique);
    setSelectedProduct(null);
    setIsAddingProduct(false);
    setEditingProduct(null);
    setShowQuickAddMenu(false);
  };

  const handleEditProductClick = (product: Product) => {
    setEditingProduct(product);
    setSelectedProduct(null);
    setSelectedBoutique(null);
    setCurrentView('dashboard');
    setIsAddingProduct(true);
  };

  const handleBoutiqueCoverChange = async (boutiqueId: string, coverImage: string) => {
    if (!user?.uid) throw new Error('Reconnectez-vous avec le compte propriétaire de la boutique.');
    const storedCoverImage = await uploadBoutiqueCover(user.uid, boutiqueId, coverImage);
    const response = await firebaseAuthenticatedFetch(`/api/boutiques/${boutiqueId}/cover`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coverImage: storedCoverImage })
    });

    if (!response.ok) {
      const result = await response.json().catch(() => null);
      throw new Error(result?.error || 'La couverture n’a pas pu être enregistrée.');
    }

    const updatedAt = new Date().toISOString();
    setBoutiques((currentBoutiques) => currentBoutiques.map((boutique) => (
      boutique.id === boutiqueId ? { ...boutique, coverImage: storedCoverImage, updatedAt } : boutique
    )));
    setSelectedBoutique((currentBoutique) => (
      currentBoutique?.id === boutiqueId ? { ...currentBoutique, coverImage: storedCoverImage, updatedAt } : currentBoutique
    ));
  };

  const handleBoutiqueSettingsSave = async (input: BoutiqueSettingsInput) => {
    if (!user || user.role !== UserRole.BOUTIQUE) {
      throw new Error('Connectez-vous avec le compte propriétaire de la boutique.');
    }
    const ownedBoutique = getUserBoutique(user, boutiques);
    if (!ownedBoutique) throw new Error('Aucune boutique n’est liée à ce compte.');

    const logo = input.logoDataUrl
      ? await uploadBoutiqueLogo(user.uid, ownedBoutique.id, input.logoDataUrl)
      : ownedBoutique.logo;
    const response = await firebaseAuthenticatedFetch(`/api/boutiques/${ownedBoutique.id}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, logo, logoDataUrl: undefined }),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) throw new Error(result?.error || 'La boutique n’a pas pu être enregistrée.');

    const updatedBoutique: Boutique = result.boutique;
    setBoutiques((currentBoutiques) => currentBoutiques.map((boutique) => (
      boutique.id === updatedBoutique.id ? updatedBoutique : boutique
    )));
    setSelectedBoutique((currentBoutique) => (
      currentBoutique?.id === updatedBoutique.id ? updatedBoutique : currentBoutique
    ));
    setProducts((currentProducts) => currentProducts.map((product) => (
      product.boutiqueId === updatedBoutique.id
        ? { ...product, boutiqueName: updatedBoutique.name, boutiqueLogo: updatedBoutique.logo }
        : product
    )));
  };

  const handleAddProductSuccess = async (draft: Partial<Product>) => {
    if (!user || user.role !== UserRole.BOUTIQUE || !user.uid) return;
    const ownedBoutique = getUserBoutique(user, boutiques);
    if (!ownedBoutique) throw new Error('Aucune boutique n’est liée à ce compte.');
    const productId = `new_prod_${Date.now()}`;
    const draftImages = (draft.images as Product['images']) || [{ url: "/images/default-fashion-cover-v2.png", width: 1086, height: 1448 }];
    const localImages = draftImages.filter((image) => image.url.startsWith('data:image/'));
    const uploadedImages = localImages.length > 0
      ? await uploadProductImages(user.uid, ownedBoutique.id, productId, localImages.map((image) => ({
          dataUrl: image.url,
          width: image.width,
          height: image.height,
        })))
      : [];
    let uploadedImageIndex = 0;
    const storedImages = draftImages.map((image) => (
      image.url.startsWith('data:image/') ? uploadedImages[uploadedImageIndex++] : image
    ));
    const productCategory = draft.category || 'robes';
    const completedProduct: Product = {
      id: productId,
      boutiqueId: ownedBoutique.id,
      boutiqueName: ownedBoutique.name,
      boutiqueLogo: ownedBoutique.logo,
      name: draft.name || 'Nouvelle Robe',
      description: draft.description || 'Description',
      price: draft.price || 150,
      currency: 'DZD',
      images: storedImages,
      category: productCategory,
      styles: ['Minimaliste'],
      colors: draft.colors || ['Blanc'],
      sizes: ensureRequiredClothingSizes(draft.sizes || ['M'], productCategory),
      shoeSizeMin: draft.shoeSizeMin,
      shoeSizeMax: draft.shoeSizeMax,
      materials: draft.materials || ['Soie'],
      tags: ['nouveau'],
      stats: { views: 0, favorites: 0, clicks: 0 },
      isAvailable: true,
      isFeatured: false,
      searchKeywords: [draft.name || ''],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      const response = await firebaseAuthenticatedFetch('/api/products', {
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
    setEditingProduct(null);
    setCurrentView('dashboard');
  };

  const handleEditProductSuccess = async (draft: Partial<Product>) => {
    if (!editingProduct || !user?.uid) return;

    const draftImages = (draft.images as Product['images']) || editingProduct.images;
    const localImages = draftImages.filter((image) => image.url.startsWith('data:image/'));
    const uploadedImages = localImages.length > 0
      ? await uploadProductImages(user.uid, editingProduct.boutiqueId, editingProduct.id, localImages.map((image) => ({
          dataUrl: image.url,
          width: image.width,
          height: image.height,
        })))
      : [];
    let uploadedImageIndex = 0;
    const storedImages = draftImages.map((image) => (
      image.url.startsWith('data:image/') ? uploadedImages[uploadedImageIndex++] : image
    ));

    const productCategory = draft.category || editingProduct.category;
    const updatedProduct: Product = {
      ...editingProduct,
      ...draft,
      id: editingProduct.id,
      boutiqueId: editingProduct.boutiqueId,
      boutiqueName: editingProduct.boutiqueName,
      boutiqueLogo: editingProduct.boutiqueLogo,
      images: storedImages,
      category: productCategory,
      sizes: ensureRequiredClothingSizes(draft.sizes || editingProduct.sizes, productCategory),
      updatedAt: new Date().toISOString(),
    };

    try {
      const response = await firebaseAuthenticatedFetch(`/api/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProduct),
      });
      if (!response.ok) throw new Error('Product update could not be saved');

      setProducts((currentProducts) => currentProducts.map((product) => (
        product.id === updatedProduct.id ? updatedProduct : product
      )));
      setEditingProduct(null);
      setIsAddingProduct(false);
      setCurrentView('dashboard');
    } catch (error) {
      console.error('Error updating product:', error);
    }
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
      <div className="w-full h-full flex flex-col overflow-hidden relative">

        {/* Dynamic Main Body Content Router */}
        <main className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden flex flex-col pb-6">
          {selectedProduct ? (
            <ProductDetail
              product={selectedProduct}
              onBack={() => setSelectedProduct(null)}
              onVisitBoutique={handleVisitBoutique}
              onProductClick={(p) => setSelectedProduct(p)}
              favorites={favorites}
              toggleFavorite={toggleFavorite}
              shouldTrackView={user.role === UserRole.CLIENT || user.role === UserRole.GUEST}
              onReserve={(selection) => handleReserveProduct(selectedProduct, selection)}
            />
          ) : selectedBoutique ? (
            <BoutiqueDetail
              boutique={selectedBoutique}
              onBack={() => setSelectedBoutique(null)}
              onProductClick={(p) => setSelectedProduct(p)}
              favorites={favorites}
              toggleFavorite={toggleFavorite}
              shouldTrackView={user.role === UserRole.CLIENT || user.role === UserRole.GUEST}
              isFollowing={followedBoutiqueIds.includes(selectedBoutique.id)}
              onFollowChange={user.role === UserRole.CLIENT
                ? (following) => handleBoutiqueFollowChange(selectedBoutique.id, following)
                : undefined}
              canEditCover={user.role === UserRole.BOUTIQUE && currentView === 'dashboard'}
              onCoverImageChange={(coverImage) => handleBoutiqueCoverChange(selectedBoutique.id, coverImage)}
              onContactClick={() => {
                if (user && user.role === UserRole.CLIENT) {
                  const clientId = getStableChatUserId(user);
                  if (!clientId) return;
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
              initialProduct={editingProduct}
              onBack={() => {
                setIsAddingProduct(false);
                setEditingProduct(null);
              }}
              onSuccess={editingProduct ? handleEditProductSuccess : handleAddProductSuccess}
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
                  products={products}
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

              {currentView === 'boutiques' && (
                <BoutiquesList
                  boutiques={boutiques.filter((boutique) => followedBoutiqueIds.includes(boutique.id))}
                  isLoading={followedBoutiquesLoading}
                  onBack={() => setCurrentView('home')}
                  onVisitBoutique={(bId) => {
                    const b = boutiques.find(item => item.id === bId);
                    if (b) setSelectedBoutique(b);
                  }}
                  onContactBoutique={(b) => {
                    if (!user || user.role !== UserRole.CLIENT) return;
                    const clientId = getStableChatUserId(user);
                    if (!clientId) return;
                    setActiveChat({
                      chatId: `${clientId}_${b.id}`,
                      boutique: b,
                      client: {
                        uid: clientId,
                        displayName: user?.displayName || user?.email.split('@')[0] || 'Client',
                        photoURL: user?.photoURL || '',
                        email: user?.email || ''
                      }
                    });
                  }}
                />
              )}

              {currentView === 'dashboard' && (
                getUserBoutique(user, boutiques) ? (
                <Dashboard
                  boutiqueId={getUserBoutique(user, boutiques)!.id}
                  onAddProductClick={() => {
                    setEditingProduct(null);
                    setIsAddingProduct(true);
                  }}
                  onEditProductClick={handleEditProductClick}
                  onProductClick={(p) => setSelectedProduct(p)}
                  onOrdersClick={openOrders}
                  onOpenQA={() => setShowQAModal(true)}
                />
                ) : (
                  <section className="mx-auto mt-16 max-w-md border border-luxury-border bg-luxury-panel/60 p-6 text-center">
                    <h2 className="serif-title text-2xl text-white">Aucune boutique associée</h2>
                    <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                      Ce compte vendeur ne possède pas encore de boutique. Créez votre boutique ou contactez l’assistance StoreHub.
                    </p>
                  </section>
                )
              )}

              {currentView === 'reservations' && user.role === UserRole.CLIENT && (
                <div className="mx-auto w-full max-w-md space-y-5 px-4 pb-24 pt-8 sm:px-6">
                  <button
                    type="button"
                    onClick={() => setCurrentView('profile')}
                    className="flex min-h-10 items-center gap-2 rounded-lg border border-[#252525] px-3 text-[11px] text-zinc-400 transition-colors hover:border-luxury-gold/45 hover:text-luxury-gold"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Retour au compte
                  </button>
                  <ClientReservations boutiques={boutiques} products={products} />
                </div>
              )}

              {currentView === 'profile' && user.role === UserRole.CLIENT && (
                <ClientAccount
                  user={user}
                  favoritesCount={favorites.length}
                  followedBoutiquesCount={followedBoutiqueIds.length}
                  unreadMessagesCount={unreadCount}
                  onSaveProfile={handleClientProfileSave}
                  onChangePhoto={handleClientPhotoChange}
                  onOpenReservations={() => setCurrentView('reservations')}
                  onOpenFavorites={() => setCurrentView('favorites')}
                  onOpenFollowedBoutiques={() => setCurrentView('boutiques')}
                  onOpenMessages={() => setCurrentView('messages')}
                  onEditPreferences={handleEditClientPreferences}
                  onResetPassword={handleClientPasswordReset}
                  onLogout={handleLogout}
                />
              )}

              {currentView === 'profile' && user.role !== UserRole.CLIENT && (
                <div className="max-w-md mx-auto px-4 sm:px-6 mt-14 text-center space-y-8 animate-fadeIn pb-24">
                   
                  {/* Profile card header */}
                  <div className="space-y-4">
                    {user.role === UserRole.BOUTIQUE && getUserBoutique(user, boutiques) ? (
                      <img
                        src={getUserBoutique(user, boutiques)!.logo}
                        alt={getUserBoutique(user, boutiques)!.name}
                        className="w-20 h-20 border border-luxury-gold/40 rounded-full object-cover mx-auto shadow-[0_0_24px_rgba(212,175,55,0.14)]"
                      />
                    ) : user.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName || user.email} className="w-20 h-20 border border-luxury-gold/30 rounded-full object-cover mx-auto shadow-lg" />
                    ) : (
                      <div className="w-20 h-20 bg-luxury-card border border-luxury-gold/30 rounded-full flex items-center justify-center mx-auto shadow-lg relative">
                        <UserCircle2 className="w-12 h-12 text-luxury-gold" />
                      </div>
                    )}
                    <div>
                      <h2 className="serif-title text-2xl font-light text-white tracking-wide">
                        {user.role === UserRole.BOUTIQUE
                          ? getUserBoutique(user, boutiques)?.name || user.displayName || 'Ma boutique'
                          : user.displayName || 'Mon compte'}
                      </h2>
                      <p className="font-mono text-[9px] uppercase tracking-widest text-zinc-500 mt-0.5">{user.email}</p>
                    </div>
                  </div>

                  {user.role === UserRole.BOUTIQUE && getUserBoutique(user, boutiques) && (
                    <BoutiqueAccountSettings
                      boutique={getUserBoutique(user, boutiques)!}
                      onSave={handleBoutiqueSettingsSave}
                    />
                  )}

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
                <AdminConsole 
                  onLogout={handleLogout} 
                  onOpenQA={() => setShowQAModal(true)} 
                  onNavigateToStylist={() => setCurrentView('stylist')}
                  onBack={() => setCurrentView('home')}
                />
              )}
            </>
          )}
        </main>

        {/* 5. Responsive / Premium Floating Bottom Navigation Bar */}
        {user && (
          <nav className="console-nav-seamless shrink-0 relative w-full bg-luxury-dark/95 backdrop-blur-md px-1 sm:px-4 py-2 z-[60] flex justify-around items-center overflow-visible shadow-[0_-8px_30px_rgba(0,0,0,0.95)]">
            {user.role === UserRole.CLIENT ? (
              <>
                {/* Feed / Home */}
                <button
                  onClick={() => { setCurrentView('home'); setSelectedBoutique(null); setSelectedProduct(null); }}
                  className={`flex flex-col items-center gap-0.5 py-1 px-1.5 sm:px-2.5 rounded transition-all duration-300 cursor-pointer min-w-0 shrink-0 ${
                    currentView === 'home' && !selectedBoutique && !selectedProduct ? 'text-luxury-gold font-semibold' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <HomeIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0" />
                  <span className="text-[8px] sm:text-[8.5px] uppercase tracking-wider font-sans whitespace-nowrap">Découvrir</span>
                </button>

                {/* Boutique Tab */}
                <button
                  onClick={() => { setCurrentView('boutiques'); setSelectedBoutique(null); setSelectedProduct(null); }}
                  className={`flex flex-col items-center gap-0.5 py-1 px-1.5 sm:px-2.5 rounded transition-all duration-300 cursor-pointer min-w-0 shrink-0 ${
                    currentView === 'boutiques' ? 'text-luxury-gold font-semibold' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Store className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0" />
                  <span className="text-[8px] sm:text-[8.5px] uppercase tracking-wider font-sans whitespace-nowrap">Boutique</span>
                </button>

                {/* Classic Search + Visual Search */}
                <button
                  onClick={() => { setCurrentView('search'); setSelectedBoutique(null); setSelectedProduct(null); }}
                  className={`flex flex-col items-center gap-0.5 py-1 px-1.5 sm:px-2.5 rounded transition-all duration-300 cursor-pointer min-w-0 shrink-0 ${
                    currentView === 'search' ? 'text-luxury-gold font-semibold' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <SearchIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0" />
                  <span className="text-[8px] sm:text-[8.5px] uppercase tracking-wider font-sans whitespace-nowrap">Explorer</span>
                </button>

                {/* Stylist chat with glowing pulse icon */}
                <button
                  onClick={() => { setCurrentView('stylist'); setSelectedBoutique(null); setSelectedProduct(null); }}
                  className={`flex flex-col items-center gap-0.5 py-1 px-1.5 sm:px-2.5 rounded transition-all duration-300 relative cursor-pointer min-w-0 shrink-0 ${
                    currentView === 'stylist' ? 'text-luxury-gold font-semibold' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Sparkles className={`w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0 ${currentView === 'stylist' ? 'text-luxury-gold' : 'text-luxury-gold/80 animate-pulse'}`} />
                  <span className="text-[8px] sm:text-[8.5px] uppercase tracking-wider font-sans whitespace-nowrap">FENNCO IA</span>
                </button>

                {/* Favorites Wishlist */}
                <button
                  onClick={() => { setCurrentView('favorites'); setSelectedBoutique(null); setSelectedProduct(null); }}
                  className={`flex flex-col items-center gap-0.5 py-1 px-1.5 sm:px-2.5 rounded transition-all duration-300 cursor-pointer min-w-0 shrink-0 ${
                    currentView === 'favorites' ? 'text-luxury-gold font-semibold' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Heart className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0" />
                  <span className="text-[8px] sm:text-[8.5px] uppercase tracking-wider font-sans whitespace-nowrap">Favoris</span>
                </button>

                {/* Profile menu icon */}
                <button
                  onClick={() => { setCurrentView('profile'); setSelectedBoutique(null); setSelectedProduct(null); }}
                  className={`flex flex-col items-center gap-0.5 py-1 px-1.5 sm:px-2.5 rounded transition-all duration-300 cursor-pointer min-w-0 shrink-0 ${
                    currentView === 'profile' || currentView === 'reservations' ? 'text-luxury-gold font-semibold' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <UserCircle2 className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0" />
                  <span className="text-[8px] sm:text-[8.5px] uppercase tracking-wider font-sans whitespace-nowrap">Compte</span>
                </button>
              </>
            ) : (
              <div className="w-full grid grid-cols-4 items-end text-center py-0.5 gap-1 relative overflow-visible">
                
                {/* Icon 1: Console */}
                <button
                  onClick={() => {
                    if (user.role === UserRole.ADMIN) {
                      setCurrentView('admin');
                    } else {
                      setCurrentView('dashboard');
                    }
                    setSelectedBoutique(null);
                    setSelectedProduct(null);
                    setIsAddingProduct(false);
                    setShowQuickAddMenu(false);
                  }}
                  className={`flex flex-col items-center gap-0.5 py-1 bg-transparent transition-all duration-300 cursor-pointer ${
                    (currentView === 'dashboard' || currentView === 'admin') && !isAddingProduct ? 'text-luxury-gold font-semibold' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="text-[8px] uppercase tracking-wider font-sans font-medium">Console</span>
                </button>

                {/* Icon 2: Boutique */}
                <button
                  onClick={() => {
                    if (user.role === UserRole.BOUTIQUE) {
                      handleOpenOwnBoutique();
                      return;
                    }

                    setCurrentView('boutiques');
                    setSelectedBoutique(null);
                    setSelectedProduct(null);
                    setIsAddingProduct(false);
                    setShowQuickAddMenu(false);
                  }}
                  className={`flex flex-col items-center gap-0.5 py-1 bg-transparent transition-all duration-300 cursor-pointer ${
                    (user.role === UserRole.BOUTIQUE ? Boolean(selectedBoutique) : currentView === 'boutiques')
                      ? 'text-luxury-gold font-semibold'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Store className="w-4 h-4" />
                  <span className="text-[8px] uppercase tracking-wider font-sans font-medium">Boutique</span>
                </button>

                {/* Icon 3: Messages */}
                <button
                  onClick={() => {
                    setCurrentView('messages');
                    setMessagerieTab('messages');
                    setSelectedBoutique(null);
                    setSelectedProduct(null);
                    setIsAddingProduct(false);
                    setShowQuickAddMenu(false);
                  }}
                  className={`flex flex-col items-center gap-0.5 py-1 bg-transparent transition-all duration-300 relative cursor-pointer ${
                    currentView === 'messages' ? 'text-luxury-gold font-semibold' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <div className="relative">
                    <MessageSquare className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-2 min-w-[12px] h-[12px] rounded-full bg-emerald-500 text-[7px] font-mono font-bold text-black flex items-center justify-center border border-black animate-pulse">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <span className="text-[8px] uppercase tracking-wider font-sans font-medium">Messages</span>
                </button>

                {/* Icon 4: Compte */}
                <button
                  onClick={() => {
                    setCurrentView('profile');
                    setSelectedBoutique(null);
                    setSelectedProduct(null);
                    setIsAddingProduct(false);
                    setShowQuickAddMenu(false);
                  }}
                  className={`flex flex-col items-center gap-0.5 py-1 bg-transparent transition-all duration-300 cursor-pointer ${
                    currentView === 'profile' ? 'text-luxury-gold font-semibold' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <UserCircle2 className="w-4 h-4" />
                  <span className="text-[8px] uppercase tracking-wider font-sans font-medium">Compte</span>
                </button>
              </div>
            )}
          </nav>
        )}



        {/* QA Audit Modal displaying 5 Agents Reports and PDF Downloads */}
        {showQAModal && (
          <QAAuditModal onClose={() => setShowQAModal(false)} />
        )}
      </div>
    );
  };

  return (
    <div className="md:min-h-screen md:bg-[#0A0A0A] md:flex md:items-center md:justify-center md:py-8 font-sans antialiased overflow-hidden select-none">
      
      {/* Centered iPhone 17 Pro Max Device Container */}
      <div className="iphone-aluminum-frame relative w-full h-screen md:h-[92vh] md:max-h-[956px] md:min-h-[800px] md:aspect-[440/956] md:max-w-[440px] md:rounded-[55px] md:border-[11px] md:border-transparent md:bg-[#0A0A0A] md:shadow-[0_0_80px_rgba(168,170,173,0.24),0_30px_70px_rgba(0,0,0,0.65)] flex flex-col overflow-hidden">
        
        {/* Dynamic Island (iPhone 17 Pro Max Style) */}
        <div className="hidden md:flex absolute top-3.5 left-1/2 -translate-x-1/2 w-[110px] h-[28px] bg-[#0c0c0c] border border-zinc-800/40 rounded-full z-[100] items-center justify-between px-3.5 shadow-inner">
          <div className="w-2.5 h-2.5 bg-[#1a2238] rounded-full border border-blue-900/40 flex items-center justify-center">
            <div className="w-1 h-1 bg-blue-400/30 rounded-full animate-pulse" />
          </div>
          <div className="w-1.5 h-1.5 bg-zinc-900 rounded-full" />
        </div>

        {/* Home Swipe Indicator (iPhone 17 Pro Max Style) */}
        {/* Viewport Inside Container: This is where our full app runs */}
        <div className="relative w-full h-full flex flex-col overflow-hidden bg-[#0A0A0A] md:rounded-[44px]">
          {renderContent()}
          <div ref={scrollIndicatorRef} className="global-scroll-indicator" aria-hidden="true" />
          {user?.role === UserRole.BOUTIQUE && orderNotification && (
            <div
              role="alert"
              aria-live="assertive"
              className="absolute top-5 left-4 right-4 z-[120] bg-[#111111] border border-luxury-gold/70 shadow-[0_14px_40px_rgba(0,0,0,0.75)] p-4 animate-fadeIn"
              dir="rtl"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-luxury-gold text-black flex items-center justify-center shrink-0">
                  <BellRing className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-luxury-gold font-bold">
                    {orderNotification.count > 1 ? `${orderNotification.count} nouvelles commandes` : 'Nouvelle commande'}
                  </p>
                  <p className="text-sm text-white mt-1 truncate">{orderNotification.order.clientName}</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5 truncate">
                    {orderNotification.order.description || 'Commande à traiter'}
                  </p>
                  <button
                    type="button"
                    onClick={openOrders}
                    className="mt-3 px-3 py-1.5 bg-luxury-gold text-black font-mono text-[9px] uppercase tracking-widest font-bold cursor-pointer"
                  >
                    Voir les commandes
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setOrderNotification(null)}
                  aria-label="Fermer la notification"
                  className="text-zinc-500 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

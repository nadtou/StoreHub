import React, { useState, useEffect } from "react";
import { 
  MessageSquare, Clock, ArrowLeft, Mail, Inbox, Sparkles, Filter, CheckCircle, 
  Plus, Calendar, User, Tag, Trash2, ShoppingBag, Check, AlertCircle, X, Search, ChevronRight
} from "lucide-react";
import { Boutique, UserRole, ManualOrder, OrderStatus } from "../types";
import { Thread } from "./BoutiqueChatThreads";

interface MessagerieProps {
  key?: string;
  currentUser: { role: UserRole; email: string; uid?: string; displayName?: string; photoURL?: string };
  boutiques: Boutique[];
  onSelectThread: (chatId: string, boutique: Boutique, client: any) => void;
  onBack: () => void;
  initialTab?: 'messages' | 'orders';
}

const DEFAULT_ORDERS: ManualOrder[] = [
  {
    id: "ord_1",
    clientName: "Marie Laurent",
    deliveryDate: "2026-08-05",
    description: "Robe de soirée sur-mesure en soie dorée",
    amount: "450 €",
    status: "en_cours",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    boutiqueId: "boutique_1"
  },
  {
    id: "ord_2",
    clientName: "Camille Dubois",
    deliveryDate: "2026-08-12",
    description: "Veste structurée noir satin & doublure brodée",
    amount: "320 €",
    status: "en_attente",
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    boutiqueId: "boutique_1"
  },
  {
    id: "ord_3",
    clientName: "Lucas Bernard",
    deliveryDate: "2026-07-20",
    description: "Chemise lin blanc avec monogramme personnalisé",
    amount: "180 €",
    status: "livre",
    createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
    boutiqueId: "boutique_1"
  }
];

export default function Messagerie({
  currentUser,
  boutiques,
  onSelectThread,
  onBack,
  initialTab = 'messages'
}: MessagerieProps) {
  // Main Tab State: 'messages' or 'orders'
  const [mainTab, setMainTab] = useState<'messages' | 'orders'>(initialTab);

  // Messages State
  const [activeFilter, setActiveFilter] = useState<"all" | "unread">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);

  // Manual Orders State
  const [orders, setOrders] = useState<ManualOrder[]>(() => {
    const saved = localStorage.getItem('storehub_manual_orders');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (err) {
        console.error("Failed to load saved orders:", err);
      }
    }
    return DEFAULT_ORDERS;
  });

  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | OrderStatus>('all');
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [showAddOrderModal, setShowAddOrderModal] = useState(false);

  // New Order Form State
  const [newClientName, setNewClientName] = useState("");
  const [newDeliveryDate, setNewDeliveryDate] = useState(() => {
    const nextWeek = new Date(Date.now() + 7 * 86400000);
    return nextWeek.toISOString().split('T')[0];
  });
  const [newDescription, setNewDescription] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newStatus, setNewStatus] = useState<OrderStatus>("en_attente");

  const isClient = currentUser.role === UserRole.CLIENT;
  const userIdentifier = isClient ? currentUser.uid || "" : "boutique_1";

  // Persist orders on change
  useEffect(() => {
    localStorage.setItem('storehub_manual_orders', JSON.stringify(orders));
  }, [orders]);

  // Fetch discussions
  useEffect(() => {
    const fetchThreads = async () => {
      if (!userIdentifier) {
        setLoading(false);
        return;
      }
      
      try {
        const url = isClient
          ? `/api/chats/threads/client/${userIdentifier}`
          : `/api/chats/threads/boutique/${userIdentifier}`;
        
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setThreads(data);
        }
      } catch (error) {
        console.error("Failed to load chat threads in inbox:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchThreads();
    const interval = setInterval(fetchThreads, 4000);

    return () => clearInterval(interval);
  }, [userIdentifier, isClient]);

  // Handle opening a thread
  const handleThreadClick = (thread: Thread) => {
    localStorage.setItem(`last_read_${thread.chatId}`, new Date().toISOString());
    const threadBoutiqueId = thread.boutiqueId || "boutique_1";
    const foundBoutique = boutiques.find((b) => b.id === threadBoutiqueId) || boutiques[0];
    
    const threadClient: any = {
      uid: thread.clientId || currentUser.uid || "user_demo_1",
      displayName: thread.clientName || "Marie Laurent",
      photoURL: thread.clientPhoto || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
      email: isClient ? currentUser.email : "client@storehub.com"
    };

    onSelectThread(thread.chatId, foundBoutique, threadClient);
  };

  // Add Manual Order Handler
  const handleAddOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim() || !newDeliveryDate) return;

    const newOrder: ManualOrder = {
      id: `ord_${Date.now()}`,
      clientName: newClientName.trim(),
      deliveryDate: newDeliveryDate,
      description: newDescription.trim() || "Commande sur-mesure",
      amount: newAmount.trim() ? (newAmount.includes('€') ? newAmount : `${newAmount} €`) : "—",
      status: newStatus,
      createdAt: new Date().toISOString(),
      boutiqueId: "boutique_1"
    };

    setOrders([newOrder, ...orders]);
    setShowAddOrderModal(false);

    // Reset form
    setNewClientName("");
    setNewDescription("");
    setNewAmount("");
    setNewStatus("en_attente");
  };

  // Update Status Handler
  const handleUpdateStatus = (orderId: string, status: OrderStatus) => {
    setOrders(orders.map(o => o.id === orderId ? { ...o, status } : o));
  };

  // Delete Order Handler
  const handleDeleteOrder = (orderId: string) => {
    if (window.confirm("Voulez-vous supprimer cette commande manuelle ?")) {
      setOrders(orders.filter(o => o.id !== orderId));
    }
  };

  // Filter threads
  const filteredThreads = threads.filter((thread) => {
    const partnerName = isClient ? thread.boutiqueName : thread.clientName;
    const nameMatch = partnerName?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
    const textMatch = thread.lastMessageText?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
    
    if (activeFilter === "all") {
      return nameMatch || textMatch;
    } else {
      const lastRead = localStorage.getItem(`last_read_${thread.chatId}`);
      const hasNew = !lastRead || new Date(thread.lastMessageTime).getTime() > new Date(lastRead).getTime();
      const isOtherSender = thread.senderRole !== (isClient ? "client" : "boutique");
      const isUnread = hasNew && isOtherSender;
      return (nameMatch || textMatch) && isUnread;
    }
  });

  const totalUnreadCount = threads.filter((thread) => {
    const lastRead = localStorage.getItem(`last_read_${thread.chatId}`);
    const hasNew = !lastRead || new Date(thread.lastMessageTime).getTime() > new Date(lastRead).getTime();
    const isOtherSender = thread.senderRole !== (isClient ? "client" : "boutique");
    return hasNew && isOtherSender;
  }).length;

  // Filtered Orders
  const filteredOrders = orders.filter(o => {
    const matchesStatus = orderStatusFilter === 'all' || o.status === orderStatusFilter;
    const query = orderSearchQuery.toLowerCase();
    const matchesSearch = !query || 
      o.clientName.toLowerCase().includes(query) || 
      (o.description && o.description.toLowerCase().includes(query));
    return matchesStatus && matchesSearch;
  });

  // Counts for order statuses
  const countEnAttente = orders.filter(o => o.status === 'en_attente').length;
  const countEnCours = orders.filter(o => o.status === 'en_cours').length;
  const countLivre = orders.filter(o => o.status === 'livre').length;

  return (
    <div className="flex flex-col h-full bg-luxury-dark text-white select-none animate-fadeIn pb-28 relative">
      
      {/* 1. Header with Back Button and Dual Tabs */}
      <header className="sticky top-0 z-20 bg-luxury-dark/95 backdrop-blur-md border-b border-luxury-border px-5 pt-[42px] pb-3 shrink-0">
        <div className="max-w-6xl mx-auto space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="w-9 h-9 border border-luxury-border rounded-none flex items-center justify-center bg-luxury-panel hover:border-luxury-gold hover:text-luxury-gold transition-all cursor-pointer"
                title="Retour"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h1 className="serif-title text-base sm:text-lg font-light tracking-wide text-white">
                  {mainTab === 'messages' 
                    ? (isClient ? "Ma Messagerie" : "Boîte de Réception") 
                    : "Gestion des Commandes"}
                </h1>
                <p className="font-mono text-[9px] uppercase tracking-widest text-zinc-500 mt-0.5">
                  {mainTab === 'messages' 
                    ? "Échanges & conversations privées" 
                    : "Suivi manuel des livraisons & clients"}
                </p>
              </div>
            </div>

            {mainTab === 'orders' && (
              <button
                onClick={() => setShowAddOrderModal(true)}
                className="px-3.5 py-2 bg-luxury-gold text-black font-mono text-[10px] uppercase font-bold tracking-widest hover:bg-white transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-luxury-gold/20"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span className="hidden sm:inline">Nouvelle Commande</span>
                <span className="sm:hidden">Ajouter</span>
              </button>
            )}
          </div>

          {/* Dual Main Tabs Switcher */}
          <div className="grid grid-cols-2 p-1 bg-luxury-panel/40 border border-luxury-border/80 rounded-none">
            <button
              onClick={() => setMainTab('messages')}
              className={`py-2 px-3 text-[10px] font-mono uppercase tracking-widest font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                mainTab === 'messages'
                  ? "bg-luxury-gold text-black shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Messages</span>
              {totalUnreadCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-emerald-500 text-black text-[9px] font-bold flex items-center justify-center">
                  {totalUnreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setMainTab('orders')}
              className={`py-2 px-3 text-[10px] font-mono uppercase tracking-widest font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                mainTab === 'orders'
                  ? "bg-luxury-gold text-black shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Commandes ({orders.length})</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. TAB 1: MESSAGES / DISCUSSIONS */}
      {mainTab === 'messages' && (
        <>
          {/* Inbox Search & Filters */}
          <div className="px-5 py-3 border-b border-luxury-border/60 bg-luxury-panel/20 space-y-2.5 shrink-0">
            <div className="relative">
              <input
                type="text"
                placeholder="Rechercher une discussion..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-luxury-dark/80 border border-luxury-border/60 text-xs px-3.5 py-2 rounded-none focus:outline-none focus:border-luxury-gold transition-colors placeholder:text-zinc-600 font-light"
              />
            </div>

            <div className="flex items-center gap-2 pt-0.5">
              <button
                onClick={() => setActiveFilter("all")}
                className={`px-3 py-1 text-[9px] font-mono uppercase tracking-widest border transition-all cursor-pointer ${
                  activeFilter === "all"
                    ? "bg-luxury-gold text-black border-luxury-gold font-bold"
                    : "bg-transparent text-zinc-400 border-luxury-border hover:text-white"
                }`}
              >
                Tous ({threads.length})
              </button>
              <button
                onClick={() => setActiveFilter("unread")}
                className={`px-3 py-1 text-[9px] font-mono uppercase tracking-widest border transition-all relative cursor-pointer ${
                  activeFilter === "unread"
                    ? "bg-emerald-600 text-white border-emerald-500 font-bold"
                    : "bg-transparent text-zinc-400 border-luxury-border hover:text-white"
                }`}
              >
                Non lus
                {totalUnreadCount > 0 && (
                  <span className="ml-1 px-1 bg-white text-black rounded-full text-[8px] font-mono font-bold">
                    {totalUnreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-grow overflow-y-auto px-5 py-4 space-y-3 no-scrollbar">
            {loading && threads.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <div className="w-6 h-6 border-2 border-luxury-gold border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Chargement...</p>
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="py-16 text-center space-y-4 max-w-[280px] mx-auto">
                <div className="w-12 h-12 bg-luxury-panel border border-luxury-border flex items-center justify-center text-zinc-600 mx-auto">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="serif-title text-sm font-light text-zinc-400">
                    {activeFilter === "unread" ? "Aucun message non lu" : "Aucune discussion"}
                  </h4>
                  <p className="text-[11px] text-zinc-500 font-light leading-relaxed">
                    {isClient
                      ? "Vous n'avez pas encore initié de discussion privée avec une boutique."
                      : "Votre boîte de réception est vide. Les messages de vos clients s'afficheront ici."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredThreads.map((thread) => {
                  const partnerName = isClient ? thread.boutiqueName : thread.clientName;
                  const partnerLogo = isClient ? thread.boutiqueLogo : thread.clientPhoto;
                  
                  const lastRead = localStorage.getItem(`last_read_${thread.chatId}`);
                  const hasNew = !lastRead || new Date(thread.lastMessageTime).getTime() > new Date(lastRead).getTime();
                  const isOtherSender = thread.senderRole !== (isClient ? "client" : "boutique");
                  const isUnread = hasNew && isOtherSender;

                  const dateObj = new Date(thread.lastMessageTime);
                  const timeStr = dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                  const dateStr = dateObj.toLocaleDateString([], { month: "short", day: "numeric" });

                  return (
                    <div
                      key={thread.chatId}
                      onClick={() => handleThreadClick(thread)}
                      className={`p-3.5 border transition-all cursor-pointer relative group flex items-center justify-between ${
                        isUnread
                          ? "bg-luxury-panel/40 border-luxury-gold/50 shadow-md ring-1 ring-luxury-gold/10"
                          : "bg-luxury-panel/10 border-luxury-border/60 hover:bg-luxury-panel/20"
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-grow min-w-0">
                        <div className="relative shrink-0">
                          <img
                            src={partnerLogo}
                            alt={partnerName}
                            className="w-11 h-11 rounded-full object-cover border border-luxury-border group-hover:border-luxury-gold transition-colors"
                          />
                          {isUnread && (
                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-luxury-dark animate-pulse" />
                          )}
                        </div>

                        <div className="min-w-0 flex-grow">
                          <div className="flex items-baseline justify-between gap-2">
                            <h4 className="serif-title text-xs sm:text-sm font-light text-white group-hover:text-luxury-gold transition-colors truncate">
                              {partnerName}
                            </h4>
                            <span className="font-mono text-[9px] text-zinc-500 shrink-0">
                              {dateStr} à {timeStr}
                            </span>
                          </div>
                          
                          <p className={`text-[11px] truncate mt-0.5 leading-relaxed ${
                            isUnread ? "text-white font-medium" : "text-zinc-400 font-light"
                          }`}>
                            <span className="text-zinc-500 mr-1">
                              {thread.senderRole === (isClient ? "client" : "boutique") ? "Vous: " : ""}
                            </span>
                            {thread.lastMessageText}
                          </p>
                        </div>
                      </div>

                      {isUnread && (
                        <div className="ml-2 px-1.5 py-0.5 bg-emerald-500 text-[8px] font-mono text-black font-semibold uppercase tracking-wider shrink-0">
                          Nouveau
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* 3. TAB 2: GESTION DES COMMANDES MANUELLES */}
      {mainTab === 'orders' && (
        <div className="flex-grow flex flex-col overflow-hidden">
          
          {/* Status Filter Badges & Search */}
          <div className="px-5 py-3 border-b border-luxury-border/60 bg-luxury-panel/20 space-y-3 shrink-0">
            
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Rechercher par client ou produit..."
                value={orderSearchQuery}
                onChange={(e) => setOrderSearchQuery(e.target.value)}
                className="w-full bg-luxury-dark/80 border border-luxury-border/60 text-xs px-3.5 py-2 rounded-none focus:outline-none focus:border-luxury-gold transition-colors placeholder:text-zinc-600 font-light"
              />
            </div>

            {/* Status Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <button
                onClick={() => setOrderStatusFilter('all')}
                className={`px-2.5 py-1 text-[9px] font-mono uppercase tracking-widest border transition-all cursor-pointer ${
                  orderStatusFilter === 'all'
                    ? "bg-luxury-gold text-black border-luxury-gold font-bold"
                    : "bg-transparent text-zinc-400 border-luxury-border hover:text-white"
                }`}
              >
                Toutes ({orders.length})
              </button>

              <button
                onClick={() => setOrderStatusFilter('en_attente')}
                className={`px-2.5 py-1 text-[9px] font-mono uppercase tracking-widest border transition-all flex items-center gap-1 cursor-pointer ${
                  orderStatusFilter === 'en_attente'
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/60 font-bold"
                    : "bg-transparent text-amber-400/70 border-amber-500/30 hover:text-amber-300"
                }`}
              >
                <span>⏳ En attente</span>
                <span className="font-bold">({countEnAttente})</span>
              </button>

              <button
                onClick={() => setOrderStatusFilter('en_cours')}
                className={`px-2.5 py-1 text-[9px] font-mono uppercase tracking-widest border transition-all flex items-center gap-1 cursor-pointer ${
                  orderStatusFilter === 'en_cours'
                    ? "bg-sky-500/20 text-sky-300 border-sky-500/60 font-bold"
                    : "bg-transparent text-sky-400/70 border-sky-500/30 hover:text-sky-300"
                }`}
              >
                <span>⚡ En cours</span>
                <span className="font-bold">({countEnCours})</span>
              </button>

              <button
                onClick={() => setOrderStatusFilter('livre')}
                className={`px-2.5 py-1 text-[9px] font-mono uppercase tracking-widest border transition-all flex items-center gap-1 cursor-pointer ${
                  orderStatusFilter === 'livre'
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/60 font-bold"
                    : "bg-transparent text-emerald-400/70 border-emerald-500/30 hover:text-emerald-300"
                }`}
              >
                <span>✅ Livré</span>
                <span className="font-bold">({countLivre})</span>
              </button>
            </div>
          </div>

          {/* Orders Cards List */}
          <div className="flex-grow overflow-y-auto px-5 py-4 space-y-3.5 no-scrollbar">
            {filteredOrders.length === 0 ? (
              <div className="py-16 text-center space-y-4 max-w-[300px] mx-auto">
                <div className="w-12 h-12 bg-luxury-panel border border-luxury-border flex items-center justify-center text-zinc-600 mx-auto">
                  <ShoppingBag className="w-5 h-5 text-luxury-gold" />
                </div>
                <div className="space-y-1">
                  <h4 className="serif-title text-sm font-light text-zinc-300">
                    Aucune commande trouvée
                  </h4>
                  <p className="text-[11px] text-zinc-500 font-light leading-relaxed">
                    Créez votre première commande manuelle pour suivre le nom du client, la date de livraison et les statuts d'avancement.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddOrderModal(true)}
                  className="px-4 py-2 bg-luxury-gold text-black font-mono text-[10px] uppercase font-bold tracking-widest hover:bg-white transition-all inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Ajouter une Commande</span>
                </button>
              </div>
            ) : (
              filteredOrders.map((order) => {
                const isEnAttente = order.status === 'en_attente';
                const isEnCours = order.status === 'en_cours';
                const isLivre = order.status === 'livre';

                return (
                  <div
                    key={order.id}
                    className="p-4 bg-luxury-panel/30 border border-luxury-border/80 hover:border-luxury-gold/40 transition-all space-y-3 relative group"
                  >
                    {/* Top Row: Client Name & Amount */}
                    <div className="flex items-start justify-between gap-2 border-b border-luxury-border/40 pb-2.5">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-luxury-gold" />
                          <h3 className="serif-title text-sm font-light text-white tracking-wide">
                            {order.clientName}
                          </h3>
                        </div>
                        <p className="text-[11px] text-zinc-300 font-light pl-5">
                          {order.description}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono text-xs font-semibold text-luxury-gold">
                          {order.amount}
                        </span>
                        <button
                          onClick={() => handleDeleteOrder(order.id)}
                          className="block text-[10px] text-zinc-600 hover:text-red-400 transition-colors mt-1 ml-auto cursor-pointer p-1"
                          title="Supprimer la commande"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Middle Row: Delivery Date & Current Status Badge */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      
                      {/* Delivery Date */}
                      <div className="flex items-center gap-1.5 text-zinc-400 font-mono text-[10px]">
                        <Calendar className="w-3.5 h-3.5 text-luxury-gold/80" />
                        <span>Livraison:</span>
                        <span className="text-white font-semibold">
                          {new Date(order.deliveryDate).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </span>
                      </div>

                      {/* Current Status Badge */}
                      <div>
                        {isEnAttente && (
                          <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/50 text-[9px] font-mono font-bold uppercase tracking-widest flex items-center gap-1">
                            <span>⏳</span> En attente
                          </span>
                        )}
                        {isEnCours && (
                          <span className="px-2.5 py-1 bg-sky-500/20 text-sky-300 border border-sky-500/50 text-[9px] font-mono font-bold uppercase tracking-widest flex items-center gap-1">
                            <span>⚡</span> En cours
                          </span>
                        )}
                        {isLivre && (
                          <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 text-[9px] font-mono font-bold uppercase tracking-widest flex items-center gap-1">
                            <span>✅</span> Livré
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Row: Quick Status Change Switcher Tags */}
                    <div className="pt-2 border-t border-luxury-border/30 flex items-center justify-between gap-1">
                      <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">
                        Changer statut:
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'en_attente')}
                          className={`px-2 py-0.5 text-[8px] font-mono uppercase tracking-wider border transition-all cursor-pointer ${
                            isEnAttente
                              ? "bg-amber-500 text-black border-amber-400 font-bold"
                              : "bg-luxury-dark/60 text-zinc-400 border-luxury-border hover:border-amber-500/50 hover:text-amber-300"
                          }`}
                        >
                          En attente
                        </button>

                        <button
                          onClick={() => handleUpdateStatus(order.id, 'en_cours')}
                          className={`px-2 py-0.5 text-[8px] font-mono uppercase tracking-wider border transition-all cursor-pointer ${
                            isEnCours
                              ? "bg-sky-500 text-black border-sky-400 font-bold"
                              : "bg-luxury-dark/60 text-zinc-400 border-luxury-border hover:border-sky-500/50 hover:text-sky-300"
                          }`}
                        >
                          En cours
                        </button>

                        <button
                          onClick={() => handleUpdateStatus(order.id, 'livre')}
                          className={`px-2 py-0.5 text-[8px] font-mono uppercase tracking-wider border transition-all cursor-pointer ${
                            isLivre
                              ? "bg-emerald-500 text-black border-emerald-400 font-bold"
                              : "bg-luxury-dark/60 text-zinc-400 border-luxury-border hover:border-emerald-500/50 hover:text-emerald-300"
                          }`}
                        >
                          Livré
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 4. MODAL: NOUVELLE COMMANDE MANUELLE */}
      {showAddOrderModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-luxury-dark border border-luxury-gold/40 w-full max-w-md p-6 space-y-5 shadow-2xl relative">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-luxury-border pb-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-luxury-gold" />
                <h3 className="serif-title text-base font-light text-white tracking-wide">
                  Nouvelle Commande Manuelle
                </h3>
              </div>
              <button
                onClick={() => setShowAddOrderModal(false)}
                className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddOrder} className="space-y-4">
              
              {/* Nom du Client */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-400 mb-1.5">
                  Nom du Client <span className="text-luxury-gold">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Marie Laurent"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full bg-luxury-panel border border-luxury-border text-white text-xs px-3.5 py-2.5 rounded-none focus:outline-none focus:border-luxury-gold transition-colors font-light"
                />
              </div>

              {/* Date de livraison */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-400 mb-1.5">
                  Date de Livraison <span className="text-luxury-gold">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={newDeliveryDate}
                  onChange={(e) => setNewDeliveryDate(e.target.value)}
                  className="w-full bg-luxury-panel border border-luxury-border text-white text-xs px-3.5 py-2.5 rounded-none focus:outline-none focus:border-luxury-gold transition-colors font-light color-scheme-dark"
                />
              </div>

              {/* Description / Articles */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-400 mb-1.5">
                  Pièce / Description
                </label>
                <input
                  type="text"
                  placeholder="ex: Robe de soirée sur-mesure en soie"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-luxury-panel border border-luxury-border text-white text-xs px-3.5 py-2.5 rounded-none focus:outline-none focus:border-luxury-gold transition-colors font-light"
                />
              </div>

              {/* Montant */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-400 mb-1.5">
                  Montant (€)
                </label>
                <input
                  type="text"
                  placeholder="ex: 350 €"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="w-full bg-luxury-panel border border-luxury-border text-white text-xs px-3.5 py-2.5 rounded-none focus:outline-none focus:border-luxury-gold transition-colors font-light"
                />
              </div>

              {/* Statut Initial */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-400 mb-1.5">
                  Statut Initial
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewStatus('en_attente')}
                    className={`py-2 text-[9px] font-mono uppercase tracking-wider border transition-all cursor-pointer ${
                      newStatus === 'en_attente'
                        ? "bg-amber-500 text-black border-amber-400 font-bold"
                        : "bg-luxury-panel text-zinc-400 border-luxury-border hover:text-white"
                    }`}
                  >
                    En attente
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewStatus('en_cours')}
                    className={`py-2 text-[9px] font-mono uppercase tracking-wider border transition-all cursor-pointer ${
                      newStatus === 'en_cours'
                        ? "bg-sky-500 text-black border-sky-400 font-bold"
                        : "bg-luxury-panel text-zinc-400 border-luxury-border hover:text-white"
                    }`}
                  >
                    En cours
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewStatus('livre')}
                    className={`py-2 text-[9px] font-mono uppercase tracking-wider border transition-all cursor-pointer ${
                      newStatus === 'livre'
                        ? "bg-emerald-500 text-black border-emerald-400 font-bold"
                        : "bg-luxury-panel text-zinc-400 border-luxury-border hover:text-white"
                    }`}
                  >
                    Livré
                  </button>
                </div>
              </div>

              {/* Actions Buttons */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-luxury-border">
                <button
                  type="button"
                  onClick={() => setShowAddOrderModal(false)}
                  className="px-4 py-2 border border-luxury-border text-zinc-400 hover:text-white font-mono text-[10px] uppercase tracking-widest cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-luxury-gold text-black font-mono text-[10px] uppercase font-bold tracking-widest hover:bg-white transition-all shadow-md shadow-luxury-gold/30 cursor-pointer"
                >
                  Enregistrer
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

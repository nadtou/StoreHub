import React, { useState, useEffect } from 'react';
import { Boutique, Product, UserProfile, UserRole } from '../types';
import { 
  Building2, 
  ShoppingBag, 
  Users, 
  FileCheck2, 
  Check, 
  X, 
  ShieldAlert, 
  Trash2, 
  FileText, 
  Eye, 
  ExternalLink, 
  ArrowRight, 
  RotateCcw, 
  Sparkles, 
  Search, 
  Lock,
  Unlock,
  AlertCircle,
  Clock,
  ShieldCheck,
  Briefcase,
  SearchCode,
  SlidersHorizontal,
  ChevronRight,
  Maximize2,
  Upload
} from 'lucide-react';

interface AdminConsoleProps {
  onLogout: () => void;
}

export default function AdminConsole({ onLogout }: AdminConsoleProps) {
  const [activeTab, setActiveTab] = useState<'stats' | 'boutiques' | 'products' | 'users' | 'documents'>('stats');
  const [boutiques, setBoutiques] = useState<Boutique[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Admin Profile states (Avatar, Name, Role)
  const [adminAvatar, setAdminAvatar] = useState<string>(() => {
    return localStorage.getItem('admin_avatar_url') || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=80&q=80";
  });
  const [adminName, setAdminName] = useState<string>(() => {
    return localStorage.getItem('admin_name') || "Admin StoreHub";
  });
  const [adminRole, setAdminRole] = useState<string>(() => {
    return localStorage.getItem('admin_role') || "Souverain Suprême";
  });

  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [tempAvatarUrl, setTempAvatarUrl] = useState('');
  const [tempAdminName, setTempAdminName] = useState('');
  const [tempAdminRole, setTempAdminRole] = useState('');

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setTempAvatarUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Search and filter states
  const [boutiqueSearch, setBoutiqueSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [selectedBoutiqueFilter, setSelectedBoutiqueFilter] = useState('all');
  
  // Document preview state
  const [previewDoc, setPreviewDoc] = useState<{
    boutiqueId: string;
    boutiqueName: string;
    docName: string;
    docType: 'KBIS' | 'CNI' | 'Autre';
    status: 'pending' | 'verified' | 'suspended';
  } | null>(null);

  // Stats filter / search
  const [recentActivities] = useState([
    { id: 1, time: "Il y a 5 min", type: "product", text: "Nouveau sac à main en cuir ajouté par Hermès", status: "success" },
    { id: 2, time: "Il y a 12 min", type: "boutique", text: "Demande d'approbation soumise par 'Dior Couture'", status: "warning" },
    { id: 3, time: "Il y a 45 min", type: "user", text: "Nouvel utilisateur inscrit (Client Élite)", status: "info" },
    { id: 4, time: "Il y a 2 heures", type: "document", text: "KBIS certifié avec succès pour la boutique 'Chanel'", status: "success" },
    { id: 5, time: "Il y a 4 heures", type: "system", text: "Mise à jour des règles de modération automatique", status: "system" }
  ]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [resB, resP, resU] = await Promise.all([
        fetch('/api/boutiques'),
        fetch('/api/products'),
        fetch('/api/admin/users')
      ]);

      if (resB.ok) {
        const bData = await resB.json();
        setBoutiques(bData);
      }
      if (resP.ok) {
        const pData = await resP.json();
        setProducts(pData);
      }
      if (resU.ok) {
        const uData = await resU.json();
        setUsers(uData);
      }
    } catch (err) {
      console.error("Failed to load admin console data:", err);
      setError("Erreur de connexion avec le serveur. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Update Boutique API
  const handleUpdateBoutique = async (boutiqueId: string, updates: Partial<Boutique>) => {
    try {
      const response = await fetch(`/api/admin/boutiques/${boutiqueId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (response.ok) {
        // Update local state
        setBoutiques(prev => prev.map(b => b.id === boutiqueId ? { ...b, ...updates } : b));
        
        // If we are looking at a preview, update it as well
        if (previewDoc && previewDoc.boutiqueId === boutiqueId) {
          setPreviewDoc(prev => prev ? {
            ...prev,
            status: updates.isSuspended ? 'suspended' : (updates.isVerified ? 'verified' : 'pending')
          } : null);
        }
      } else {
        alert("Échec de la mise à jour de la boutique.");
      }
    } catch (err) {
      console.error("Error updating boutique:", err);
      alert("Une erreur est survenue lors de la mise à jour.");
    }
  };

  // Delete Boutique API
  const handleDeleteBoutique = async (boutiqueId: string) => {
    if (!window.confirm("Êtes-vous absolument sûr de vouloir supprimer définitivement cette boutique de StoreHub ? Cette action est irréversible et supprimera tout son contenu associé.")) {
      return;
    }
    try {
      const response = await fetch(`/api/admin/boutiques/${boutiqueId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setBoutiques(prev => prev.filter(b => b.id !== boutiqueId));
        if (previewDoc && previewDoc.boutiqueId === boutiqueId) {
          setPreviewDoc(null);
        }
        alert("Boutique supprimée avec succès.");
      } else {
        alert("Échec de la suppression.");
      }
    } catch (err) {
      console.error("Error deleting boutique:", err);
    }
  };

  // Delete Product API
  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm("Voulez-vous vraiment retirer cet article du catalogue de StoreHub ?")) {
      return;
    }
    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setProducts(prev => prev.filter(p => p.id !== productId));
        alert("Produit supprimé du catalogue.");
      } else {
        alert("Échec de la suppression.");
      }
    } catch (err) {
      console.error("Error deleting product:", err);
    }
  };

  // Calculations for Stats
  const totalBoutiquesCount = boutiques.length;
  const totalProductsCount = products.length;
  const totalUsersCount = users.length;
  const pendingValidationCount = boutiques.filter(b => !b.isVerified && !b.isSuspended).length;
  const verifiedBoutiquesCount = boutiques.filter(b => b.isVerified && !b.isSuspended).length;
  const suspendedBoutiquesCount = boutiques.filter(b => b.isSuspended).length;

  // Filter Boutique lists
  const filteredBoutiques = boutiques.filter(b => {
    const query = boutiqueSearch.toLowerCase();
    return b.name.toLowerCase().includes(query) || b.slug.toLowerCase().includes(query) || b.id.toLowerCase().includes(query);
  });

  // Filter Products lists
  const filteredProducts = products.filter(p => {
    const query = productSearch.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(query) || p.boutiqueName.toLowerCase().includes(query);
    const matchesBoutique = selectedBoutiqueFilter === 'all' || p.boutiqueId === selectedBoutiqueFilter;
    return matchesSearch && matchesBoutique;
  });

  // Filter Users list
  const filteredUsers = users.filter(u => {
    const query = userSearch.toLowerCase();
    return u.displayName.toLowerCase().includes(query) || u.email.toLowerCase().includes(query) || u.role.toLowerCase().includes(query);
  });

  return (
    <div className="flex-grow w-full bg-[#070707] text-white min-h-screen flex flex-col relative overflow-hidden selection:bg-[#D4AF37] selection:text-black pt-14 lg:pt-0">
      
      {/* PREMIUM HEADER - DISPOSITION PAR ANGLE (Branding top-left angle, Nav center, status info top-right) */}
      <header className="border-b border-[#151515] bg-[#0A0A0A] shrink-0 z-20 px-6 pt-[35px] pb-4 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Left Corner (Angle gauche) : Branding */}
        <div className="flex items-center gap-6 w-full md:w-auto">
          {/* Logo Brand Block */}
          <div className="flex flex-col items-start shrink-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-[#D4AF37] shadow-[0_0_8px_#D4AF37]" />
              <span className="font-mono text-[8px] tracking-[0.3em] text-[#D4AF37] font-semibold">CONTRÔLE SUPRÊME</span>
            </div>
            <h1 className="serif-title text-2xl font-light tracking-wide text-white">
              Store<span className="text-[#D4AF37] font-semibold">Hub</span><span className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 ml-1">HQ</span>
            </h1>
          </div>
          
          {/* Main Desktop Navigation Items */}
          <nav className="hidden lg:flex items-center gap-1 bg-[#070707] border border-[#161616] p-1 rounded-xl">
            {[
              { id: 'stats', label: 'Vue d’Ensemble', icon: ShieldCheck },
              { id: 'boutiques', label: 'Les Boutiques', icon: Building2, count: totalBoutiquesCount },
              { id: 'products', label: 'Modération Articles', icon: ShoppingBag, count: totalProductsCount },
              { id: 'users', label: 'Registre Membres', icon: Users, count: totalUsersCount },
              { id: 'documents', label: 'Documents Kbis', icon: FileCheck2, count: pendingValidationCount, accent: true },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id as any); setPreviewDoc(null); }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer relative group border ${
                    isActive 
                      ? 'bg-gradient-to-r from-[#121212] to-[#0A0A0A] text-[#D4AF37] border-[#D4AF37]/30 shadow-md' 
                      : 'text-zinc-400 hover:text-white border-transparent hover:bg-zinc-900/30'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#D4AF37]' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-bold ${
                      tab.accent && tab.count > 0
                        ? 'bg-red-950/40 text-red-400 border border-red-900/40 animate-pulse'
                        : isActive 
                          ? 'bg-[#D4AF37]/10 text-[#D4AF37]' 
                          : 'bg-zinc-900 text-zinc-500'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Corner (Angle droit) : Super Administrator Profile Box & Status Info */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between md:justify-end gap-3 w-full md:w-auto border-t md:border-t-0 border-[#151515] pt-3 md:pt-0">
          <div className="hidden xl:flex items-center gap-2.5 bg-[#0F0F0F] border border-[#161616] rounded-xl py-2 px-3.5 text-xs font-mono text-zinc-400">
            <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>HQ SÉCURISÉ UTC+2</span>
          </div>

          <div className="flex items-center gap-3 bg-[#0F0F0F] border border-[#161616] rounded-xl p-2 px-4 shadow-lg">
            {/* Admin Avatar section */}
            <button 
              onClick={() => { 
                setTempAvatarUrl(adminAvatar); 
                setTempAdminName(adminName);
                setTempAdminRole(adminRole);
                setShowAvatarModal(true); 
              }}
              className="relative shrink-0 group focus:outline-none cursor-pointer"
              title="Changer le profil"
            >
              <img 
                src={adminAvatar} 
                alt="Admin avatar" 
                className="w-9 h-9 rounded-full object-cover border border-[#D4AF37]/40 shadow-inner group-hover:border-[#D4AF37] transition-all duration-300" 
              />
              <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border border-[#0F0F0F]" />
              <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                <Sparkles className="w-3.5 h-3.5 text-[#D4AF37] animate-pulse" />
              </div>
            </button>
            
            {/* Admin Name & status */}
            <div className="text-left">
              <p className="text-xs font-semibold text-white tracking-wide">{adminName}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="w-1 h-1 rounded-full bg-[#D4AF37] animate-pulse" />
                <p className="text-[8px] text-[#D4AF37] font-mono tracking-wider uppercase">{adminRole}</p>
              </div>
            </div>

            {/* Quick action logout line */}
            <div className="border-l border-[#202020] pl-3 ml-1 flex flex-col justify-center text-right">
              <button
                onClick={onLogout}
                className="text-[9px] font-mono tracking-widest text-zinc-400 hover:text-red-400 font-bold uppercase transition-all duration-300 hover:scale-105 cursor-pointer"
              >
                LOGOUT
              </button>
              <span className="text-[7px] text-zinc-600 font-mono tracking-tight uppercase mt-0.5">ZONE_SECURE</span>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile-Friendly Horizontal Navigation Bar (Only visible on small-to-medium screens) */}
      <div className="lg:hidden bg-[#0A0A0A] border-b border-[#121212] overflow-x-auto scrollbar-none shrink-0 px-4 py-2.5 flex items-center gap-2">
        {[
          { id: 'stats', label: 'Vue d’Ensemble', icon: ShieldCheck },
          { id: 'boutiques', label: 'Les Boutiques', icon: Building2, count: totalBoutiquesCount },
          { id: 'products', label: 'Modération Articles', icon: ShoppingBag, count: totalProductsCount },
          { id: 'users', label: 'Registre Membres', icon: Users, count: totalUsersCount },
          { id: 'documents', label: 'Documents Kbis', icon: FileCheck2, count: pendingValidationCount, accent: true },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as any); setPreviewDoc(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all whitespace-nowrap cursor-pointer border ${
                isActive 
                  ? 'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/30' 
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900/30 border-transparent'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`px-1.5 rounded font-mono text-[8px] font-bold ${
                  tab.accent && tab.count > 0 ? 'bg-red-950 text-red-400 border border-red-900/40' : 'bg-zinc-900 text-zinc-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* MAIN WORKSPACE WRAPPER */}
      <main className="flex-grow flex flex-col overflow-hidden relative">
        
        {/* Minimal Subheader / Status Info bar */}
        <div className="h-10 border-b border-[#121212] px-6 flex items-center justify-between shrink-0 bg-[#080808]/40 backdrop-blur-md z-10">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[8px] text-zinc-500 uppercase tracking-widest">Actif :</span>
            <span className="font-mono text-[8px] text-[#D4AF37] uppercase tracking-widest font-bold">
              {activeTab === 'stats' && "Vue d'ensemble et Statistiques"}
              {activeTab === 'boutiques' && "Gestionnaires des Boutiques"}
              {activeTab === 'products' && "Cabinet de Modération d'Articles"}
              {activeTab === 'users' && "Registre des Membres d'Élite"}
              {activeTab === 'documents' && "Inspection Administrative (KBIS / CNI)"}
            </span>
          </div>

          <div className="flex items-center gap-3 text-[9px] font-mono text-zinc-500">
            <span className="hidden sm:inline">SERVEUR : SECURE_LIVE</span>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>

        {/* Workspace body content */}
        <div className="flex-grow overflow-y-auto p-6 pb-24 md:pb-8">
          
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
              <p className="font-mono text-xs text-zinc-500 uppercase tracking-widest animate-pulse">Chargement sécurisé du tableau d’administration...</p>
            </div>
          ) : error ? (
            <div className="p-6 bg-red-950/20 border border-red-900/30 rounded-xl text-center space-y-4 max-w-md mx-auto mt-12">
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
              <p className="text-sm font-light text-red-300">{error}</p>
              <button
                onClick={fetchAllData}
                className="px-4 py-2 bg-red-950/40 border border-red-800 rounded text-xs font-mono tracking-wider text-red-200"
              >
                Réessayer
              </button>
            </div>
          ) : (
            <div className="animate-fadeIn space-y-6">
              
              {/* TAB 1: NEW CONTROL CENTER STATS (Vue d’ensemble) */}
              {activeTab === 'stats' && (
                <div className="space-y-6">
                  {/* Headline Banner */}
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-[#0F0F0F] via-[#0D0D0D] to-[#080808] border border-[#1A1A1A] relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-b from-[#D4AF37]/5 to-transparent rounded-full blur-3xl pointer-events-none" />
                    <div>
                      <h2 className="serif-title text-xl md:text-2xl font-light text-white leading-tight">
                        Bienvenue dans le <span className="text-[#D4AF37]">Quartier Général</span> StoreHub
                      </h2>
                      <p className="text-zinc-400 text-xs mt-1.5 font-light max-w-xl">
                        Régulez le catalogue général de mode de luxe, validez de nouveaux partenaires de boutiques prestigieux et gérez le registre des membres inscrits.
                      </p>
                    </div>
                    <button
                      onClick={fetchAllData}
                      className="px-3.5 py-2 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/15 border border-[#D4AF37]/30 hover:border-[#D4AF37]/50 text-[#D4AF37] rounded-lg text-[9px] font-mono tracking-widest uppercase cursor-pointer transition-all shrink-0"
                    >
                      Synchroniser les données
                    </button>
                  </div>

                  {/* PREMIUM BENTO GRID INSIGHTS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Stat 1: Boutiques */}
                    <div className="p-5 bg-gradient-to-b from-[#0F0F0F] to-[#090909] border border-[#161616] rounded-xl flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-[#D4AF37]/30 transition-all duration-300">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-mono text-[8px] uppercase tracking-wider text-zinc-500">BOUTIQUES ACTIVES</span>
                        <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center text-[#D4AF37] group-hover:scale-105 transition-transform">
                          <Building2 className="w-4 h-4" />
                        </div>
                      </div>
                      <div>
                        <span className="text-3xl font-bold font-mono tracking-tight text-white">{totalBoutiquesCount}</span>
                        <div className="flex items-center gap-2 mt-1 text-[9px] font-mono text-zinc-500">
                          <span className="text-emerald-500">{verifiedBoutiquesCount} Certifiées</span>
                          <span>•</span>
                          <span className="text-amber-500">{pendingValidationCount} En attente</span>
                        </div>
                      </div>
                    </div>

                    {/* Stat 2: Articles */}
                    <div className="p-5 bg-gradient-to-b from-[#0F0F0F] to-[#090909] border border-[#161616] rounded-xl flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-[#D4AF37]/30 transition-all duration-300">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-mono text-[8px] uppercase tracking-wider text-zinc-500">CATALOGUE TOTAL</span>
                        <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center text-[#D4AF37] group-hover:scale-105 transition-transform">
                          <ShoppingBag className="w-4 h-4" />
                        </div>
                      </div>
                      <div>
                        <span className="text-3xl font-bold font-mono tracking-tight text-white">{totalProductsCount}</span>
                        <div className="flex items-center gap-1.5 mt-1 text-[9px] font-mono text-zinc-500">
                          <span>Moy. {totalBoutiquesCount > 0 ? (totalProductsCount / totalBoutiquesCount).toFixed(1) : 0} pièces par boutique</span>
                        </div>
                      </div>
                    </div>

                    {/* Stat 3: Utilisateurs */}
                    <div className="p-5 bg-gradient-to-b from-[#0F0F0F] to-[#090909] border border-[#161616] rounded-xl flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-[#D4AF37]/30 transition-all duration-300">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-mono text-[8px] uppercase tracking-wider text-zinc-500">COMMUNAUTÉ INSCRITE</span>
                        <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center text-[#D4AF37] group-hover:scale-105 transition-transform">
                          <Users className="w-4 h-4" />
                        </div>
                      </div>
                      <div>
                        <span className="text-3xl font-bold font-mono tracking-tight text-white">{totalUsersCount}</span>
                        <div className="flex items-center gap-2 mt-1 text-[9px] font-mono text-zinc-500">
                          <span>{users.filter(u => u.role === UserRole.CLIENT).length} Clients Élite</span>
                          <span>•</span>
                          <span>{users.filter(u => u.role === UserRole.BOUTIQUE).length} Partenaires</span>
                        </div>
                      </div>
                    </div>

                    {/* Stat 4: Pending actions */}
                    <div className={`p-5 rounded-xl flex flex-col justify-between shadow-lg relative overflow-hidden group transition-all duration-300 border ${
                      pendingValidationCount > 0 
                        ? 'bg-amber-950/10 border-amber-900/40 text-amber-300' 
                        : 'bg-gradient-to-b from-[#0F0F0F] to-[#090909] border-[#161616]'
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-mono text-[8px] uppercase tracking-wider text-zinc-500">VÉRIFICATION JUSTIFICATIFS</span>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${pendingValidationCount > 0 ? 'bg-amber-950/40 text-amber-400' : 'bg-zinc-900 text-zinc-500'}`}>
                          <FileCheck2 className="w-4 h-4" />
                        </div>
                      </div>
                      <div>
                        <span className={`text-3xl font-bold font-mono tracking-tight ${pendingValidationCount > 0 ? 'text-amber-400 animate-pulse' : 'text-white'}`}>
                          {pendingValidationCount}
                        </span>
                        <div className="flex items-center gap-1.5 mt-1 text-[9px] font-mono text-zinc-500">
                          {pendingValidationCount > 0 ? (
                            <span className="text-amber-400/80 font-bold">Action administrative requise</span>
                          ) : (
                            <span className="text-emerald-500 font-medium">Tout est en règle</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* BOTTOM SECTIONS OF OVERVIEW */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left: Pending boutiques detailed and modern lists */}
                    <div className="lg:col-span-7 bg-[#0A0A0A] border border-[#141414] rounded-2xl p-6 space-y-4">
                      <div className="flex items-center justify-between border-b border-[#141414] pb-4">
                        <div className="flex items-center gap-2">
                          <FileCheck2 className="w-4 h-4 text-[#D4AF37]" />
                          <h3 className="font-mono text-xs uppercase tracking-wider font-semibold text-white">Boutiques en attente de vérification</h3>
                        </div>
                        {pendingValidationCount > 0 && (
                          <span className="px-2 py-0.5 bg-amber-950/40 border border-amber-900/40 text-amber-400 rounded text-[8px] font-mono font-bold animate-pulse">
                            IMPORTANT
                          </span>
                        )}
                      </div>

                      {boutiques.filter(b => !b.isVerified && !b.isSuspended).length === 0 ? (
                        <div className="py-12 text-center space-y-3">
                          <div className="w-12 h-12 rounded-full bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 flex items-center justify-center mx-auto">
                            <Check className="w-6 h-6" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-white text-xs font-medium">Toutes les demandes ont été traitées !</p>
                            <p className="text-zinc-500 text-[10px] font-light">Aucune boutique ne requiert d'attention immédiate pour l'instant.</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                          {boutiques.filter(b => !b.isVerified && !b.isSuspended).map(b => (
                            <div key={b.id} className="p-4 bg-[#0D0D0D] border border-[#161616] rounded-xl flex items-center justify-between hover:border-[#D4AF37]/20 transition-all duration-300">
                              <div className="flex items-center gap-3.5">
                                <img src={b.logo} alt={b.name} className="w-10 h-10 rounded-full object-cover border border-[#D4AF37]/20 bg-zinc-900 shrink-0" />
                                <div>
                                  <p className="text-xs font-semibold text-white">{b.name}</p>
                                  <p className="text-[9px] text-zinc-500 font-mono mt-0.5">{b.slug}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  setActiveTab('documents');
                                  setPreviewDoc({
                                    boutiqueId: b.id,
                                    boutiqueName: b.name,
                                    docName: b.verificationDocName || 'KBIS_Registre_Commerce.pdf',
                                    docType: 'KBIS',
                                    status: 'pending'
                                  });
                                }}
                                className="px-3 py-1.5 bg-zinc-900 hover:bg-[#D4AF37] text-zinc-300 hover:text-black rounded-md text-[9px] font-mono tracking-widest uppercase transition-all"
                              >
                                Examiner KBIS
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right: Live audit log activities panel */}
                    <div className="lg:col-span-5 bg-[#0A0A0A] border border-[#141414] rounded-2xl p-6 flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-[#141414] pb-4">
                          <ShieldAlert className="w-4 h-4 text-[#D4AF37]" />
                          <h3 className="font-mono text-xs uppercase tracking-wider font-semibold text-white">Journal d'Audit & Sécurité</h3>
                        </div>

                        <div className="space-y-4">
                          {recentActivities.map(act => (
                            <div key={act.id} className="flex gap-3 text-xs leading-relaxed relative">
                              {/* Left line decorator */}
                              <div className="flex flex-col items-center">
                                <div className={`w-2 h-2 rounded-full mt-1.5 ${
                                  act.status === "success" ? "bg-emerald-500" :
                                  act.status === "warning" ? "bg-amber-500" :
                                  act.status === "info" ? "bg-blue-500" : "bg-zinc-600"
                                }`} />
                                <div className="w-[1px] bg-zinc-900 flex-grow mt-1" />
                              </div>
                              <div className="flex-grow pb-1 min-w-0">
                                <div className="flex justify-between items-start gap-2">
                                  <p className="text-zinc-300 font-light truncate">{act.text}</p>
                                  <span className="text-[9px] text-zinc-500 font-mono shrink-0 whitespace-nowrap">{act.time}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-5 border-t border-[#141414] text-[9px] font-mono text-zinc-500 flex justify-between items-center mt-6">
                        <span>Intégrité de la Base de Données</span>
                        <span className="text-emerald-500 font-bold uppercase">100% SÉCURISÉ</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ELITE BOUTIQUES DIRECTORY (Les Boutiques) */}
              {activeTab === 'boutiques' && (
                <div className="space-y-4">
                  {/* Filter and search bar */}
                  <div className="bg-[#0A0A0A] border border-[#141414] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="relative w-full sm:w-80">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                      <input
                        type="text"
                        value={boutiqueSearch}
                        onChange={e => setBoutiqueSearch(e.target.value)}
                        placeholder="Rechercher une boutique..."
                        className="w-full bg-[#101010] border border-[#1A1A1A] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#D4AF37] transition-all font-sans"
                      />
                    </div>
                    
                    <div className="text-[10px] font-mono text-zinc-400">
                      Nombre de boutiques trouvées : <span className="text-[#D4AF37] font-bold font-mono">{filteredBoutiques.length}</span>
                    </div>
                  </div>

                  {/* Boutiques list/grid rebuild */}
                  {filteredBoutiques.length === 0 ? (
                    <div className="p-16 text-center text-zinc-500 border border-dashed border-zinc-900 rounded-2xl">
                      Aucune boutique n’a été trouvée pour votre recherche.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredBoutiques.map(b => {
                        const bProducts = products.filter(p => p.boutiqueId === b.id);
                        return (
                          <div 
                            key={b.id} 
                            className={`p-5 rounded-2xl bg-[#090909] border flex flex-col justify-between gap-5 transition-all duration-300 relative overflow-hidden group ${
                              b.isSuspended 
                                ? 'border-red-950 bg-gradient-to-br from-[#090909] to-red-950/5' 
                                : b.isVerified 
                                  ? 'border-[#D4AF37]/20 hover:border-[#D4AF37]/40 bg-gradient-to-br from-[#090909] to-[#D4AF37]/3' 
                                  : 'border-[#141414] hover:border-zinc-800'
                            }`}
                          >
                            {/* Card Header with Gold Rings and Badges */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="relative shrink-0">
                                  <img 
                                    src={b.logo} 
                                    alt={b.name} 
                                    className={`w-11 h-11 rounded-full object-cover bg-zinc-900 border ${
                                      b.isVerified ? 'border-[#D4AF37]' : 'border-zinc-800'
                                    }`} 
                                  />
                                  {b.isVerified && (
                                    <div className="absolute -bottom-1 -right-1 bg-black text-[#D4AF37] p-0.5 rounded-full border border-[#D4AF37] shadow-lg">
                                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <h4 className="serif-title text-base font-semibold text-white tracking-wide">{b.name}</h4>
                                  <p className="text-[10px] text-[#D4AF37] font-mono mt-0.5">slug: /{b.slug}</p>
                                </div>
                              </div>
                              
                              {/* Status Badges */}
                              {b.isSuspended ? (
                                <span className="px-2 py-0.5 bg-red-950/60 border border-red-900/60 text-red-400 rounded text-[8px] font-mono uppercase tracking-widest font-semibold">Suspendue</span>
                              ) : b.isVerified ? (
                                <span className="px-2 py-0.5 bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] rounded text-[8px] font-mono uppercase tracking-widest font-bold">Certifiée</span>
                              ) : (
                                <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-700 text-zinc-400 rounded text-[8px] font-mono uppercase tracking-widest">En Attente</span>
                              )}
                            </div>

                            {/* Card Body description */}
                            <p className="text-xs text-zinc-400 font-light line-clamp-3 leading-relaxed mt-2 min-h-[48px]">
                              {b.description || "Aucune description fournie par la boutique pour le moment."}
                            </p>

                            {/* Card Stats counters */}
                            <div className="flex items-center justify-between border-t border-[#141414] pt-3 text-[10px] font-mono text-zinc-500">
                              <span>Catalogue : <strong className="text-white font-bold">{bProducts.length} articles</strong></span>
                              <span>ID: ...{b.id.substring(b.id.length - 8)}</span>
                            </div>

                            {/* Card Administrative Actions Bar */}
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#121212]">
                              
                              {/* Toggle certification */}
                              <button
                                onClick={() => handleUpdateBoutique(b.id, { isVerified: !b.isVerified })}
                                className={`py-2 px-2.5 rounded-lg text-[9px] font-mono tracking-wider uppercase font-semibold cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                                  b.isVerified 
                                    ? 'bg-[#101010] border border-zinc-800 text-zinc-500 hover:text-white' 
                                    : 'bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-900/40 text-emerald-400'
                                }`}
                              >
                                <Check className="w-3 h-3 shrink-0" />
                                <span>{b.isVerified ? 'Révoquer' : 'Certifier'}</span>
                              </button>

                              {/* Toggle suspension */}
                              <button
                                onClick={() => handleUpdateBoutique(b.id, { isSuspended: !b.isSuspended })}
                                className={`py-2 px-2.5 rounded-lg text-[9px] font-mono tracking-wider uppercase font-semibold cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                                  b.isSuspended 
                                    ? 'bg-amber-950/20 hover:bg-amber-950/40 border border-amber-900/40 text-amber-400' 
                                    : 'bg-red-950/15 hover:bg-red-950/30 border border-red-900/40 text-red-400'
                                }`}
                              >
                                {b.isSuspended ? <Unlock className="w-3 h-3 shrink-0" /> : <Lock className="w-3 h-3 shrink-0" />}
                                <span>{b.isSuspended ? 'Réactiver' : 'Suspendre'}</span>
                              </button>

                            </div>

                            {/* Delete Button absolute overlay or subtle top right */}
                            <button
                              onClick={() => handleDeleteBoutique(b.id)}
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 bg-[#0F0F0F]/80 hover:bg-red-950 border border-zinc-900 hover:border-red-900 text-zinc-500 hover:text-red-400 rounded-md transition-all cursor-pointer"
                              title="Bannir définitivement la boutique"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: CATALOG MODERATION (Cabinet de Modération d'Articles) */}
              {activeTab === 'products' && (
                <div className="space-y-4">
                  {/* Filters Bar */}
                  <div className="bg-[#0A0A0A] border border-[#141414] rounded-2xl p-5 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-80">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                      <input
                        type="text"
                        value={productSearch}
                        onChange={e => setProductSearch(e.target.value)}
                        placeholder="Rechercher un article..."
                        className="w-full bg-[#101010] border border-[#1A1A1A] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#D4AF37] transition-all font-sans"
                      />
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <span className="font-mono text-[9px] text-zinc-500 whitespace-nowrap uppercase">Filtrer par boutique :</span>
                      <select
                        value={selectedBoutiqueFilter}
                        onChange={e => setSelectedBoutiqueFilter(e.target.value)}
                        className="bg-[#101010] border border-[#1A1A1A] text-xs text-zinc-300 rounded-xl px-4 py-2.5 outline-none focus:border-[#D4AF37] font-sans flex-grow md:flex-grow-0 cursor-pointer"
                      >
                        <option value="all">Toutes les boutiques</option>
                        {boutiques.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Products Grid Rebuild */}
                  {filteredProducts.length === 0 ? (
                    <div className="p-16 text-center text-zinc-500 border border-dashed border-zinc-900 rounded-2xl">
                      Aucun article trouvé.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {filteredProducts.map(p => (
                        <div key={p.id} className="bg-[#090909] border border-[#141414] rounded-2xl overflow-hidden flex flex-col justify-between group hover:border-[#D4AF37]/20 transition-all duration-300 relative">
                          
                          {/* Image Container */}
                          <div className="relative aspect-[3/4] overflow-hidden bg-zinc-900 shrink-0">
                            <img 
                              src={p.images?.[0]?.url || "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=600"} 
                              alt={p.name} 
                              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" 
                            />
                            {/* Luxury Badge Top Left */}
                            <span className="absolute top-2.5 left-2.5 px-2 py-0.5 bg-black/85 backdrop-blur-sm border border-[#D4AF37]/35 text-[#D4AF37] font-mono rounded text-[8px] tracking-wider uppercase">
                              {p.boutiqueName}
                            </span>
                            {/* Trash Button Hover Layer */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button
                                onClick={() => handleDeleteProduct(p.id)}
                                className="p-3 bg-red-950/95 hover:bg-red-900 border border-red-800 text-red-200 rounded-full shadow-2xl transition-all scale-95 group-hover:scale-100 hover:scale-105 cursor-pointer"
                                title="Supprimer cet article définitivement"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </div>

                          {/* Info section */}
                          <div className="p-4 flex-grow flex flex-col justify-between gap-3">
                            <div className="space-y-1">
                              <p className="font-mono text-[9px] uppercase tracking-widest text-[#D4AF37] font-medium">catégorie : {p.category}</p>
                              <h4 className="serif-title text-sm font-semibold text-white tracking-wide line-clamp-1 leading-snug">{p.name}</h4>
                            </div>
                            
                            <div className="flex items-center justify-between border-t border-[#121212] pt-2.5">
                              <span className="text-xs font-mono font-bold text-[#D4AF37]">{p.price} {p.currency}</span>
                              <span className="text-[8px] font-mono text-zinc-500">ID: ...{p.id.substring(p.id.length - 8)}</span>
                            </div>
                          </div>

                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: USERS DIRECTORY REGISTRY (Le Registre de l'Élite) */}
              {activeTab === 'users' && (
                <div className="space-y-4">
                  {/* Search field */}
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                      placeholder="Rechercher un membre de StoreHub..."
                      className="w-full bg-[#0A0A0A] border border-[#141414] rounded-2xl pl-12 pr-4 py-3.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#D4AF37] transition-all font-sans"
                    />
                  </div>

                  {/* Users Grid Card style for high luxury look */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredUsers.map(u => (
                      <div key={u.uid} className="p-5 rounded-2xl bg-[#090909] border border-[#141414] hover:border-zinc-800 transition-all flex flex-col justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <img 
                            src={u.photoURL || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80"} 
                            alt={u.displayName} 
                            className="w-11 h-11 rounded-full border border-zinc-800 object-cover shrink-0" 
                          />
                          <div className="min-w-0">
                            <h4 className="text-xs font-semibold text-white truncate">{u.displayName || "Membre StoreHub"}</h4>
                            <p className="text-[10px] text-zinc-500 font-mono truncate mt-0.5">{u.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-[#121212] pt-3 text-[10px] font-mono">
                          <span className="text-zinc-500">Inscrit : <strong className="text-zinc-300 font-medium">{u.createdAt ? new Date(u.createdAt).toLocaleDateString('fr-FR') : 'Non renseignée'}</strong></span>
                          
                          {/* Rich Gradient Badges depending on user rules */}
                          <span className={`px-2.5 py-0.5 rounded text-[8px] font-mono uppercase tracking-widest font-bold ${
                            u.role === UserRole.ADMIN 
                              ? 'bg-gradient-to-r from-red-950/60 to-red-900/20 text-red-400 border border-red-900/40' 
                              : u.role === UserRole.BOUTIQUE 
                                ? 'bg-gradient-to-r from-[#D4AF37]/20 to-[#D4AF37]/5 text-[#D4AF37] border border-[#D4AF37]/30' 
                                : 'bg-gradient-to-r from-zinc-900 to-zinc-950 text-zinc-300 border border-zinc-800'
                          }`}>
                            {u.role === UserRole.ADMIN ? 'Administrateur' : u.role === UserRole.BOUTIQUE ? 'Boutique' : 'Client Élite'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5: KBIS DOCUMENT INSPECTION CHAMBER */}
              {activeTab === 'documents' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* Left: Documents Registre list */}
                    <div className="lg:col-span-5 bg-[#0A0A0A] border border-[#141414] rounded-2xl p-5 space-y-4">
                      <h3 className="font-mono text-xs uppercase tracking-wider font-semibold text-[#D4AF37] border-b border-[#141414] pb-4">
                        Registre des pièces justificatives
                      </h3>
                      
                      <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                        {boutiques.map(b => (
                          <div 
                            key={b.id}
                            onClick={() => setPreviewDoc({
                              boutiqueId: b.id,
                              boutiqueName: b.name,
                              docName: b.verificationDocName || 'KBIS_Registre_Commerce.pdf',
                              docType: 'KBIS',
                              status: b.isSuspended ? 'suspended' : b.isVerified ? 'verified' : 'pending'
                            })}
                            className={`p-4 border rounded-xl cursor-pointer transition-all flex items-center justify-between hover:scale-[1.01] ${
                              previewDoc?.boutiqueName === b.name 
                                ? 'border-[#D4AF37] bg-[#D4AF37]/5' 
                                : 'border-[#141414] hover:border-zinc-800 bg-zinc-950/40'
                            }`}
                          >
                            <div className="flex items-center gap-3.5">
                              <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center text-red-500 border border-zinc-800">
                                <FileText className="w-5.5 h-5.5" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-white truncate">{b.name}</p>
                                <p className="text-[9px] text-zinc-500 font-mono mt-0.5 truncate">{b.verificationDocName || 'KBIS_Enregistrement.pdf'}</p>
                              </div>
                            </div>

                            <span className={`px-2 py-0.5 rounded text-[8px] font-mono uppercase tracking-wider font-bold shrink-0 ${
                              b.isSuspended 
                                ? 'bg-red-950/40 text-red-400 border border-red-900/30' 
                                : b.isVerified 
                                  ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-900/30' 
                                  : 'bg-amber-950/30 text-amber-400 border border-amber-900/30 animate-pulse'
                            }`}>
                              {b.isSuspended ? 'Suspendue' : b.isVerified ? 'Certifié' : 'À valider'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right: Modern Holographic Document Viewer details */}
                    <div className="lg:col-span-7 bg-[#0A0A0A] border border-[#141414] rounded-2xl p-6 flex flex-col justify-between">
                      {previewDoc ? (
                        <div className="space-y-6 flex-grow flex flex-col justify-between">
                          <div className="space-y-4">
                            <div className="flex justify-between items-start border-b border-[#141414] pb-4">
                              <div>
                                <p className="font-mono text-[8px] uppercase tracking-wider text-zinc-500">Boutique émettrice</p>
                                <h3 className="serif-title text-xl text-white font-medium tracking-wide mt-0.5">{previewDoc.boutiqueName}</h3>
                              </div>
                              <span className={`px-2.5 py-1 rounded text-[9px] font-mono uppercase tracking-widest font-bold ${
                                previewDoc.status === 'verified' 
                                  ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40' 
                                  : previewDoc.status === 'suspended'
                                    ? 'bg-red-950/40 text-red-400 border border-red-900/40'
                                    : 'bg-amber-950/40 text-amber-400 border border-amber-900/40 animate-pulse'
                              }`}>
                                {previewDoc.status === 'verified' ? 'Certifié' : previewDoc.status === 'suspended' ? 'Suspendu' : 'Validation requise'}
                              </span>
                            </div>

                            {/* Automated Document Reader mock layout */}
                            <div className="bg-[#0D0D0D] border border-[#161616] rounded-2xl p-8 text-center space-y-4 relative overflow-hidden group min-h-[240px] flex flex-col items-center justify-center shadow-inner">
                              
                              <div className="w-16 h-20 bg-red-950/15 rounded-lg flex flex-col items-center justify-center text-red-400 border border-red-900/40 shadow-md">
                                <FileText className="w-8 h-8" />
                                <span className="font-mono text-[8px] font-bold mt-1.5 uppercase">PDF</span>
                              </div>
                              
                              <div className="space-y-1">
                                <p className="text-xs font-semibold text-white font-mono">{previewDoc.docName}</p>
                                <p className="text-[10px] text-zinc-500 font-mono">Justificatif Légitime d'Immatriculation au RCS · 1.4 Mo</p>
                              </div>

                              <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-xl max-w-md text-left">
                                <div className="flex gap-2.5">
                                  <ShieldCheck className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                                  <div className="space-y-1">
                                    <p className="text-[10px] font-mono font-bold text-zinc-300">CONTRÔLE INTÈGRE STOREHUB SECURE</p>
                                    <p className="text-[10px] text-zinc-400 font-light leading-relaxed">
                                      Le document fourni atteste de l'existence juridique et commerciale réelle de la boutique partenaire. Veuillez vérifier la conformité avec la raison sociale.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons styled like elite dashboard triggers */}
                          <div className="pt-6 border-t border-[#141414] flex gap-3 justify-end flex-wrap">
                            {previewDoc.status !== 'verified' && (
                              <button
                                onClick={() => handleUpdateBoutique(previewDoc.boutiqueId, { isVerified: true, isSuspended: false })}
                                className="px-5 py-2.5 bg-[#D4AF37] hover:bg-white text-black rounded-lg text-xs font-mono font-bold tracking-widest uppercase transition-all duration-300 flex items-center gap-1.5 cursor-pointer shadow-lg shadow-[#D4AF37]/10"
                              >
                                <Check className="w-4 h-4 stroke-[3]" />
                                <span>Approuver & Certifier</span>
                              </button>
                            )}

                            {previewDoc.status === 'verified' && (
                              <button
                                onClick={() => handleUpdateBoutique(previewDoc.boutiqueId, { isVerified: false })}
                                className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-lg text-xs font-mono font-semibold tracking-widest uppercase transition-all duration-300 flex items-center gap-1.5 text-zinc-300 cursor-pointer"
                              >
                                <RotateCcw className="w-4 h-4" />
                                <span>Révoquer la certification</span>
                              </button>
                            )}

                            {previewDoc.status !== 'suspended' && (
                              <button
                                onClick={() => handleUpdateBoutique(previewDoc.boutiqueId, { isSuspended: true, isVerified: false })}
                                className="px-5 py-2.5 bg-red-950/30 hover:bg-red-950/60 border border-red-900 text-red-400 rounded-lg text-xs font-mono font-semibold tracking-widest uppercase transition-all duration-300 flex items-center gap-1.5 cursor-pointer"
                              >
                                <Lock className="w-4 h-4" />
                                <span>Suspendre Boutique</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex-grow flex flex-col items-center justify-center text-center space-y-4 py-24">
                          <FileText className="w-14 h-14 text-zinc-700 stroke-[1]" />
                          <div>
                            <h4 className="serif-title text-base text-zinc-300 font-light">Inspecteur de Documents Inactif</h4>
                            <p className="text-xs text-zinc-500 font-light mt-1.5 max-w-sm mx-auto leading-relaxed">
                              Sélectionnez une boutique de créateur dans le registre latéral gauche pour charger et valider ses pièces justificatives officielles de commerce.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      </main>

      {/* FLOATING OPERATOR BADGE - PINNED TO THE BOTTOM ANGLE (l'appareil photo / l'administrateur tout en bas) */}
      <div className="absolute bottom-6 right-6 z-30 flex items-center gap-3.5 bg-[#090909]/95 backdrop-blur-md border border-[#1C1C1C] hover:border-[#D4AF37]/40 rounded-2xl p-3 pl-4 pr-5 shadow-[0_12px_40px_rgba(0,0,0,0.85)] hover:shadow-[0_12px_45px_rgba(212,175,55,0.08)] transition-all duration-300">
        {/* Admin Photo / Avatar */}
        <button 
          onClick={() => { 
            setTempAvatarUrl(adminAvatar); 
            setTempAdminName(adminName);
            setTempAdminRole(adminRole);
            setShowAvatarModal(true); 
          }}
          className="relative shrink-0 group focus:outline-none cursor-pointer"
          title="Changer le profil"
        >
          <img 
            src={adminAvatar} 
            alt="Admin avatar" 
            className="w-10 h-10 rounded-full object-cover border border-[#D4AF37]/50 shadow-inner group-hover:border-[#D4AF37] transition-all duration-300" 
          />
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-[#0A0A0A]" />
          <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
            <Sparkles className="w-4 h-4 text-[#D4AF37] animate-pulse" />
          </div>
        </button>
        
        {/* Admin Name & status */}
        <div className="text-left">
          <p className="text-xs font-semibold text-white tracking-wide">{adminName}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1 h-1 rounded-full bg-[#D4AF37] animate-pulse" />
            <p className="text-[8px] text-[#D4AF37] font-mono tracking-widest uppercase">{adminRole}</p>
          </div>
        </div>

        {/* Logout action */}
        <div className="border-l border-[#1A1A1A] pl-3.5 ml-1 flex flex-col justify-center text-right">
          <button
            onClick={onLogout}
            className="text-[9px] font-mono tracking-widest text-zinc-400 hover:text-red-400 font-bold uppercase transition-all duration-300 hover:scale-[1.03] cursor-pointer"
          >
            DECONNEXION
          </button>
          <span className="text-[7px] text-zinc-600 font-mono tracking-tight uppercase mt-0.5">ZONE_HQ</span>
        </div>
      </div>

      {/* LUXURY ADMIN AVATAR CUSTOMIZATION DIALOG */}
      {showAvatarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0C0C0C] border border-[#202020] hover:border-[#D4AF37]/30 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span className="font-mono text-[8px] tracking-[0.25em] text-[#D4AF37] font-bold">CONFIGURATION DU PROFIL</span>
                </div>
                <h3 className="serif-title text-xl font-light text-white">Photo de Profil</h3>
              </div>
              <button 
                onClick={() => setShowAvatarModal(false)}
                className="text-zinc-500 hover:text-white p-1.5 rounded-lg hover:bg-zinc-950 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current & Proposed Preview */}
            <div className="flex flex-col items-center justify-center py-4 bg-zinc-950/40 rounded-xl border border-zinc-900 mb-6">
              <div className="relative">
                <img 
                  src={tempAvatarUrl || adminAvatar} 
                  alt="Avatar preview" 
                  className="w-20 h-20 rounded-full object-cover border-2 border-[#D4AF37] shadow-xl"
                  onError={(e) => {
                    // Fallback to initial avatar if invalid url
                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=80&q=80";
                  }}
                />
                <span className="absolute bottom-1 right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0C0C0C]" />
              </div>
              <p className="text-[10px] text-zinc-400 font-mono mt-3 uppercase tracking-wider">Aperçu en temps réel</p>
            </div>

            {/* Nom & Poste Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-zinc-400 font-mono text-[9px] tracking-widest uppercase mb-2">NOM DE L'ADMINISTRATEUR</label>
                <input 
                  type="text" 
                  value={tempAdminName}
                  onChange={(e) => setTempAdminName(e.target.value)}
                  placeholder="Ex: Admin StoreHub"
                  className="w-full bg-zinc-950/80 border border-zinc-800 hover:border-zinc-700 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-600 transition-all font-sans"
                />
              </div>
              <div>
                <label className="block text-zinc-400 font-mono text-[9px] tracking-widest uppercase mb-2">POSTE / RÔLE</label>
                <input 
                  type="text" 
                  value={tempAdminRole}
                  onChange={(e) => setTempAdminRole(e.target.value)}
                  placeholder="Ex: Souverain Suprême"
                  className="w-full bg-zinc-950/80 border border-zinc-800 hover:border-zinc-700 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-600 transition-all font-sans"
                />
              </div>
            </div>

            {/* Predefined Luxury Avatars Options */}
            <div className="mb-6">
              <label className="block text-zinc-400 font-mono text-[9px] tracking-widest uppercase mb-3">SÉLECTIONNER UN MODÈLE DE PHOTO</label>
              <div className="grid grid-cols-5 gap-3">
                {[
                  { name: "Gentleman", url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=120&q=80" },
                  { name: "Sartorial", url: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=120&q=80" },
                  { name: "Imperatrice", url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80" },
                  { name: "La Couronne", url: "https://images.unsplash.com/photo-1590502593747-42a996133562?auto=format&fit=crop&w=120&q=80" },
                  { name: "Horlogerie", url: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=120&q=80" }
                ].map((preset, index) => {
                  const isSelected = tempAvatarUrl === preset.url;
                  return (
                    <button
                      key={index}
                      onClick={() => setTempAvatarUrl(preset.url)}
                      className={`relative aspect-square rounded-full overflow-hidden border-2 transition-all cursor-pointer group hover:scale-105 active:scale-95 ${
                        isSelected ? 'border-[#D4AF37] scale-105 shadow-[0_0_8px_rgba(212,175,55,0.4)]' : 'border-zinc-800 hover:border-zinc-600'
                      }`}
                      title={preset.name}
                    >
                      <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Upload from phone / device */}
            <div className="mb-6">
              <label className="block text-zinc-400 font-mono text-[9px] tracking-widest uppercase mb-2">OU IMPORTER DEPUIS LE TÉLÉPHONE / APPAREIL</label>
              <label className="flex items-center justify-center gap-2.5 w-full bg-zinc-950/80 border border-dashed border-zinc-800 hover:border-[#D4AF37]/40 hover:bg-zinc-950 rounded-xl px-4 py-4 text-xs text-zinc-400 hover:text-[#D4AF37] transition-all cursor-pointer font-mono group">
                <Upload className="w-4 h-4 text-zinc-500 group-hover:text-[#D4AF37] transition-colors" />
                <span>SÉLECTIONNER UNE PHOTO</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleAvatarFileChange} 
                  className="hidden" 
                />
              </label>
            </div>

            {/* Custom URL input */}
            <div className="mb-6">
              <label className="block text-zinc-400 font-mono text-[9px] tracking-widest uppercase mb-2">OU SÉISIR L'URL D'UNE IMAGE</label>
              <input 
                type="text" 
                value={tempAvatarUrl}
                onChange={(e) => setTempAvatarUrl(e.target.value)}
                placeholder="Insérer l'URL de votre image (Unsplash, Imgur...)"
                className="w-full bg-zinc-950/80 border border-zinc-800 hover:border-zinc-700 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-600 transition-all font-mono"
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 justify-end mt-8 border-t border-[#1C1C1C] pt-4">
              <button
                type="button"
                onClick={() => setShowAvatarModal(false)}
                className="px-4 py-2.5 rounded-xl border border-zinc-800 hover:bg-zinc-950 hover:text-white text-zinc-400 text-xs font-semibold cursor-pointer transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  if (tempAvatarUrl.trim()) {
                    setAdminAvatar(tempAvatarUrl);
                    localStorage.setItem('admin_avatar_url', tempAvatarUrl);
                  }
                  if (tempAdminName.trim()) {
                    setAdminName(tempAdminName);
                    localStorage.setItem('admin_name', tempAdminName);
                  }
                  if (tempAdminRole.trim()) {
                    setAdminRole(tempAdminRole);
                    localStorage.setItem('admin_role', tempAdminRole);
                  }
                  setShowAvatarModal(false);
                }}
                className="bg-gradient-to-r from-[#D4AF37] to-[#AA8417] hover:from-[#E5C158] hover:to-[#C5A850] text-black px-5 py-2.5 rounded-xl text-xs font-semibold shadow-lg hover:shadow-xl transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                Sauvegarder
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { firebaseAuthenticatedFetch } from '../utils/firebaseAuthenticatedFetch';
import { deleteUploadedStorageFile, getSecureStorageFileUrl } from '../firebase';
import { Boutique, ModerationNote, ModerationNoteSeverity, Product, UserProfile, UserRole } from '../types';
import FennecMascot from './FennecMascot';
import AdminSubscriptionPayments from './AdminSubscriptionPayments';
import { CreditCard } from 'lucide-react';
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
  ArrowLeft,
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
  ChevronDown,
  Maximize2,
  Upload,
  CheckCircle2,
  Play,
  Bot,
  Settings,
  FolderOpen,
  MessageSquare,
  Send
} from 'lucide-react';

interface AdminConsoleProps {
  onLogout: () => void;
  onOpenQA?: () => void;
  onNavigateToStylist?: () => void;
  onBack?: () => void;
}

export default function AdminConsole({ onLogout, onOpenQA, onNavigateToStylist, onBack }: AdminConsoleProps) {
  const [activeTab, setActiveTab] = useState<'stats' | 'boutiques' | 'products' | 'users' | 'documents' | 'audit' | 'payments'>('stats');
  const [boutiques, setBoutiques] = useState<Boutique[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvalBusyUid, setApprovalBusyUid] = useState<string | null>(null);
  const [boutiqueActionBusyId, setBoutiqueActionBusyId] = useState<string | null>(null);

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
  const [featureSearch, setFeatureSearch] = useState('');
  const [moderationBoutiqueSearch, setModerationBoutiqueSearch] = useState('');

  // Catalogue moderation is intentionally hierarchical for large inventories.
  const [selectedModerationBoutiqueId, setSelectedModerationBoutiqueId] = useState<string | null>(null);
  const [selectedModerationCollection, setSelectedModerationCollection] = useState<string | null>(null);
  const [selectedModerationProductId, setSelectedModerationProductId] = useState<string | null>(null);
  const [moderationNotes, setModerationNotes] = useState<ModerationNote[]>([]);
  const [moderationNotesLoading, setModerationNotesLoading] = useState(false);
  const [moderationNotesError, setModerationNotesError] = useState<string | null>(null);
  const [moderationComment, setModerationComment] = useState('');
  const [moderationSeverity, setModerationSeverity] = useState<ModerationNoteSeverity>('action_required');
  const [moderationSubmitting, setModerationSubmitting] = useState(false);
  const [moderationFeedback, setModerationFeedback] = useState<string | null>(null);
  const [moderationVisibleLimit, setModerationVisibleLimit] = useState(12);
  
  // Document preview state
  const [previewDoc, setPreviewDoc] = useState<{
    boutiqueId: string;
    boutiqueName: string;
    docName: string;
    docType: 'KBIS' | 'CNI' | 'Autre';
    status: 'pending' | 'verified' | 'rejected' | 'suspended';
  } | null>(null);
  const [secureDocumentUrl, setSecureDocumentUrl] = useState<string | null>(null);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [selectedClientVerificationUid, setSelectedClientVerificationUid] = useState<string | null>(null);
  const selectedApplicationBoutique = previewDoc
    ? boutiques.find(boutique => boutique.id === previewDoc.boutiqueId)
    : undefined;
  const selectedApplicationOwner = selectedApplicationBoutique
    ? users.find(user => user.uid === selectedApplicationBoutique.ownerId || user.boutiqueId === selectedApplicationBoutique.id)
    : undefined;
  const selectedClientVerification = selectedClientVerificationUid
    ? users.find(user => user.uid === selectedClientVerificationUid && user.role === UserRole.CLIENT)
    : undefined;

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [resB, resP, resU] = await Promise.all([
        firebaseAuthenticatedFetch('/api/admin/boutiques'),
        firebaseAuthenticatedFetch('/api/admin/products'),
        firebaseAuthenticatedFetch('/api/admin/users')
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

  useEffect(() => {
    const refreshApprovalQueue = async () => {
      try {
        const [usersResponse, boutiquesResponse] = await Promise.all([
          firebaseAuthenticatedFetch('/api/admin/users'),
          firebaseAuthenticatedFetch('/api/admin/boutiques'),
        ]);
        if (usersResponse.ok) setUsers(await usersResponse.json());
        if (boutiquesResponse.ok) setBoutiques(await boutiquesResponse.json());
      } catch (refreshError) {
        console.error('Failed to refresh the account approval queue:', refreshError);
      }
    };
    const interval = window.setInterval(refreshApprovalQueue, 15_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab !== 'products' || !selectedModerationBoutiqueId) {
      setModerationNotes([]);
      setModerationNotesError(null);
      return;
    }

    let cancelled = false;
    setModerationNotesLoading(true);
    setModerationNotesError(null);
    firebaseAuthenticatedFetch(`/api/admin/moderation-notes?boutiqueId=${encodeURIComponent(selectedModerationBoutiqueId)}`)
      .then(async response => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || 'Impossible de charger les observations.');
        if (!cancelled) setModerationNotes(Array.isArray(payload) ? payload : []);
      })
      .catch(noteError => {
        if (!cancelled) setModerationNotesError(noteError instanceof Error ? noteError.message : 'Impossible de charger les observations.');
      })
      .finally(() => {
        if (!cancelled) setModerationNotesLoading(false);
      });

    return () => { cancelled = true; };
  }, [activeTab, selectedModerationBoutiqueId]);

  useEffect(() => {
    let cancelled = false;
    const documentPath = selectedClientVerification?.identityDocumentPath || selectedApplicationBoutique?.verificationDocPath;
    setSecureDocumentUrl(null);
    setDocumentError(null);
    if (!documentPath) {
      setDocumentLoading(false);
      return () => { cancelled = true; };
    }

    setDocumentLoading(true);
    getSecureStorageFileUrl(documentPath)
      .then(url => {
        if (!cancelled) setSecureDocumentUrl(url);
      })
      .catch(error => {
        if (!cancelled) {
          console.error('Failed to load the verification document:', error);
          setDocumentError("Le document sécurisé n’a pas pu être chargé.");
        }
      })
      .finally(() => {
        if (!cancelled) setDocumentLoading(false);
      });

    return () => { cancelled = true; };
  }, [selectedApplicationBoutique?.verificationDocPath, selectedClientVerification?.identityDocumentPath]);

  // Update Boutique API
  const handleUpdateBoutique = async (boutiqueId: string, updates: Partial<Boutique>) => {
    if (boutiqueActionBusyId) return;
    setBoutiqueActionBusyId(boutiqueId);
    try {
      const response = await firebaseAuthenticatedFetch(`/api/admin/boutiques/${boutiqueId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const payload = await response.json().catch(() => null) as { error?: string; boutique?: Boutique } | null;
      if (!response.ok || !payload?.boutique) {
        throw new Error(payload?.error || "Échec de la mise à jour de la boutique.");
      }

      const updatedBoutique = payload.boutique;
      setBoutiques(prev => prev.map(b => b.id === boutiqueId ? updatedBoutique : b));

      if (previewDoc && previewDoc.boutiqueId === boutiqueId) {
        setPreviewDoc(prev => prev ? {
          ...prev,
          status: updatedBoutique.isSuspended
            ? 'suspended'
            : updatedBoutique.isVerified
              ? 'verified'
              : updatedBoutique.verificationStatus === 'rejected'
                ? 'rejected'
                : 'pending'
        } : null);
      }
    } catch (err) {
      console.error("Error updating boutique:", err);
      alert(err instanceof Error ? err.message : "Une erreur est survenue lors de la mise à jour.");
    } finally {
      setBoutiqueActionBusyId(null);
    }
  };

  // Delete Boutique API
  const handleDeleteBoutique = async (boutiqueId: string) => {
    if (boutiqueActionBusyId) return;
    const boutique = boutiques.find(item => item.id === boutiqueId);
    if (!window.confirm(`Supprimer définitivement « ${boutique?.name || 'cette boutique'} » ?\n\nLa boutique et ses données associées seront retirées de StoreHub. Cette action est irréversible.`)) {
      return;
    }
    setBoutiqueActionBusyId(boutiqueId);
    try {
      const response = await firebaseAuthenticatedFetch(`/api/admin/boutiques/${boutiqueId}`, {
        method: 'DELETE'
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error || "Échec de la suppression de la boutique.");
      }

      setBoutiques(prev => prev.filter(b => b.id !== boutiqueId));
      setProducts(prev => prev.filter(product => product.boutiqueId !== boutiqueId));
      if (previewDoc?.boutiqueId === boutiqueId) setPreviewDoc(null);
      if (selectedModerationBoutiqueId === boutiqueId) {
        setSelectedModerationBoutiqueId(null);
        setSelectedModerationCollection(null);
        setSelectedModerationProductId(null);
      }
      alert("Boutique supprimée avec succès.");
    } catch (err) {
      console.error("Error deleting boutique:", err);
      alert(err instanceof Error ? err.message : "Une erreur est survenue pendant la suppression.");
    } finally {
      setBoutiqueActionBusyId(null);
    }
  };

  // Delete Product API
  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm("Voulez-vous vraiment retirer cet article du catalogue de StoreHub ?")) {
      return;
    }
    try {
      const response = await firebaseAuthenticatedFetch(`/api/admin/products/${productId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setProducts(prev => prev.filter(p => p.id !== productId));
        if (selectedModerationProductId === productId) setSelectedModerationProductId(null);
        alert("Produit supprimé du catalogue.");
      } else {
        alert("Échec de la suppression.");
      }
    } catch (err) {
      console.error("Error deleting product:", err);
    }
  };

  const handleAccountDecision = async (user: UserProfile, status: 'approved' | 'rejected') => {
    let reason = '';
    if (status === 'rejected') {
      const enteredReason = window.prompt('Indiquez le motif du refus. Il sera affiché à l’utilisateur :', 'Informations incomplètes');
      if (enteredReason === null) return;
      reason = enteredReason.trim();
      if (reason.length < 3) {
        alert('Le motif doit contenir au moins 3 caractères.');
        return;
      }
    }

    setApprovalBusyUid(user.uid);
    try {
      const response = await firebaseAuthenticatedFetch(`/api/admin/users/${encodeURIComponent(user.uid)}/approval`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reason }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'La décision n’a pas pu être enregistrée.');
      setUsers(current => current.map(item => item.uid === user.uid ? payload.user : item));
      if (payload.boutique) {
        setBoutiques(current => current.map(item => item.id === payload.boutique.id ? payload.boutique : item));
        setPreviewDoc(current => current?.boutiqueId === payload.boutique.id
          ? { ...current, status: status === 'approved' ? 'verified' : 'rejected' }
          : current);
      }
      if (user.role === UserRole.CLIENT) {
        setSelectedClientVerificationUid(null);
        setSecureDocumentUrl(null);
        setActiveTab('users');
      }
      alert(user.role === UserRole.CLIENT
        ? 'La pièce d’identité du client est confirmée.'
        : status === 'approved' ? 'La boutique est maintenant active.' : 'La demande boutique a été refusée.');
    } catch (decisionError: any) {
      alert(decisionError?.message || 'Impossible d’enregistrer cette décision.');
    } finally {
      setApprovalBusyUid(null);
    }
  };

  const handleDeleteClientAccount = async (user: UserProfile) => {
    if (!window.confirm(`Supprimer définitivement le compte de « ${user.displayName || user.email} » ?\n\nLe profil et l’accès Firebase seront supprimés. Cette action est irréversible.`)) return;
    setApprovalBusyUid(user.uid);
    try {
      const response = await firebaseAuthenticatedFetch(`/api/admin/users/${encodeURIComponent(user.uid)}`, { method: 'DELETE' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Le compte client n’a pas pu être supprimé.');
      if (payload?.identityDocumentPath) {
        await deleteUploadedStorageFile(payload.identityDocumentPath).catch(error => {
          console.error('Le compte a été supprimé, mais le fichier d’identité n’a pas pu être nettoyé:', error);
        });
      }
      setUsers(current => current.filter(item => item.uid !== user.uid));
      setSelectedClientVerificationUid(null);
      setSecureDocumentUrl(null);
      setActiveTab('users');
      alert('Le compte client a été supprimé.');
    } catch (deleteError: any) {
      alert(deleteError?.message || 'Impossible de supprimer le compte client.');
    } finally {
      setApprovalBusyUid(null);
    }
  };

  const handleSubmitModerationNote = async () => {
    const selectedProduct = products.find(product => product.id === selectedModerationProductId);
    const text = moderationComment.trim();
    setModerationFeedback(null);
    setModerationNotesError(null);
    if (!selectedProduct || text.length < 3 || text.length > 1000) {
      setModerationNotesError('Écrivez un commentaire de 3 à 1000 caractères.');
      return;
    }

    setModerationSubmitting(true);
    try {
      const response = await firebaseAuthenticatedFetch('/api/admin/moderation-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: selectedProduct.id, text, severity: moderationSeverity }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Le commentaire n’a pas pu être envoyé.');
      setModerationNotes(current => [payload as ModerationNote, ...current]);
      setModerationComment('');
      setModerationFeedback('Commentaire envoyé au gérant.');
    } catch (submitError) {
      setModerationNotesError(submitError instanceof Error ? submitError.message : 'Le commentaire n’a pas pu être envoyé.');
    } finally {
      setModerationSubmitting(false);
    }
  };

  const openModerationBoutique = (boutiqueId: string) => {
    setSelectedModerationBoutiqueId(boutiqueId);
    setSelectedModerationCollection(null);
    setSelectedModerationProductId(null);
    setProductSearch('');
    setModerationFeedback(null);
    setModerationVisibleLimit(12);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openModerationCollection = (collectionName: string) => {
    setSelectedModerationCollection(collectionName);
    setSelectedModerationProductId(null);
    setProductSearch('');
    setModerationFeedback(null);
    setModerationVisibleLimit(12);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openModerationProduct = (productId: string) => {
    setSelectedModerationProductId(productId);
    setModerationComment('');
    setModerationFeedback(null);
    setModerationNotesError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openBoutiqueDossier = (boutique: Boutique) => {
    setSelectedClientVerificationUid(null);
    setPreviewDoc({
      boutiqueId: boutique.id,
      boutiqueName: boutique.name,
      docName: boutique.verificationDocName || 'Document de vérification',
      docType: 'KBIS',
      status: boutique.isSuspended
        ? 'suspended'
        : boutique.isVerified
          ? 'verified'
          : boutique.verificationStatus === 'rejected'
            ? 'rejected'
            : 'pending',
    });
    setActiveTab('documents');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openClientIdentityDossier = (user: UserProfile) => {
    setPreviewDoc(null);
    setSelectedClientVerificationUid(user.uid);
    setActiveTab('documents');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAdminBack = () => {
    if (activeTab === 'products') {
      if (selectedModerationProductId) {
        setSelectedModerationProductId(null);
        setModerationFeedback(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (selectedModerationCollection) {
        setSelectedModerationCollection(null);
        setProductSearch('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (selectedModerationBoutiqueId) {
        setSelectedModerationBoutiqueId(null);
        setModerationBoutiqueSearch('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }
    if (activeTab !== 'stats') {
      setActiveTab('stats');
      setPreviewDoc(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    onBack?.();
  };

  // Calculations for Stats
  const totalBoutiquesCount = boutiques.length;
  const totalProductsCount = products.length;
  const pendingBoutiqueAccounts = users
    .filter(user => user.role === UserRole.BOUTIQUE
      && user.accountStatus === 'pending'
      && boutiques.some(boutique => boutique.id === user.boutiqueId || boutique.ownerId === user.uid))
    .sort((a, b) => new Date(b.approvalSubmittedAt || b.createdAt).getTime() - new Date(a.approvalSubmittedAt || a.createdAt).getTime());
  const pendingClientIdentities = users
    .filter(user => user.role === UserRole.CLIENT && user.identityVerificationStatus === 'pending' && Boolean(user.identityDocumentPath))
    .sort((a, b) => new Date(b.identitySubmittedAt || b.createdAt).getTime() - new Date(a.identitySubmittedAt || a.createdAt).getTime());
  const pendingAccounts = [...pendingClientIdentities, ...pendingBoutiqueAccounts]
    .sort((a, b) => new Date(b.identitySubmittedAt || b.approvalSubmittedAt || b.createdAt).getTime() - new Date(a.identitySubmittedAt || a.approvalSubmittedAt || a.createdAt).getTime());
  const pendingAccountCount = pendingAccounts.length;
  const pendingValidationCount = pendingAccountCount;
  const verifiedBoutiquesCount = boutiques.filter(b => b.isVerified && !b.isSuspended).length;
  const suspendedBoutiquesCount = boutiques.filter(b => b.isSuspended).length;
  const recentActivities = [
    ...boutiques.map(boutique => {
      const status = boutique.isSuspended
        ? 'warning'
        : boutique.isVerified
          ? 'success'
          : boutique.verificationStatus === 'rejected'
            ? 'warning'
            : 'info';
      const text = boutique.isSuspended
        ? `Boutique suspendue : ${boutique.name}`
        : boutique.isVerified
          ? `Boutique approuvée : ${boutique.name}`
          : boutique.verificationStatus === 'rejected'
            ? `Demande refusée : ${boutique.name}`
            : `Demande d’ouverture reçue : ${boutique.name}`;
      return {
        id: `boutique-${boutique.id}`,
        timestamp: boutique.verificationReviewedAt || boutique.verificationSubmittedAt || boutique.updatedAt || boutique.createdAt,
        text,
        status,
      };
    }),
    ...users
      .filter(profile => profile.role === UserRole.CLIENT)
      .map(profile => ({
        id: `client-${profile.uid}`,
        timestamp: profile.createdAt,
        text: `Compte client créé : ${profile.displayName || profile.email}`,
        status: 'info',
      })),
    ...products.map(product => ({
      id: `product-${product.id}`,
      timestamp: product.createdAt,
      text: `Article ajouté : ${product.name} par ${product.boutiqueName}`,
      status: 'success',
    })),
  ]
    .sort((a, b) => (Date.parse(b.timestamp) || 0) - (Date.parse(a.timestamp) || 0))
    .slice(0, 50)
    .map(activity => ({
      ...activity,
      time: new Date(activity.timestamp).toLocaleString('fr-FR'),
    }));

  // Filter Boutique lists
  const filteredBoutiques = boutiques.filter(b => {
    const query = boutiqueSearch.toLowerCase();
    return b.name.toLowerCase().includes(query) || b.slug.toLowerCase().includes(query) || b.id.toLowerCase().includes(query);
  });

  const selectedModerationBoutique = boutiques.find(boutique => boutique.id === selectedModerationBoutiqueId);
  const selectedModerationProduct = products.find(product => product.id === selectedModerationProductId);
  const moderationBoutiqueProducts = selectedModerationBoutiqueId
    ? products.filter(product => product.boutiqueId === selectedModerationBoutiqueId)
    : [];
  const moderationCatalogueName = (product: Product) => (
    product.collection?.trim() || product.category?.trim() || 'Sans catalogue'
  );
  const moderationCatalogues = Array.from(
    moderationBoutiqueProducts.reduce<Map<string, Product[]>>((catalogues, product) => {
      const name = moderationCatalogueName(product);
      catalogues.set(name, [...(catalogues.get(name) || []), product]);
      return catalogues;
    }, new Map()),
  )
    .map(([name, catalogueProducts]) => ({ name, products: catalogueProducts }))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  const selectedCatalogueProducts = selectedModerationCollection
    ? moderationBoutiqueProducts.filter(product => moderationCatalogueName(product) === selectedModerationCollection)
    : [];
  const normalizedProductSearch = productSearch.trim().toLocaleLowerCase('fr');
  const searchedCatalogueProducts = selectedCatalogueProducts.filter(product => (
    !normalizedProductSearch
    || product.name.toLocaleLowerCase('fr').includes(normalizedProductSearch)
    || product.category.toLocaleLowerCase('fr').includes(normalizedProductSearch)
    || (product.sku || '').toLocaleLowerCase('fr').includes(normalizedProductSearch)
  ));
  const visibleModerationProducts = searchedCatalogueProducts.slice(0, moderationVisibleLimit);
  const filteredModerationBoutiques = boutiques.filter(boutique => {
    const query = moderationBoutiqueSearch.trim().toLocaleLowerCase('fr');
    return !query
      || boutique.name.toLocaleLowerCase('fr').includes(query)
      || boutique.location?.city?.toLocaleLowerCase('fr').includes(query)
      || boutique.slug.toLocaleLowerCase('fr').includes(query);
  });

  // Filter Users list
  const filteredUsers = users
    .filter(u => {
      const query = userSearch.toLowerCase();
      return ((u.role === UserRole.BOUTIQUE
        && u.accountStatus === 'pending'
        && boutiques.some(boutique => boutique.id === u.boutiqueId || boutique.ownerId === u.uid))
        || (u.role === UserRole.CLIENT && u.identityVerificationStatus === 'pending' && Boolean(u.identityDocumentPath)))
        && (u.displayName.toLowerCase().includes(query) || u.email.toLowerCase().includes(query));
    })
    .sort((a, b) => {
      const aPending = a.accountStatus === 'pending' ? 1 : 0;
      const bPending = b.accountStatus === 'pending' ? 1 : 0;
      if (aPending !== bPending) return bPending - aPending;
      return new Date(b.approvalSubmittedAt || b.createdAt).getTime() - new Date(a.approvalSubmittedAt || a.createdAt).getTime();
    });

  // Shortcuts & Feature Cards Catalog
  const adminFeatures = [
    {
      id: 'boutiques',
      title: 'Gestion des Boutiques',
      category: 'Partenaires & Marques',
      description: 'Supervisez l’annuaire des créateurs, attribuez la certification officielle ou suspendez des boutiques.',
      icon: Building2,
      badge: `${totalBoutiquesCount} Boutiques`,
      badgeStyle: 'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/30',
      action: () => setActiveTab('boutiques')
    },
    {
      id: 'users',
      title: 'Vérifications d’identité',
      category: 'Validation des ouvertures',
      description: 'Examinez les pièces des clients et les dossiers transmis par les boutiques.',
      icon: Users,
      badge: pendingAccountCount > 0 ? `${pendingAccountCount} À confirmer` : 'Aucune attente',
      badgeStyle: pendingAccountCount > 0 ? 'bg-amber-950/50 text-amber-400 border-amber-800/50 animate-pulse' : 'bg-blue-950/40 text-blue-400 border-blue-800/40',
      action: () => setActiveTab('users')
    },
    {
      id: 'products',
      title: 'Modération du Catalogue',
      category: 'Gestion Articles',
      description: 'Cabinet de contrôle des vêtements, filtrez par boutique et modérez les pièces non-conformes.',
      icon: ShoppingBag,
      badge: `${totalProductsCount} Articles`,
      badgeStyle: 'bg-zinc-900 text-zinc-300 border-zinc-800',
      action: () => {
        setSelectedModerationBoutiqueId(null);
        setSelectedModerationCollection(null);
        setSelectedModerationProductId(null);
        setActiveTab('products');
      }
    },
    {
      id: 'payments',
      title: 'Paiements & Abonnements',
      category: 'Facturation Boutiques',
      description: 'Validez les virements des boutiques et prolongez leurs abonnements mensuels.',
      icon: CreditCard,
      badge: 'Virements & CIB',
      badgeStyle: 'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/30',
      action: () => setActiveTab('payments')
    },
    {
      id: 'qa-agents',
      title: 'Vérification Agents IA',
      category: 'Audit Technique',
      description: 'Exécutez la suite d’audit automatique pour évaluer la stabilité et la sécurité des 5 agents IA.',
      icon: ShieldCheck,
      badge: '5 Agents Prêts',
      badgeStyle: 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40',
      action: () => onOpenQA?.()
    },
    {
      id: 'reports-pdf',
      title: 'Rapports PDF Officiels',
      category: 'Rapports d’Inspection',
      description: 'Générez et téléchargez immédiatement les 5 rapports d’inspection PDF certifiant l’application.',
      icon: FileText,
      badge: '5 PDF Certifiés',
      badgeStyle: 'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/30',
      action: () => onOpenQA?.()
    },
    {
      id: 'audit-log',
      title: 'Journal d’Audit & Sécurité',
      category: 'Surveillance Temps Réel',
      description: 'Historique des connexions, modifications du catalogue, approbations et événements de sécurité.',
      icon: ShieldAlert,
      badge: '100% SÉCURISÉ',
      badgeStyle: 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40',
      action: () => setActiveTab('audit')
    },
    {
      id: 'system-settings',
      title: 'Paramètres Système & Profil',
      category: 'Configuration Admin',
      description: 'Personnalisez l’identité de l’administrateur : modifiez la photo de profil, le rôle et le nom affiché.',
      icon: SlidersHorizontal,
      badge: adminRole || 'Souverain',
      badgeStyle: 'bg-zinc-900 text-zinc-300 border-zinc-800',
      action: () => setShowAvatarModal(true)
    }
  ];

  const filteredFeatures = adminFeatures.filter(f => {
    const q = featureSearch.toLowerCase();
    return f.title.toLowerCase().includes(q) || f.category.toLowerCase().includes(q) || f.description.toLowerCase().includes(q);
  });

  return (
    <div className="flex-grow w-full max-w-full bg-[#070707] text-white h-full flex flex-col relative overflow-x-hidden selection:bg-[#D4AF37] selection:text-black">
      
      {/* En-tête volontairement minimal : retour + titre uniquement. */}
      <header className="sticky top-0 border-b border-[#151515] bg-[#0A0A0A]/95 backdrop-blur-md shrink-0 z-40 px-4 sm:px-6 pt-[45px] pb-4 w-full max-w-full">
        <div className="grid min-h-10 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
          {onBack && (
            <button
              onClick={handleAdminBack}
              className="flex items-center gap-2 px-3.5 py-2 bg-[#0F0F0F] hover:bg-zinc-800 active:scale-95 border border-[#222222] hover:border-[#D4AF37]/60 text-zinc-300 hover:text-[#D4AF37] rounded-xl text-xs font-mono font-bold tracking-wider uppercase transition-all shadow-md group cursor-pointer shrink-0"
              title="Retour à l'application"
            >
              <ArrowLeft className="w-4 h-4 text-[#D4AF37] group-hover:-translate-x-1 transition-transform shrink-0" />
              <span>Retour</span>
            </button>
          )}

          <h1 className="serif-title min-w-0 truncate text-center text-lg font-light tracking-wide text-white sm:text-xl">
            Store<span className="font-semibold text-[#D4AF37]">Hub</span><span className="ml-1 hidden font-mono text-[9px] uppercase tracking-widest text-zinc-500 min-[390px]:inline">HQ</span>
          </h1>

          <button
            type="button"
            onClick={() => {
              if (onNavigateToStylist) onNavigateToStylist();
              else onOpenQA?.();
            }}
            className="flex min-h-10 items-center gap-1.5 rounded-xl border border-[#D4AF37]/45 bg-[#0F0F0F] px-2 py-2 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[#D4AF37] shadow-md transition-all hover:border-[#D4AF37] hover:bg-[#17130A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/50 active:scale-95 sm:px-2.5 sm:text-[10px]"
            title="Ouvrir FENNCO IA"
            aria-label="Ouvrir FENNCO IA"
          >
            <FennecMascot size="sm" showGlow={false} className="-my-1" />
            <span>FENNCO IA</span>
          </button>
        </div>
      </header>

      {/* MAIN WORKSPACE WRAPPER */}
      <main className="flex-grow flex flex-col overflow-x-hidden relative w-full max-w-full">

        {/* Workspace body content */}
        <div className="flex-grow p-4 sm:p-6 pb-24 md:pb-8 w-full max-w-full">
          
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
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-[#0F0F0F] via-[#0D0D0D] to-[#080808] border border-[#1A1A1A] relative overflow-hidden flex flex-col items-center text-center gap-5">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-b from-[#D4AF37]/5 to-transparent rounded-full blur-3xl pointer-events-none" />
                    <div className="relative z-10 w-full max-w-xl flex flex-col items-center">
                      <h2 className="serif-title text-xl md:text-2xl font-light text-white leading-tight text-center">
                        Bienvenue dans le <span className="text-[#D4AF37] animate-pulse drop-shadow-[0_0_8px_rgba(212,175,55,0.55)]">Quartier Général</span> StoreHub
                      </h2>
                      <p dir="rtl" className="text-zinc-400 text-xs mt-3 font-light leading-relaxed w-full text-right">
                        Régulez le catalogue général, examinez les demandes d’ouverture de boutique et supervisez les comptes actifs.
                      </p>
                      <button
                        onClick={fetchAllData}
                        className="mt-5 w-full max-w-[220px] px-5 py-3 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/15 border border-[#D4AF37]/40 hover:border-[#D4AF37]/70 text-[#D4AF37] rounded-lg text-[9px] font-mono tracking-widest uppercase cursor-pointer transition-all"
                      >
                        Synchroniser les données
                      </button>
                    </div>
                  </div>

                  {/* Real-time account opening requests */}
                  <section className={`rounded-2xl border p-5 sm:p-6 ${
                    pendingAccountCount > 0
                      ? 'bg-amber-950/10 border-amber-700/35 shadow-[0_0_28px_rgba(212,175,55,0.08)]'
                      : 'bg-[#0A0A0A] border-[#161616]'
                  }`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${pendingAccountCount > 0 ? 'bg-[#D4AF37]/10 border-[#D4AF37]/40 text-[#D4AF37]' : 'bg-emerald-950/20 border-emerald-800/30 text-emerald-400'}`}>
                          {pendingAccountCount > 0 ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#D4AF37]">Demandes d’ouverture</p>
                          <h3 className="serif-title text-lg text-white mt-1">
                            {pendingAccountCount > 0 ? `${pendingAccountCount} compte${pendingAccountCount > 1 ? 's' : ''} à vérifier` : 'Aucune demande en attente'}
                          </h3>
                          <p className="text-[11px] text-zinc-400 mt-1">La liste se met à jour automatiquement toutes les 15 secondes.</p>
                        </div>
                      </div>
                      {pendingAccountCount > 0 && (
                        <button onClick={() => setActiveTab('users')} className="px-3 py-2 rounded-lg bg-[#D4AF37] text-black text-[9px] font-mono font-bold uppercase tracking-wider shrink-0">
                          Examiner
                        </button>
                      )}
                    </div>

                    {pendingAccountCount > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
                        {pendingAccounts.slice(0, 4).map(account => {
                          if (account.role === UserRole.CLIENT) {
                            return (
                              <button
                                key={account.uid}
                                onClick={() => openClientIdentityDossier(account)}
                                className="flex items-center gap-3 rounded-xl bg-black/25 border border-[#D4AF37]/15 p-3.5 text-left hover:border-[#D4AF37]/45 active:scale-[0.98] transition-all"
                              >
                                <img src={account.photoURL} alt={account.displayName} className="h-11 w-11 rounded-full object-cover border border-[#D4AF37]/25" />
                                <span className="min-w-0">
                                  <span className="block truncate text-xs text-white font-semibold">{account.displayName || account.email}</span>
                                  <span className="mt-1 block text-[9px] font-mono text-amber-400">IDENTITÉ CLIENT À VÉRIFIER</span>
                                </span>
                              </button>
                            );
                          }
                          const boutique = boutiques.find(item => item.id === account.boutiqueId || item.ownerId === account.uid);
                          if (!boutique) return null;
                          return (
                            <button
                              key={account.uid}
                              onClick={() => openBoutiqueDossier(boutique)}
                              className="flex items-center gap-3 rounded-xl bg-black/25 border border-[#D4AF37]/15 p-3.5 text-left hover:border-[#D4AF37]/45 active:scale-[0.98] transition-all"
                            >
                              <img src={boutique.logo || account.photoURL} alt={boutique.name} className="h-11 w-11 rounded-full object-cover border border-[#D4AF37]/25" />
                              <span className="min-w-0 truncate text-xs text-white font-semibold">{boutique.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </section>

                  {/* RACCOURCIS RAPIDES - CENTRE DE COMMANDEMENT ADMIN */}
                  <div className="bg-[#0A0A0A] border border-[#161616] rounded-2xl p-5 sm:p-6 space-y-5 shadow-2xl">
                    {/* Section Header with Search Bar */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#141414] pb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#D4AF37] font-bold">ACCÈS RAPIDE EN 1 CLIC</span>
                        </div>
                        <h3 className="serif-title text-lg sm:text-xl font-light text-white">
                          Centre de Commandement <span className="text-[#D4AF37] font-normal">&amp; Raccourcis Admin</span>
                        </h3>
                        <p className="text-xs text-zinc-400 font-light mt-0.5">
                          Toutes les fonctionnalités du système sont regroupées ci-dessous sous forme de boutons d'accès direct.
                        </p>
                      </div>

                      {/* Feature Search Input */}
                      <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-3.5 h-3.5" />
                        <input
                          type="text"
                          value={featureSearch}
                          onChange={(e) => setFeatureSearch(e.target.value)}
                          placeholder="Rechercher une fonctionnalité..."
                          className="w-full bg-[#101010] border border-[#1C1C1C] focus:border-[#D4AF37] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 outline-none transition-all font-sans"
                        />
                        {featureSearch && (
                          <button 
                            onClick={() => setFeatureSearch('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs cursor-pointer"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Feature Shortcut Cards Grid (STRICT MAXIMUM 2 CARDS PER ROW) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {filteredFeatures.map((feat) => {
                        const Icon = feat.icon;
                        return (
                          <button
                            key={feat.id}
                            onClick={feat.action}
                            className="p-4 sm:p-5 bg-gradient-to-b from-[#0E0E0E] to-[#080808] border border-[#181818] hover:border-[#D4AF37]/50 rounded-xl flex flex-col items-center justify-between text-center group hover:bg-zinc-900/40 transition-all duration-300 relative overflow-hidden shadow-md cursor-pointer w-full min-w-0"
                          >
                            {/* Top Row: Category Tag + Badge Centered */}
                            <div className="flex flex-wrap items-center justify-center gap-2 mb-2 w-full text-center">
                              <span className="font-mono text-[8.5px] uppercase tracking-wider text-zinc-500">{feat.category}</span>
                              <span className={`px-2 py-0.5 rounded border text-[8px] font-mono uppercase tracking-wider font-semibold ${feat.badgeStyle}`}>
                                {feat.badge}
                              </span>
                            </div>

                            {/* [ Icône centrée ] */}
                            <div className="w-12 h-12 bg-zinc-900 border border-[#202020] group-hover:border-[#D4AF37]/40 text-[#D4AF37] rounded-xl flex items-center justify-center mx-auto group-hover:scale-105 transition-all duration-300 shadow-inner my-2 shrink-0">
                              <Icon className="w-6 h-6" />
                            </div>

                            {/* [ Titre centré ] */}
                            <h4 className="serif-title text-sm sm:text-base font-semibold text-white group-hover:text-[#D4AF37] transition-colors text-center w-full mb-1.5">
                              {feat.title}
                            </h4>

                            {/* [ Description centrée ] */}
                            <p className="text-xs text-zinc-400 font-light leading-relaxed text-center w-full line-clamp-2 mb-3">
                              {feat.description}
                            </p>

                            {/* Bottom Action Footer Centered */}
                            <div className="w-full border-t border-[#141414] pt-2.5 mt-auto flex items-center justify-center gap-1.5 text-[10px] font-mono text-[#D4AF37] group-hover:text-white transition-colors text-center">
                              <span className="uppercase tracking-widest font-semibold text-[9px]">Accéder au module</span>
                              <ChevronRight className="w-3.5 h-3.5 text-[#D4AF37] group-hover:translate-x-1 transition-transform" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full">
                    {/* Stat 1: Boutiques */}
                    <button 
                      onClick={() => setActiveTab('boutiques')}
                      className="p-4 sm:p-6 bg-gradient-to-b from-[#0F0F0F] to-[#090909] border border-[#161616] rounded-xl flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden group hover:border-[#D4AF37]/40 hover:bg-zinc-900/40 transition-all duration-300 min-h-[140px] sm:min-h-[160px] cursor-pointer w-full h-full min-w-0"
                    >
                      <div className="w-10 h-10 bg-zinc-900/90 rounded-full flex items-center justify-center text-[#D4AF37] border border-[#1C1C1C] mb-2 sm:mb-2.5 group-hover:scale-110 transition-transform shrink-0 mx-auto">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <span className="font-mono text-[9px] sm:text-[10px] uppercase tracking-wider sm:tracking-widest text-zinc-400 font-medium leading-tight text-center truncate w-full">BOUTIQUES ACTIVES</span>
                      <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white my-1 sm:my-1.5 text-center">{totalBoutiquesCount}</span>
                      <div className="flex items-center justify-center gap-1.5 text-[8px] sm:text-[9px] font-mono text-zinc-500 flex-wrap w-full min-w-0 text-center">
                        <span className="text-emerald-500 font-medium">{verifiedBoutiquesCount} Certifiées</span>
                        <span>•</span>
                        <span className="text-amber-500 font-medium">{pendingValidationCount} En attente</span>
                      </div>
                    </button>

                    {/* Stat 2: Articles */}
                    <button 
                      onClick={() => setActiveTab('products')}
                      className="p-4 sm:p-6 bg-gradient-to-b from-[#0F0F0F] to-[#090909] border border-[#161616] rounded-xl flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden group hover:border-[#D4AF37]/40 hover:bg-zinc-900/40 transition-all duration-300 min-h-[140px] sm:min-h-[160px] cursor-pointer w-full h-full min-w-0"
                    >
                      <div className="w-10 h-10 bg-zinc-900/90 rounded-full flex items-center justify-center text-[#D4AF37] border border-[#1C1C1C] mb-2 sm:mb-2.5 group-hover:scale-110 transition-transform shrink-0 mx-auto">
                        <ShoppingBag className="w-5 h-5" />
                      </div>
                      <span className="font-mono text-[9px] sm:text-[10px] uppercase tracking-wider sm:tracking-widest text-zinc-400 font-medium leading-tight text-center truncate w-full">CATALOGUE TOTAL</span>
                      <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white my-1 sm:my-1.5 text-center">{totalProductsCount}</span>
                      <div className="flex items-center justify-center gap-1 text-[8px] sm:text-[9px] font-mono text-zinc-500 text-center truncate w-full">
                        <span className="truncate">Moy. {totalBoutiquesCount > 0 ? (totalProductsCount / totalBoutiquesCount).toFixed(1) : 0} pcs/boutique</span>
                      </div>
                    </button>

                    {/* Stat 3: Clients actifs, sans validation administrative */}
                    <div className="p-4 sm:p-6 bg-gradient-to-b from-[#0F0F0F] to-[#090909] border border-[#161616] rounded-xl flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden min-h-[140px] sm:min-h-[160px] w-full h-full min-w-0">
                      <div className="w-10 h-10 bg-zinc-900/90 rounded-full flex items-center justify-center text-[#D4AF37] border border-[#1C1C1C] mb-2 sm:mb-2.5 shrink-0 mx-auto">
                        <Users className="w-5 h-5" />
                      </div>
                      <span className="font-mono text-[9px] sm:text-[10px] uppercase tracking-wider sm:tracking-widest text-zinc-400 font-medium leading-tight text-center truncate w-full">CLIENTS ACTIFS</span>
                      <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white my-1 sm:my-1.5 text-center">{users.filter(u => u.role === UserRole.CLIENT && u.accountStatus === 'approved').length}</span>
                      <span className="text-[8px] sm:text-[9px] font-mono text-zinc-500 text-center">Accès direct sans validation</span>
                    </div>

                    {/* Stat 4: Pending actions (VJ) */}
                    <button 
                      onClick={() => setActiveTab('documents')}
                      className={`p-4 sm:p-6 rounded-xl flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden group transition-all duration-300 min-h-[140px] sm:min-h-[160px] cursor-pointer w-full h-full min-w-0 border ${
                        pendingValidationCount > 0 
                          ? 'bg-amber-950/15 border-amber-900/40 hover:border-amber-500 text-amber-300' 
                          : 'bg-gradient-to-b from-[#0F0F0F] to-[#090909] border-[#161616] hover:border-[#D4AF37]/40'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2.5 border transition-transform group-hover:scale-110 mx-auto shrink-0 ${
                        pendingValidationCount > 0 ? 'bg-amber-950/40 text-amber-400 border-amber-800/40' : 'bg-zinc-900/90 text-[#D4AF37] border-[#1C1C1C]'
                      }`}>
                        <FileCheck2 className="w-5 h-5" />
                      </div>
                      <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-300 font-bold leading-tight text-center">DOSSIERS À VALIDER</span>
                      <span className={`text-3xl font-bold font-mono tracking-tight my-1.5 text-center ${pendingValidationCount > 0 ? 'text-amber-400 animate-pulse' : 'text-white'}`}>
                        {pendingValidationCount}
                      </span>
                      <div className="flex items-center justify-center gap-1 text-[9px] font-mono text-center">
                        {pendingValidationCount > 0 ? (
                          <span className="text-amber-400 font-bold">Action requise ({pendingValidationCount})</span>
                        ) : (
                          <span className="text-emerald-500 font-medium">Tout est en règle</span>
                        )}
                      </div>
                    </button>

                    {/* Stat 5: QA Audit PDF (5 Agents) */}
                    <button 
                      onClick={onOpenQA}
                      dir="ltr"
                      className="p-6 bg-gradient-to-b from-[#0F0F0F] to-[#090909] border border-[#D4AF37]/50 rounded-xl flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden group hover:border-[#D4AF37] hover:bg-zinc-900/60 transition-all duration-300 min-h-[160px] cursor-pointer w-full"
                    >
                      <div className="w-10 h-10 bg-[#D4AF37]/20 rounded-full flex items-center justify-center text-[#D4AF37] border border-[#D4AF37]/40 mb-2.5 group-hover:scale-110 transition-transform mx-auto shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-[#D4AF37] font-semibold leading-tight text-center">RAPPORT QA (5 PDF)</span>
                      <span className="text-xl font-bold font-mono tracking-tight text-white my-1.5 text-center">100% Conforme</span>
                      <div className="flex items-center justify-center gap-1 text-[9px] font-mono text-emerald-400 font-medium text-center">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Télécharger les 5 Rapports PDF</span>
                      </div>
                    </button>

                    {/* Stat 6: Testeur Automatique / Relancer Vérification */}
                    <button 
                      onClick={onOpenQA}
                      dir="ltr"
                      className="p-6 bg-gradient-to-b from-[#0F0F0F] to-[#090909] border border-emerald-500/40 rounded-xl flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden group hover:border-emerald-400 hover:bg-zinc-900/60 transition-all duration-300 min-h-[160px] cursor-pointer w-full"
                    >
                      <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 border border-emerald-500/40 mb-2.5 group-hover:scale-110 transition-transform mx-auto shrink-0">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-400 font-semibold leading-tight text-center">VÉRIFICATION QA AGENTS</span>
                      <span className="text-xl font-bold font-mono tracking-tight text-white my-1.5 text-center">5 Agents Prêts</span>
                      <div className="flex items-center justify-center gap-1 text-[9px] font-mono text-zinc-300 font-medium text-center">
                        <Play className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                        <span>Lancer la vérification à tout moment ›</span>
                      </div>
                    </button>
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

                  {/* Boutiques list/grid rebuild (Strict 2 cards per row & RTL) */}
                  {filteredBoutiques.length === 0 ? (
                    <div className="p-16 text-center text-zinc-500 border border-dashed border-zinc-900 rounded-2xl">
                      Aucune boutique n’a été trouvée pour votre recherche.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2.5 sm:gap-6">
                      {filteredBoutiques.map(b => {
                        const bProducts = products.filter(p => p.boutiqueId === b.id);
                        return (
                          <div 
                            key={b.id} 
                            className={`min-w-0 p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-[#090909] border flex flex-col justify-between gap-3 sm:gap-5 transition-all duration-300 relative overflow-hidden group ${
                              b.isSuspended 
                                ? 'border-red-950 bg-gradient-to-br from-[#090909] to-red-950/5' 
                                : b.isVerified 
                                  ? 'border-[#D4AF37]/20 hover:border-[#D4AF37]/40 bg-gradient-to-br from-[#090909] to-[#D4AF37]/3' 
                                  : 'border-[#141414] hover:border-zinc-800'
                            }`}
                          >
                            {/* Card status and identity stay on separate rows on narrow mobile cards. */}
                            <div className="min-w-0 space-y-2.5">
                              <div className="flex min-h-5 justify-end">
                                {b.isSuspended ? (
                                  <span className="max-w-full truncate px-2 py-0.5 bg-red-950/60 border border-red-900/60 text-red-400 rounded text-[7px] sm:text-[8px] font-mono uppercase tracking-[0.12em] font-semibold">Suspendue</span>
                                ) : b.isVerified ? (
                                  <span className="max-w-full truncate px-2 py-0.5 bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] rounded text-[7px] sm:text-[8px] font-mono uppercase tracking-[0.12em] font-bold">Certifiée</span>
                                ) : (
                                  <span className="max-w-full truncate px-2 py-0.5 bg-zinc-900 border border-zinc-700 text-zinc-400 rounded text-[7px] sm:text-[8px] font-mono uppercase tracking-[0.12em]">En attente</span>
                                )}
                              </div>

                              <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                                <div className="relative shrink-0">
                                  <img 
                                    src={b.logo} 
                                    alt={b.name} 
                                    className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover bg-zinc-900 border ${
                                      b.isVerified ? 'border-[#D4AF37]' : 'border-zinc-800'
                                    }`} 
                                  />
                                  {b.isVerified && (
                                    <div className="absolute -bottom-1 -right-1 bg-black text-[#D4AF37] p-0.5 rounded-full border border-[#D4AF37] shadow-lg">
                                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h4 className="serif-title line-clamp-2 text-sm sm:text-base font-semibold leading-tight text-white tracking-wide">{b.name}</h4>
                                  <p title={`/${b.slug}`} className="mt-1 truncate text-[8px] sm:text-[10px] text-[#D4AF37] font-mono">/{b.slug}</p>
                                </div>
                              </div>
                            </div>

                            {/* Card Body description */}
                            <p className="line-clamp-3 min-h-[54px] text-[10px] sm:text-xs leading-[1.55] text-zinc-400 font-light">
                              {b.description || "Aucune description fournie par la boutique pour le moment."}
                            </p>

                            {/* Card Stats counters */}
                            <div className="space-y-1.5 border-t border-[#141414] pt-2.5 text-[8px] sm:text-[10px] font-mono text-zinc-500">
                              <div className="flex min-w-0 items-center justify-between gap-2">
                                <span>Catalogue</span>
                                <strong className="shrink-0 text-white font-bold">{bProducts.length} article{bProducts.length > 1 ? 's' : ''}</strong>
                              </div>
                              <div className="flex min-w-0 items-center justify-between gap-2">
                                <span>ID</span>
                                <span className="min-w-0 truncate text-right" title={b.id}>…{b.id.substring(b.id.length - 8)}</span>
                              </div>
                            </div>

                            {/* Card Administrative Actions Bar */}
                            <div className="grid grid-cols-1 gap-2 border-t border-[#121212] pt-2">
                              
                              {/* Toggle certification */}
                              <button
                                onClick={() => handleUpdateBoutique(b.id, { isVerified: !b.isVerified })}
                                disabled={boutiqueActionBusyId === b.id}
                                aria-busy={boutiqueActionBusyId === b.id}
                                className={`flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg px-2 py-2 font-mono text-[9px] font-semibold uppercase tracking-wider cursor-pointer transition-all ${
                                  b.isVerified 
                                    ? 'bg-[#101010] border border-zinc-800 text-zinc-500 hover:text-white' 
                                    : 'bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-900/40 text-emerald-400'
                                } disabled:cursor-wait disabled:opacity-50`}
                              >
                                <Check className="w-3 h-3 shrink-0" />
                                <span className="min-w-0 truncate">{b.isVerified ? 'Révoquer' : 'Certifier'}</span>
                              </button>

                              {/* Toggle suspension */}
                              <button
                                onClick={() => handleUpdateBoutique(b.id, { isSuspended: !b.isSuspended })}
                                disabled={boutiqueActionBusyId === b.id}
                                aria-busy={boutiqueActionBusyId === b.id}
                                className={`flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg px-2 py-2 font-mono text-[9px] font-semibold uppercase tracking-wider cursor-pointer transition-all ${
                                  b.isSuspended 
                                    ? 'bg-amber-950/20 hover:bg-amber-950/40 border border-amber-900/40 text-amber-400' 
                                    : 'bg-red-950/15 hover:bg-red-950/30 border border-red-900/40 text-red-400'
                                } disabled:cursor-wait disabled:opacity-50`}
                              >
                                {b.isSuspended ? <Unlock className="w-3 h-3 shrink-0" /> : <Lock className="w-3 h-3 shrink-0" />}
                                <span className="min-w-0 truncate">{b.isSuspended ? 'Réactiver' : 'Suspendre'}</span>
                              </button>

                              {/* Permanent destructive action: visible and usable on touch screens. */}
                              <button
                                onClick={() => handleDeleteBoutique(b.id)}
                                disabled={boutiqueActionBusyId === b.id}
                                aria-busy={boutiqueActionBusyId === b.id}
                                className="flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-red-800/60 bg-red-950/25 px-2 py-2 font-mono text-[9px] font-semibold uppercase tracking-wider text-red-400 transition-all hover:border-red-700 hover:bg-red-950/45 hover:text-red-300 disabled:cursor-wait disabled:opacity-50"
                                title={`Supprimer définitivement ${b.name}`}
                              >
                                <Trash2 className="h-3 w-3 shrink-0" />
                                <span className="min-w-0 truncate">Supprimer</span>
                              </button>

                            </div>

                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: CATALOG MODERATION (Cabinet de Modération d'Articles) */}
              {activeTab === 'products' && (
                <div className="space-y-4" aria-label="Module de modération du catalogue">
                  {!selectedModerationBoutique ? (
                    <>
                      <section className="rounded-2xl border border-[#D4AF37]/35 bg-[linear-gradient(145deg,#10100d_0%,#090909_72%)] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
                        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#D4AF37]">Gestion par boutique</p>
                        <h2 className="serif-title mt-2 text-2xl text-white">Modération du catalogue</h2>
                        <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">
                          Choisissez une boutique pour consulter ses catalogues, examiner ses articles et communiquer directement avec son gérant.
                        </p>
                      </section>

                      <div className="relative">
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                        <input
                          type="search"
                          value={moderationBoutiqueSearch}
                          onChange={event => setModerationBoutiqueSearch(event.target.value)}
                          placeholder="Rechercher une boutique ou une ville..."
                          className="min-h-12 w-full rounded-xl border border-[#202020] bg-[#0B0B0B] py-3 pl-11 pr-4 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-[#D4AF37] focus-visible:ring-2 focus-visible:ring-[#D4AF37]/25"
                        />
                      </div>

                      <div className="flex items-center justify-between px-1 font-mono text-[10px] uppercase tracking-wider text-zinc-500" aria-live="polite">
                        <span>{filteredModerationBoutiques.length} boutique{filteredModerationBoutiques.length > 1 ? 's' : ''}</span>
                        <span>{totalProductsCount} articles au total</span>
                      </div>

                      {filteredModerationBoutiques.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-[#282828] bg-[#090909] px-5 py-14 text-center">
                          <Building2 className="mx-auto h-8 w-8 text-zinc-700" />
                          <p className="mt-3 text-sm text-zinc-300">Aucune boutique ne correspond à cette recherche.</p>
                          {moderationBoutiqueSearch && (
                            <button type="button" onClick={() => setModerationBoutiqueSearch('')} className="mt-4 min-h-11 rounded-xl border border-[#D4AF37]/45 px-4 font-mono text-[10px] uppercase tracking-wider text-[#D4AF37] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]">
                              Effacer la recherche
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {filteredModerationBoutiques.map(boutique => {
                            const boutiqueProducts = products.filter(product => product.boutiqueId === boutique.id);
                            const catalogueCount = new Set(boutiqueProducts.map(moderationCatalogueName)).size;
                            const statusLabel = boutique.isSuspended ? 'Suspendue' : boutique.isVerified ? 'Active' : 'En attente';
                            return (
                              <button
                                key={boutique.id}
                                type="button"
                                onClick={() => openModerationBoutique(boutique.id)}
                                className="group flex min-h-[104px] w-full items-center gap-3 rounded-2xl border border-[#1C1C1C] bg-[#0A0A0A] p-3 text-left transition-all hover:border-[#D4AF37]/60 hover:bg-[#0E0E0C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] active:scale-[0.99]"
                              >
                                <img src={boutique.logo} alt={boutique.name} className="h-16 w-16 shrink-0 rounded-xl border border-[#D4AF37]/25 object-cover" />
                                <span className="min-w-0 flex-1">
                                  <span className="flex items-center gap-2">
                                    <strong className="serif-title block truncate text-base text-white">{boutique.name}</strong>
                                    <span className={`h-2 w-2 shrink-0 rounded-full ${boutique.isSuspended ? 'bg-red-400' : boutique.isVerified ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                                  </span>
                                  <span className="mt-1 block truncate text-xs text-zinc-500">{boutique.location?.city || 'Ville non renseignée'} · {statusLabel}</span>
                                  <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] text-[#D4AF37]">
                                    <span>{boutiqueProducts.length} articles</span>
                                    <span>{catalogueCount} catalogues</span>
                                  </span>
                                </span>
                                <ChevronRight className="h-5 w-5 shrink-0 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-[#D4AF37]" />
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </>
                  ) : selectedModerationProduct ? (
                    <>
                      <button type="button" onClick={handleAdminBack} className="flex min-h-11 items-center gap-2 rounded-xl border border-[#252525] bg-[#0B0B0B] px-4 font-mono text-[10px] uppercase tracking-wider text-zinc-300 transition-colors hover:border-[#D4AF37]/60 hover:text-[#D4AF37] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]">
                        <ArrowLeft className="h-4 w-4" /> Retour aux articles
                      </button>

                      <section className="overflow-hidden rounded-2xl border border-[#202020] bg-[#090909]">
                        <div className="flex flex-col">
                          <img src={selectedModerationProduct.images?.[0]?.url} alt={selectedModerationProduct.name} className="aspect-[4/3] max-h-80 w-full bg-[#111] object-cover" />
                          <div className="p-5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-[#D4AF37]/35 bg-[#D4AF37]/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider text-[#D4AF37]">{selectedModerationProduct.category}</span>
                              <span className={`rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider ${selectedModerationProduct.isAvailable ? 'border-emerald-800/70 bg-emerald-950/30 text-emerald-300' : 'border-red-900/70 bg-red-950/30 text-red-300'}`}>
                                {selectedModerationProduct.isAvailable ? 'En vitrine' : 'Indisponible'}
                              </span>
                            </div>
                            <h2 className="serif-title mt-3 text-2xl text-white">{selectedModerationProduct.name}</h2>
                            <p className="mt-1 text-xs text-zinc-500">{selectedModerationBoutique.name} · {moderationCatalogueName(selectedModerationProduct)}</p>
                            <p className="mt-4 font-mono text-lg text-[#D4AF37]">{selectedModerationProduct.price.toLocaleString('fr-FR')} DA</p>
                            <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
                              <div className="rounded-xl border border-[#1D1D1D] bg-black/30 p-3"><dt className="text-zinc-600">Stock</dt><dd className="mt-1 text-white">{selectedModerationProduct.stock ?? 'Non renseigné'}</dd></div>
                              <div className="rounded-xl border border-[#1D1D1D] bg-black/30 p-3"><dt className="text-zinc-600">Référence</dt><dd className="mt-1 truncate text-white">{selectedModerationProduct.sku || selectedModerationProduct.id.slice(-8)}</dd></div>
                              <div className="rounded-xl border border-[#1D1D1D] bg-black/30 p-3"><dt className="text-zinc-600">Tailles</dt><dd className="mt-1 break-words text-white">{selectedModerationProduct.sizes?.join(', ') || '—'}</dd></div>
                              <div className="rounded-xl border border-[#1D1D1D] bg-black/30 p-3"><dt className="text-zinc-600">Couleurs</dt><dd className="mt-1 break-words text-white">{selectedModerationProduct.colors?.join(', ') || '—'}</dd></div>
                            </dl>
                            {selectedModerationProduct.description && <p className="mt-4 text-sm leading-6 text-zinc-400">{selectedModerationProduct.description}</p>}
                          </div>
                        </div>
                      </section>

                      <section className="rounded-2xl border border-[#D4AF37]/35 bg-[#0A0A08] p-4 sm:p-5">
                        <div className="flex items-start gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#D4AF37]/35 bg-[#D4AF37]/10 text-[#D4AF37]"><MessageSquare className="h-5 w-5" /></span>
                          <div>
                            <h3 className="serif-title text-lg text-white">Commentaire au gérant</h3>
                            <p className="mt-1 text-xs leading-5 text-zinc-500">Le commentaire sera enregistré dans Firebase et visible dans la console de {selectedModerationBoutique.name}.</p>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2" aria-label="Niveau du commentaire">
                          {([['action_required', 'Correction demandée'], ['info', 'Information']] as const).map(([value, label]) => (
                            <button key={value} type="button" onClick={() => setModerationSeverity(value)} aria-pressed={moderationSeverity === value} className={`min-h-11 rounded-xl border px-3 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] ${moderationSeverity === value ? 'border-[#D4AF37] bg-[#D4AF37] font-semibold text-black' : 'border-[#292929] bg-[#0B0B0B] text-zinc-300 hover:border-[#D4AF37]/50'}`}>
                              {label}
                            </button>
                          ))}
                        </div>

                        <label htmlFor="moderation-comment" className="mt-4 block font-mono text-[10px] uppercase tracking-wider text-zinc-400">Votre observation</label>
                        <textarea
                          id="moderation-comment"
                          value={moderationComment}
                          onChange={event => {
                            setModerationComment(event.target.value.slice(0, 1000));
                            setModerationFeedback(null);
                          }}
                          rows={5}
                          placeholder="Expliquez clairement ce qui doit être vérifié ou corrigé sur cet article..."
                          className="mt-2 w-full resize-y rounded-xl border border-[#292929] bg-black/45 p-3 text-sm leading-6 text-white outline-none placeholder:text-zinc-600 focus:border-[#D4AF37] focus-visible:ring-2 focus-visible:ring-[#D4AF37]/20"
                        />
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <span className="font-mono text-[10px] text-zinc-600">{moderationComment.length}/1000</span>
                          <button type="button" onClick={handleSubmitModerationNote} disabled={moderationSubmitting || moderationComment.trim().length < 3} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#D4AF37] px-5 font-mono text-[10px] font-bold uppercase tracking-wider text-black transition-colors hover:bg-[#E6C85A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-45">
                            <Send className="h-4 w-4" /> {moderationSubmitting ? 'Envoi…' : 'Envoyer au gérant'}
                          </button>
                        </div>
                        {moderationNotesError && <p role="alert" className="mt-3 rounded-xl border border-red-900/60 bg-red-950/30 p-3 text-xs text-red-300">{moderationNotesError}</p>}
                        {moderationFeedback && <p role="status" className="mt-3 rounded-xl border border-emerald-800/60 bg-emerald-950/25 p-3 text-xs text-emerald-300">{moderationFeedback}</p>}
                      </section>

                      <section className="rounded-2xl border border-[#202020] bg-[#090909] p-4 sm:p-5">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="serif-title text-lg text-white">Historique des observations</h3>
                          <span className="rounded-full border border-[#2A2A2A] px-2.5 py-1 font-mono text-[10px] text-zinc-400">{moderationNotes.filter(note => note.productId === selectedModerationProduct.id).length}</span>
                        </div>
                        {moderationNotesLoading ? (
                          <p className="mt-4 text-sm text-zinc-500">Chargement de l’historique…</p>
                        ) : moderationNotes.filter(note => note.productId === selectedModerationProduct.id).length === 0 ? (
                          <p className="mt-4 rounded-xl border border-dashed border-[#252525] p-5 text-center text-sm text-zinc-500">Aucun commentaire envoyé pour cet article.</p>
                        ) : (
                          <div className="mt-4 space-y-3">
                            {moderationNotes.filter(note => note.productId === selectedModerationProduct.id).map(note => (
                              <article key={note.id} className="rounded-xl border border-[#202020] bg-black/35 p-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className={`rounded-full border px-2 py-1 font-mono text-[9px] uppercase ${note.severity === 'action_required' ? 'border-amber-800/70 bg-amber-950/30 text-amber-300' : 'border-blue-800/70 bg-blue-950/30 text-blue-300'}`}>{note.severity === 'action_required' ? 'Correction demandée' : 'Information'}</span>
                                  <span className={`font-mono text-[9px] uppercase ${note.status === 'resolved' ? 'text-emerald-400' : 'text-zinc-500'}`}>{note.status === 'resolved' ? 'Traitée' : 'En attente'}</span>
                                </div>
                                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-300">{note.text}</p>
                                <p className="mt-3 font-mono text-[9px] text-zinc-600">{new Date(note.createdAt).toLocaleString('fr-FR')} · {note.createdByName}</p>
                              </article>
                            ))}
                          </div>
                        )}
                      </section>

                      <button type="button" onClick={() => handleDeleteProduct(selectedModerationProduct.id)} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-900/60 bg-red-950/15 px-4 font-mono text-[10px] uppercase tracking-wider text-red-300 transition-colors hover:bg-red-950/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500">
                        <Trash2 className="h-4 w-4" /> Retirer définitivement cet article
                      </button>
                    </>
                  ) : selectedModerationCollection ? (
                    <>
                      <button type="button" onClick={handleAdminBack} className="flex min-h-11 items-center gap-2 rounded-xl border border-[#252525] bg-[#0B0B0B] px-4 font-mono text-[10px] uppercase tracking-wider text-zinc-300 transition-colors hover:border-[#D4AF37]/60 hover:text-[#D4AF37] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]">
                        <ArrowLeft className="h-4 w-4" /> Retour aux catalogues
                      </button>

                      <section className="rounded-2xl border border-[#D4AF37]/30 bg-[#0A0A08] p-4">
                        <p className="font-mono text-[10px] uppercase tracking-wider text-[#D4AF37]">{selectedModerationBoutique.name}</p>
                        <h2 className="serif-title mt-1 text-2xl text-white">{selectedModerationCollection}</h2>
                        <p className="mt-2 text-sm text-zinc-500">{selectedCatalogueProducts.length} article{selectedCatalogueProducts.length > 1 ? 's' : ''} dans ce catalogue</p>
                      </section>

                      <div className="relative">
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                        <input type="search" value={productSearch} onChange={event => { setProductSearch(event.target.value); setModerationVisibleLimit(12); }} placeholder="Rechercher un article ou une référence..." className="min-h-12 w-full rounded-xl border border-[#202020] bg-[#0B0B0B] py-3 pl-11 pr-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-[#D4AF37] focus-visible:ring-2 focus-visible:ring-[#D4AF37]/25" />
                      </div>

                      {searchedCatalogueProducts.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-[#282828] bg-[#090909] px-5 py-14 text-center">
                          <ShoppingBag className="mx-auto h-8 w-8 text-zinc-700" />
                          <p className="mt-3 text-sm text-zinc-400">Aucun article ne correspond à cette recherche.</p>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            {visibleModerationProducts.map(product => {
                              const openNoteCount = moderationNotes.filter(note => note.productId === product.id && note.status === 'open').length;
                              return (
                                <button key={product.id} type="button" onClick={() => openModerationProduct(product.id)} className="group overflow-hidden rounded-2xl border border-[#1C1C1C] bg-[#090909] text-left transition-all hover:border-[#D4AF37]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] active:scale-[0.99]">
                                  <span className="relative block aspect-[3/4] overflow-hidden bg-[#111]">
                                    <img src={product.images?.[0]?.url} alt={product.name} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.025]" />
                                    {openNoteCount > 0 && <span className="absolute right-2 top-2 rounded-full border border-amber-500/50 bg-black/85 px-2 py-1 font-mono text-[9px] text-amber-300">{openNoteCount} remarque{openNoteCount > 1 ? 's' : ''}</span>}
                                  </span>
                                  <span className="block p-3">
                                    <strong className="serif-title block truncate text-sm text-white">{product.name}</strong>
                                    <span className="mt-1 flex items-center justify-between gap-2 font-mono text-[10px]">
                                      <span className="text-[#D4AF37]">{product.price.toLocaleString('fr-FR')} DA</span>
                                      <span className={product.isAvailable ? 'text-emerald-400' : 'text-red-400'}>{product.isAvailable ? 'En ligne' : 'Hors ligne'}</span>
                                    </span>
                                    <span className="mt-3 flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-[#292929] font-mono text-[9px] uppercase tracking-wider text-zinc-300 group-hover:border-[#D4AF37]/50 group-hover:text-[#D4AF37]">Examiner <ChevronRight className="h-3.5 w-3.5" /></span>
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                          {visibleModerationProducts.length < searchedCatalogueProducts.length && (
                            <button type="button" onClick={() => setModerationVisibleLimit(limit => limit + 12)} className="min-h-12 w-full rounded-xl border border-[#D4AF37]/40 bg-[#0A0A08] font-mono text-[10px] uppercase tracking-wider text-[#D4AF37] hover:border-[#D4AF37] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]">
                              Afficher 12 articles supplémentaires
                            </button>
                          )}
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={handleAdminBack} className="flex min-h-11 items-center gap-2 rounded-xl border border-[#252525] bg-[#0B0B0B] px-4 font-mono text-[10px] uppercase tracking-wider text-zinc-300 transition-colors hover:border-[#D4AF37]/60 hover:text-[#D4AF37] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]">
                        <ArrowLeft className="h-4 w-4" /> Retour aux boutiques
                      </button>

                      <section className="flex items-center gap-4 rounded-2xl border border-[#D4AF37]/35 bg-[linear-gradient(145deg,#10100d_0%,#090909_72%)] p-4">
                        <img src={selectedModerationBoutique.logo} alt={selectedModerationBoutique.name} className="h-16 w-16 shrink-0 rounded-2xl border border-[#D4AF37]/30 object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#D4AF37]">Catalogues de la boutique</p>
                          <h2 className="serif-title mt-1 truncate text-2xl text-white">{selectedModerationBoutique.name}</h2>
                          <p className="mt-1 truncate text-xs text-zinc-500">{selectedModerationBoutique.location?.city || 'Ville non renseignée'}</p>
                        </div>
                      </section>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-[#202020] bg-[#090909] p-4"><p className="font-mono text-[9px] uppercase tracking-wider text-zinc-500">Articles</p><strong className="mt-2 block font-mono text-2xl text-white">{moderationBoutiqueProducts.length}</strong></div>
                        <div className="rounded-2xl border border-[#202020] bg-[#090909] p-4"><p className="font-mono text-[9px] uppercase tracking-wider text-zinc-500">À traiter</p><strong className="mt-2 block font-mono text-2xl text-[#D4AF37]">{moderationNotes.filter(note => note.status === 'open').length}</strong></div>
                      </div>

                      {moderationNotesLoading && <p role="status" className="rounded-xl border border-[#202020] bg-[#090909] p-3 text-xs text-zinc-500">Synchronisation des observations…</p>}
                      {moderationNotesError && <p role="alert" className="rounded-xl border border-red-900/60 bg-red-950/30 p-3 text-xs text-red-300">{moderationNotesError}</p>}

                      {moderationCatalogues.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-[#282828] bg-[#090909] px-5 py-14 text-center">
                          <FolderOpen className="mx-auto h-8 w-8 text-zinc-700" />
                          <p className="mt-3 text-sm text-zinc-300">Cette boutique ne possède encore aucun article.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          {moderationCatalogues.map(catalogue => (
                            <button key={catalogue.name} type="button" onClick={() => openModerationCollection(catalogue.name)} className="group overflow-hidden rounded-2xl border border-[#1D1D1D] bg-[#090909] text-left transition-all hover:border-[#D4AF37]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] active:scale-[0.99]">
                              <span className="relative block aspect-[16/10] overflow-hidden bg-[#111]">
                                {catalogue.products[0]?.images?.[0]?.url ? <img src={catalogue.products[0].images[0].url} alt="" loading="lazy" className="h-full w-full object-cover opacity-80 transition-transform duration-500 group-hover:scale-[1.03]" /> : <FolderOpen className="absolute inset-0 m-auto h-8 w-8 text-zinc-700" />}
                                <span className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />
                                <span className="absolute bottom-2 left-2 rounded-full border border-white/15 bg-black/65 px-2 py-1 font-mono text-[9px] text-white">{catalogue.products.length} articles</span>
                              </span>
                              <span className="block p-3">
                                <strong className="serif-title block min-h-10 text-sm leading-5 text-white line-clamp-2">{catalogue.name}</strong>
                                <span className="mt-2 flex items-center justify-between font-mono text-[9px] uppercase tracking-wider text-[#D4AF37]">Voir les articles <ChevronRight className="h-4 w-4" /></span>
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* TAB 4: BOUTIQUE OPENING REQUESTS */}
              {activeTab === 'users' && (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                      placeholder="Rechercher un client ou une boutique..."
                      className="w-full bg-[#0A0A0A] border border-[#141414] rounded-2xl pl-12 pr-4 py-3.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#D4AF37] transition-all font-sans"
                    />
                  </div>

                  <div className="flex items-center justify-between px-1">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Vérifications clients et boutiques</p>
                    <span className={`text-[9px] font-mono font-bold ${pendingAccountCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {pendingAccountCount} EN ATTENTE
                    </span>
                  </div>

                  {filteredUsers.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[#232323] bg-[#0A0A0A] px-6 py-14 text-center">
                      <ShieldCheck className="mx-auto h-9 w-9 text-[#D4AF37]" />
                      <p className="mt-4 text-sm text-white">Aucune vérification en attente</p>
                      <p className="mt-1 text-[10px] text-zinc-500">Les nouveaux dossiers apparaîtront automatiquement ici.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 sm:gap-5">
                      {filteredUsers.map(user => {
                        if (user.role === UserRole.CLIENT) {
                          return (
                            <button
                              key={user.uid}
                              type="button"
                              onClick={() => openClientIdentityDossier(user)}
                              aria-label={`Ouvrir la pièce d’identité de ${user.displayName || user.email}`}
                              className="flex min-w-0 items-center gap-3 rounded-2xl border border-amber-900/35 bg-[#0A0A0A] p-3 text-left hover:border-[#D4AF37]/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] active:scale-[0.98] transition-all sm:p-4"
                            >
                              <img src={user.photoURL} alt={user.displayName} className="h-12 w-12 shrink-0 rounded-full border border-[#D4AF37]/30 bg-zinc-900 object-cover sm:h-14 sm:w-14" />
                              <span className="min-w-0">
                                <span className="block truncate text-xs font-semibold text-white sm:text-sm">{user.displayName || user.email}</span>
                                <span className="mt-1 block text-[9px] font-mono text-amber-400">PIÈCE CLIENT EN ATTENTE</span>
                              </span>
                            </button>
                          );
                        }
                        const linkedBoutique = boutiques.find(boutique => boutique.id === user.boutiqueId || boutique.ownerId === user.uid);
                        if (!linkedBoutique) return null;
                        return (
                          <button
                            key={user.uid}
                            type="button"
                            onClick={() => openBoutiqueDossier(linkedBoutique)}
                            aria-label={`Ouvrir le dossier de ${linkedBoutique.name}`}
                            className="flex min-w-0 items-center gap-3 rounded-2xl border border-[#1D1D1D] bg-[#0A0A0A] p-3 text-left hover:border-[#D4AF37]/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] active:scale-[0.98] transition-all sm:p-4"
                          >
                            <img
                              src={linkedBoutique.logo || user.photoURL}
                              alt={linkedBoutique.name}
                              className="h-12 w-12 shrink-0 rounded-full border border-[#D4AF37]/30 bg-zinc-900 object-cover sm:h-14 sm:w-14"
                            />
                            <span className="min-w-0 truncate text-xs font-semibold text-white sm:text-sm">{linkedBoutique.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: FIREBASE ACTIVITY AND SECURITY DETAILS */}
              {activeTab === 'audit' && (
                <div className="space-y-5">
                  <section className="rounded-2xl border border-[#1D1D1D] bg-[#0A0A0A] p-5 sm:p-6">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#D4AF37]/35 bg-[#D4AF37]/10 text-[#D4AF37]">
                        <ShieldAlert className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-base font-semibold text-white sm:text-lg">Journal d’Audit et Sécurité</h2>
                        <p className="mt-1 text-[10px] leading-relaxed text-zinc-500 sm:text-xs">
                          Activités calculées à partir des comptes, boutiques et articles enregistrés dans Firebase.
                        </p>
                      </div>
                    </div>
                  </section>

                  <div className="grid grid-cols-2 gap-3 sm:gap-5">
                    <div className="rounded-2xl border border-[#1D1D1D] bg-[#0A0A0A] p-4 text-center sm:p-5">
                      <p className="font-mono text-[9px] uppercase tracking-wider text-zinc-500">Boutiques actives</p>
                      <p className="mt-2 font-mono text-2xl font-bold text-white">{verifiedBoutiquesCount}</p>
                    </div>
                    <div className="rounded-2xl border border-[#1D1D1D] bg-[#0A0A0A] p-4 text-center sm:p-5">
                      <p className="font-mono text-[9px] uppercase tracking-wider text-zinc-500">Demandes en attente</p>
                      <p className="mt-2 font-mono text-2xl font-bold text-[#D4AF37]">{pendingAccountCount}</p>
                    </div>
                  </div>

                  <section className="rounded-2xl border border-[#1D1D1D] bg-[#0A0A0A] p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-xs font-semibold text-white">Activité récente</h3>
                      <span className="font-mono text-[9px] text-zinc-500">{recentActivities.length} événements</span>
                    </div>

                    {recentActivities.length === 0 ? (
                      <div className="mt-5 rounded-xl border border-dashed border-[#252525] px-5 py-10 text-center text-[10px] text-zinc-500">
                        Aucune activité enregistrée pour le moment.
                      </div>
                    ) : (
                      <div className="mt-5 space-y-3">
                        {recentActivities.map(activity => (
                          <div key={activity.id} className="flex items-start gap-3 rounded-xl border border-[#181818] bg-[#080808] p-3.5">
                            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                              activity.status === 'success'
                                ? 'bg-emerald-500'
                                : activity.status === 'warning'
                                  ? 'bg-amber-500'
                                  : 'bg-blue-500'
                            }`} />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs leading-relaxed text-zinc-200">{activity.text}</p>
                              <p className="mt-1 font-mono text-[9px] text-zinc-600">{activity.time}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              )}

              {activeTab === 'payments' && (
                <AdminSubscriptionPayments />
              )}

              {/* TAB 6: COMPLETE BOUTIQUE APPLICATION */}
              {activeTab === 'documents' && (
                <div className="space-y-5">
                  {selectedClientVerification ? (
                    <>
                      <button
                        type="button"
                        onClick={() => { setSelectedClientVerificationUid(null); setActiveTab('users'); }}
                        className="inline-flex items-center gap-2 rounded-lg border border-[#252525] bg-[#0A0A0A] px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-zinc-300 hover:border-[#D4AF37]/55 hover:text-[#D4AF37]"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Retour aux vérifications
                      </button>

                      <section className="rounded-2xl border border-[#1D1D1D] bg-[#0A0A0A] p-5 sm:p-6">
                        <div className="flex items-center gap-4">
                          <img src={selectedClientVerification.photoURL} alt={selectedClientVerification.displayName} className="h-20 w-20 rounded-full border-2 border-[#D4AF37] bg-zinc-900 object-cover" />
                          <div className="min-w-0">
                            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-amber-400">Identité client en attente</p>
                            <h2 className="mt-1 truncate text-xl font-semibold text-white">{selectedClientVerification.displayName || selectedClientVerification.email}</h2>
                            <p className="mt-1 break-all text-xs text-zinc-500">{selectedClientVerification.email}</p>
                          </div>
                        </div>
                        <dl className="mt-5 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                          <div><dt className="text-zinc-500">Ville</dt><dd className="mt-1 text-white">{selectedClientVerification.city || 'Non renseignée'}</dd></div>
                          <div><dt className="text-zinc-500">Inscription</dt><dd className="mt-1 text-white">{new Date(selectedClientVerification.createdAt).toLocaleString('fr-FR')}</dd></div>
                          <div><dt className="text-zinc-500">Pièce reçue</dt><dd className="mt-1 text-white">{new Date(selectedClientVerification.identitySubmittedAt || selectedClientVerification.createdAt).toLocaleString('fr-FR')}</dd></div>
                          <div><dt className="text-zinc-500">Identifiant</dt><dd className="mt-1 break-all font-mono text-zinc-300">{selectedClientVerification.uid}</dd></div>
                        </dl>
                      </section>

                      <section className="rounded-2xl border border-[#1D1D1D] bg-[#0A0A0A] p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h3 className="text-xs font-semibold text-[#D4AF37]">Pièce d’identité transmise</h3>
                            <p className="mt-2 break-all text-xs text-white">{selectedClientVerification.identityDocumentName}</p>
                          </div>
                          <FileText className="h-5 w-5 text-zinc-500" />
                        </div>
                        <div className="mt-4 min-h-48 overflow-hidden rounded-xl border border-[#202020] bg-[#070707]">
                          {documentLoading ? (
                            <div className="flex min-h-48 animate-pulse items-center justify-center text-[10px] font-mono text-zinc-500">Chargement sécurisé...</div>
                          ) : documentError ? (
                            <div className="flex min-h-48 items-center justify-center px-5 text-center text-[10px] text-red-400">{documentError}</div>
                          ) : secureDocumentUrl ? (
                            /\.(png|jpe?g|webp)$/i.test(selectedClientVerification.identityDocumentName || '')
                              ? <img src={secureDocumentUrl} alt="Pièce d’identité du client" className="max-h-96 w-full object-contain" />
                              : <iframe src={secureDocumentUrl} title="Pièce d’identité du client" className="h-96 w-full bg-white" />
                          ) : (
                            <div className="flex min-h-48 items-center justify-center text-[10px] text-zinc-500">Aucun fichier disponible.</div>
                          )}
                        </div>
                        {secureDocumentUrl && (
                          <a href={secureDocumentUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-[#D4AF37] hover:text-white">
                            <ExternalLink className="h-3.5 w-3.5" /> Ouvrir le document
                          </a>
                        )}
                      </section>

                      <div className="grid grid-cols-2 gap-3 rounded-2xl border border-[#252525] bg-[#0A0A0A] p-4 sm:ml-auto sm:max-w-md">
                        <button
                          type="button"
                          disabled={approvalBusyUid === selectedClientVerification.uid}
                          onClick={() => handleAccountDecision(selectedClientVerification, 'approved')}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#D4AF37] px-4 text-[10px] font-mono font-bold uppercase tracking-wider text-black disabled:opacity-50"
                        >
                          <Check className="h-4 w-4" /> Confirmer la pièce
                        </button>
                        <button
                          type="button"
                          disabled={approvalBusyUid === selectedClientVerification.uid}
                          onClick={() => handleDeleteClientAccount(selectedClientVerification)}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-red-800 bg-red-950/35 px-4 text-[10px] font-mono font-bold uppercase tracking-wider text-red-300 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" /> Supprimer le compte
                        </button>
                      </div>
                    </>
                  ) : previewDoc && selectedApplicationBoutique ? (
                    <>
                      <button
                        type="button"
                        onClick={() => { setPreviewDoc(null); setActiveTab('users'); }}
                        className="inline-flex items-center gap-2 rounded-lg border border-[#252525] bg-[#0A0A0A] px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-zinc-300 hover:border-[#D4AF37]/55 hover:text-[#D4AF37] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] active:scale-[0.98] transition-all"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Retour aux demandes
                      </button>

                      <section className="overflow-hidden rounded-2xl border border-[#1D1D1D] bg-[#0A0A0A]">
                        <div className="relative h-32 bg-[#111111] sm:h-44">
                          <img src={selectedApplicationBoutique.coverImage} alt={`Couverture de ${selectedApplicationBoutique.name}`} className="h-full w-full object-cover opacity-55" />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-black/20" />
                        </div>
                        <div className="flex items-end gap-4 px-4 pb-5 sm:px-6">
                          <img src={selectedApplicationBoutique.logo} alt={selectedApplicationBoutique.name} className="-mt-8 h-20 w-20 shrink-0 rounded-full border-2 border-[#D4AF37] bg-zinc-900 object-cover sm:h-24 sm:w-24" />
                          <div className="min-w-0 pb-1">
                            <h2 className="truncate text-xl font-semibold text-white sm:text-2xl">{selectedApplicationBoutique.name}</h2>
                            <p className="mt-1 truncate text-[10px] font-mono text-zinc-500">{selectedApplicationBoutique.slug}</p>
                          </div>
                        </div>
                      </section>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <section className="rounded-2xl border border-[#1D1D1D] bg-[#0A0A0A] p-5">
                          <h3 className="text-xs font-semibold text-[#D4AF37]">Responsable du compte</h3>
                          <dl className="mt-4 space-y-3 text-xs">
                            <div><dt className="text-zinc-500">Nom</dt><dd className="mt-1 break-words text-white">{selectedApplicationOwner?.displayName || 'Non renseigné'}</dd></div>
                            <div><dt className="text-zinc-500">Adresse email</dt><dd className="mt-1 break-all text-white">{selectedApplicationOwner?.email || 'Non renseignée'}</dd></div>
                            <div><dt className="text-zinc-500">Identifiant</dt><dd className="mt-1 break-all font-mono text-zinc-300">{selectedApplicationBoutique.ownerId}</dd></div>
                          </dl>
                        </section>

                        <section className="rounded-2xl border border-[#1D1D1D] bg-[#0A0A0A] p-5">
                          <h3 className="text-xs font-semibold text-[#D4AF37]">Informations de la boutique</h3>
                          <dl className="mt-4 space-y-3 text-xs">
                            <div><dt className="text-zinc-500">Localisation</dt><dd className="mt-1 text-white">{[selectedApplicationBoutique.location?.city, selectedApplicationBoutique.location?.country].filter(Boolean).join(', ') || 'Non renseignée'}</dd></div>
                            <div><dt className="text-zinc-500">Description</dt><dd className="mt-1 leading-relaxed text-white">{selectedApplicationBoutique.description || 'Non renseignée'}</dd></div>
                            <div><dt className="text-zinc-500">Demande envoyée</dt><dd className="mt-1 text-white">{new Date(selectedApplicationOwner?.approvalSubmittedAt || selectedApplicationBoutique.verificationSubmittedAt || selectedApplicationBoutique.createdAt).toLocaleString('fr-FR')}</dd></div>
                          </dl>
                        </section>

                        <section className="rounded-2xl border border-[#1D1D1D] bg-[#0A0A0A] p-5">
                          <h3 className="text-xs font-semibold text-[#D4AF37]">Catalogue et présence en ligne</h3>
                          <dl className="mt-4 space-y-3 text-xs">
                            <div><dt className="text-zinc-500">Catégories</dt><dd className="mt-1 text-white">{selectedApplicationBoutique.categories?.join(', ') || 'Non renseignées'}</dd></div>
                            <div><dt className="text-zinc-500">Mots-clés</dt><dd className="mt-1 text-white">{selectedApplicationBoutique.tags?.join(', ') || 'Non renseignés'}</dd></div>
                            <div><dt className="text-zinc-500">Instagram</dt><dd className="mt-1 break-all text-white">{selectedApplicationBoutique.social?.instagram || 'Non renseigné'}</dd></div>
                            <div><dt className="text-zinc-500">TikTok</dt><dd className="mt-1 break-all text-white">{selectedApplicationBoutique.social?.tiktok || 'Non renseigné'}</dd></div>
                            <div><dt className="text-zinc-500">Facebook</dt><dd className="mt-1 break-all text-white">{selectedApplicationBoutique.social?.facebook || 'Non renseigné'}</dd></div>
                            <div><dt className="text-zinc-500">Site web</dt><dd className="mt-1 break-all text-white">{selectedApplicationBoutique.social?.website || 'Non renseigné'}</dd></div>
                          </dl>
                        </section>

                        <section className="rounded-2xl border border-[#1D1D1D] bg-[#0A0A0A] p-5">
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="text-xs font-semibold text-[#D4AF37]">Document transmis</h3>
                            <FileText className="h-4 w-4 text-zinc-500" />
                          </div>
                          <p className="mt-3 break-all text-xs text-white">{selectedApplicationBoutique.verificationDocName || 'Aucun document enregistré'}</p>
                          <div className="mt-4 min-h-40 overflow-hidden rounded-xl border border-[#202020] bg-[#070707]">
                            {documentLoading ? (
                              <div className="flex min-h-40 animate-pulse items-center justify-center text-[10px] font-mono text-zinc-500">Chargement sécurisé...</div>
                            ) : documentError ? (
                              <div className="flex min-h-40 items-center justify-center px-5 text-center text-[10px] text-red-400">{documentError}</div>
                            ) : secureDocumentUrl ? (
                              /\.(png|jpe?g|webp)$/i.test(selectedApplicationBoutique.verificationDocName || '') ? (
                                <img src={secureDocumentUrl} alt="Document de vérification de la boutique" className="max-h-80 w-full object-contain" />
                              ) : (
                                <iframe src={secureDocumentUrl} title="Document de vérification de la boutique" className="h-72 w-full bg-white" />
                              )
                            ) : (
                              <div className="flex min-h-40 items-center justify-center px-5 text-center text-[10px] text-zinc-500">Aucun fichier sécurisé disponible.</div>
                            )}
                          </div>
                          {secureDocumentUrl && (
                            <a href={secureDocumentUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-[#D4AF37] hover:text-white">
                              <ExternalLink className="h-3.5 w-3.5" />
                              Ouvrir le document
                            </a>
                          )}
                        </section>
                      </div>

                      {selectedApplicationOwner?.accountStatus === 'pending' && (
                        <div className="grid grid-cols-2 gap-3 rounded-2xl border border-[#252525] bg-[#0A0A0A] p-4 sm:ml-auto sm:max-w-md">
                          <button
                            type="button"
                            disabled={approvalBusyUid === selectedApplicationOwner.uid}
                            onClick={() => handleAccountDecision(selectedApplicationOwner, 'approved')}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#D4AF37] px-4 text-[10px] font-mono font-bold uppercase tracking-wider text-black hover:bg-[#E4C85A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50 active:scale-[0.98] transition-all"
                          >
                            <Check className="h-4 w-4" />
                            Accepter
                          </button>
                          <button
                            type="button"
                            disabled={approvalBusyUid === selectedApplicationOwner.uid}
                            onClick={() => handleAccountDecision(selectedApplicationOwner, 'rejected')}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-red-800 bg-red-950/35 px-4 text-[10px] font-mono font-bold uppercase tracking-wider text-red-300 hover:bg-red-950/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-50 active:scale-[0.98] transition-all"
                          >
                            <X className="h-4 w-4" />
                            Refuser
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="rounded-2xl border border-[#1D1D1D] bg-[#0A0A0A] p-5">
                      <h2 className="text-base font-semibold text-white">Choisissez une demande boutique</h2>
                      <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-5">
                        {pendingAccounts.map(account => {
                          const boutique = boutiques.find(item => item.id === account.boutiqueId || item.ownerId === account.uid);
                          if (!boutique) return null;
                          return (
                            <button key={account.uid} onClick={() => openBoutiqueDossier(boutique)} className="flex min-w-0 items-center gap-3 rounded-2xl border border-[#1D1D1D] bg-[#080808] p-3 text-left hover:border-[#D4AF37]/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] active:scale-[0.98] transition-all">
                              <img src={boutique.logo || account.photoURL} alt={boutique.name} className="h-12 w-12 shrink-0 rounded-full border border-[#D4AF37]/30 object-cover" />
                              <span className="min-w-0 truncate text-xs font-semibold text-white">{boutique.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

        </div>
      </main>

      {/* FLOATING OPERATOR BADGE - STICKY INSIDE MOBILE CONTAINER */}
      <div className="sticky bottom-4 z-40 mx-auto my-4 flex items-center justify-between gap-3 bg-[#090909]/95 backdrop-blur-md border border-[#D4AF37]/40 hover:border-[#D4AF37] rounded-2xl p-2.5 sm:p-3 pl-3.5 sm:pl-4 pr-4 sm:pr-5 shadow-[0_12px_40px_rgba(0,0,0,0.9)] transition-all duration-300 w-[calc(100%-2rem)] max-w-sm">
        <div className="flex items-center gap-3 min-w-0">
          {/* Admin Photo / Avatar */}
          <button 
            onClick={() => { 
              setTempAvatarUrl(adminAvatar); 
              setTempAdminName(adminName);
              setTempAdminRole(adminRole);
              setShowAvatarModal(true); 
            }}
            className="relative isolate shrink-0 group focus:outline-none cursor-pointer"
            title="Administrateur principal — changer le profil"
          >
            <span
              aria-hidden="true"
              className="absolute -inset-0.5 rounded-full bg-[conic-gradient(from_0deg,#4285F4_0_25%,#EA4335_25%_50%,#FBBC05_50%_75%,#34A853_75%_100%)] opacity-95 shadow-[0_0_7px_rgba(66,133,244,0.32)] animate-[spin_7s_linear_infinite] motion-reduce:animate-none"
            />
            <span
              aria-hidden="true"
              className="absolute -inset-1 rounded-full bg-[conic-gradient(from_90deg,#4285F4,#EA4335,#FBBC05,#34A853,#4285F4)] opacity-20 blur-sm animate-pulse motion-reduce:animate-none"
            />
            <img 
              src={adminAvatar} 
              alt="Admin avatar" 
              className="relative z-10 w-10 h-10 rounded-full object-cover border-2 border-[#090909] shadow-inner transition-all duration-300"
            />
            <span className="absolute bottom-0 right-0 z-20 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-[#0A0A0A]" />
            <div className="absolute inset-0 z-20 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
              <Sparkles className="w-4 h-4 text-[#D4AF37] animate-pulse" />
            </div>
          </button>
          
          {/* Admin Name & status */}
          <div className="text-left min-w-0">
            <p className="text-xs font-semibold text-white tracking-wide truncate">{adminName}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1 h-1 rounded-full bg-[#D4AF37] animate-pulse shrink-0" />
              <p className="text-[8px] text-[#D4AF37] font-mono tracking-widest uppercase truncate">{adminRole}</p>
            </div>
          </div>
        </div>

        {/* Logout action */}
        <div className="border-l border-[#222] pl-3 ml-1 flex flex-col justify-center text-right shrink-0">
          <button
            onClick={onLogout}
            className="text-[9px] font-mono tracking-widest text-zinc-400 hover:text-red-400 font-bold uppercase transition-all duration-300 hover:scale-[1.03] cursor-pointer"
          >
            DÉCONNEXION
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

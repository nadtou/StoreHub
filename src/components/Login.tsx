import React, { useState } from 'react';
import { AccountApprovalStatus, UserProfile, UserRole } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Eye, EyeOff, Upload, Check, MapPin, User, Mail, Lock, AlertTriangle } from 'lucide-react';
import {
  deleteUploadedStorageFile,
  getClientAuth,
  initFirebase,
  uploadBoutiqueRegistrationLogo,
  uploadBoutiqueVerificationDocument,
} from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  deleteUser,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  sendEmailVerification,
  signInWithPopup,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { firebaseAuthenticatedFetch } from '../utils/firebaseAuthenticatedFetch';
import { compressImageToWebP } from '../utils/imageCompression';

interface LoginProps {
  onLogin: (role: UserRole, email: string, extraProfile?: { displayName?: string; photoURL?: string; uid?: string }) => Promise<void>;
}

export default function Login({ onLogin }: LoginProps) {
  const [view, setView] = useState<'gate' | 'boutique_login' | 'boutique_register' | 'client_login' | 'client_register' | 'admin_login'>('gate');
  const [adminClickCount, setAdminClickCount] = useState(0);

  const handleAdminTrigger = () => {
    setAdminClickCount(prev => {
      const next = prev + 1;
      if (next >= 5) {
        setView('admin_login');
        return 0;
      }
      return next;
    });
  };

  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [logoError, setLogoError] = useState(false);

  // Registration state
  const [regEmail, setRegEmail] = useState('');
  const [regBoutiqueName, setRegBoutiqueName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoErrorMsg, setLogoErrorMsg] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [isDragOverLogo, setIsDragOverLogo] = useState(false);
  const [isDragOverDoc, setIsDragOverDoc] = useState(false);

  const selectBoutiqueLogo = (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setLogoFile(null);
      setLogoErrorMsg('Choisissez une image JPG, PNG ou WebP.');
      return;
    }
    if (file.size <= 0 || file.size > 12 * 1024 * 1024) {
      setLogoFile(null);
      setLogoErrorMsg('Le fichier source doit peser au maximum 12 Mo.');
      return;
    }
    setLogoFile(file);
    setLogoErrorMsg('');
  };

  const selectBoutiqueDocument = (file: File) => {
    if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setDocFile(null);
      setAuthError('Le document doit être un PDF ou une image JPG, PNG ou WebP.');
      return;
    }
    if (file.size <= 0 || file.size > 5 * 1024 * 1024) {
      setDocFile(null);
      setAuthError('Le document doit peser au maximum 5 Mo.');
      return;
    }
    setDocFile(file);
    setAuthError(null);
  };

  // Client login state
  const [clientEmail, setClientEmail] = useState('');
  const [clientPassword, setClientPassword] = useState('');
  const [showClientPassword, setShowClientPassword] = useState(false);

  // Client registration state
  const [regClientEmail, setRegClientEmail] = useState('');
  const [regClientName, setRegClientName] = useState('');
  const [regClientPassword, setRegClientPassword] = useState('');
  const [regClientConfirmPassword, setRegClientConfirmPassword] = useState('');
  const [showRegClientPassword, setShowRegClientPassword] = useState(false);
  const [showRegClientConfirmPassword, setShowRegClientConfirmPassword] = useState(false);
  const [clientCity, setClientCity] = useState('Alger');
  const [clientAcceptedTerms, setClientAcceptedTerms] = useState(false);

  // Stagger configurations for elements
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
    },
  };

  const doorLeftVariants = {
    hidden: { opacity: 0, x: -30, y: 15, scale: 0.98 },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      transition: { duration: 1.0, ease: [0.16, 1, 0.3, 1] },
    },
  };

  const doorRightVariants = {
    hidden: { opacity: 0, x: 30, y: 15, scale: 0.98 },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      transition: { duration: 1.0, ease: [0.16, 1, 0.3, 1] },
    },
  };

  const renderAuthStatus = () => {
    if (isLoading) {
      return (
        <div className="bg-[#FCFBF9]/90 border border-[#C5A850]/30 rounded-xl p-4 mb-6 flex items-center gap-3 shadow-sm select-none">
          <div className="w-5 h-5 border-2 border-[#C5A850] border-t-transparent rounded-full animate-spin shrink-0" />
          <span className="font-mono text-xs text-[#111111]/70">Traitement en cours, veuillez patienter...</span>
        </div>
      );
    }

    if (authNotice) {
      return (
        <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-4 mb-6 flex items-start gap-3 shadow-sm text-left">
          <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed text-emerald-100">{authNotice}</p>
        </div>
      );
    }
    
    if (authError) {
      return (
        <div className="bg-red-50/90 border border-red-200/80 rounded-xl p-4 mb-6 space-y-3 shadow-sm text-left">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-red-900">Une erreur est survenue</p>
              <p className="text-xs text-red-700 mt-0.5">{authError}</p>
            </div>
          </div>
          
        </div>
      );
    }
    
    return null;
  };

  const translateAuthError = (error: any) => {
    const code = error?.code || error?.message || "";
    console.error("Firebase auth error details:", error);
    if (code.includes("account/pending") || code.includes("account/rejected") || code.includes("account/suspended")) {
      return error.message;
    }
    if (code.includes("auth/operation-not-allowed")) {
      return "Le service d’authentification est temporairement indisponible.";
    }
    if (code.includes("auth/invalid-credential") || code.includes("auth/wrong-password") || code.includes("auth/user-not-found")) {
      return "Identifiants incorrects. Veuillez vérifier votre adresse email et votre mot de passe.";
    }
    if (code.includes("auth/email-already-in-use")) {
      return "Cette adresse email est déjà associée à un compte.";
    }
    if (code.includes("auth/weak-password")) {
      return "Le mot de passe doit contenir au moins 8 caractères.";
    }
    if (code.includes("auth/invalid-email")) {
      return "L'adresse email saisie est invalide.";
    }
    return `Erreur d'authentification: ${error.message || error}`;
  };

  const getAccountBlockingMessage = (profile: UserProfile): string | null => {
    const status: AccountApprovalStatus = profile.accountStatus || 'approved';
    if (status === 'pending') return "Votre compte est en attente de confirmation par l’administration.";
    if (status === 'rejected') {
      return `Votre demande d’ouverture a été refusée${profile.approvalRejectionReason ? ` : ${profile.approvalRejectionReason}` : '.'}`;
    }
    if (status === 'suspended') return "Votre compte est suspendu. Contactez l’administration.";
    return null;
  };

  const loadApprovedProfile = async (auth: Awaited<ReturnType<typeof initFirebase>>['auth'], expectedRole: UserRole) => {
    const response = await firebaseAuthenticatedFetch('/api/users/profile');
    const profile = await response.json().catch(() => null) as UserProfile | null;
    if (!response.ok || !profile) {
      throw new Error(profile && 'error' in profile ? String((profile as any).error) : "Le profil StoreHub est introuvable.");
    }
    if (profile.role !== expectedRole) {
      await signOut(auth);
      throw Object.assign(new Error("Ce compte appartient à un autre espace de connexion."), { code: 'account/role-mismatch' });
    }
    const blockingMessage = getAccountBlockingMessage(profile);
    if (blockingMessage) {
      await signOut(auth);
      throw Object.assign(new Error(blockingMessage), { code: `account/${profile.accountStatus}` });
    }
    return profile;
  };

  const handleBoutiqueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError(null);
    setAuthNotice(null);
    try {
      const { auth } = await initFirebase();
      const credential = await signInWithEmailAndPassword(auth, email, password);
      if (!credential.user.emailVerified) {
        auth.languageCode = 'fr';
        await sendEmailVerification(credential.user).catch(() => undefined);
        await signOut(auth);
        setAuthNotice("Votre adresse email n’est pas encore vérifiée. Un nouveau lien vient de vous être envoyé.");
        return;
      }
      await loadApprovedProfile(auth, UserRole.BOUTIQUE);
      await onLogin(UserRole.BOUTIQUE, credential.user.email || email, { uid: credential.user.uid });
    } catch (err: any) {
      setAuthError(translateAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    const normalizedEmail = regEmail.trim().toLowerCase();
    const normalizedBoutiqueName = regBoutiqueName.trim();
    setAuthError(null);
    setAuthNotice(null);

    if (normalizedBoutiqueName.length < 2 || normalizedBoutiqueName.length > 80) {
      setAuthError("Le nom de boutique doit contenir entre 2 et 80 caractères.");
      return;
    }
    if (!acceptedTerms) {
      setAuthError("Veuillez accepter les conditions d’utilisation et la politique de confidentialité.");
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setAuthError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (regPassword.length < 8) {
      setAuthError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (!logoFile) {
      setLogoErrorMsg("Le logo de la boutique est requis.");
      setAuthError("Ajoutez le logo de votre boutique.");
      return;
    }
    if (!docFile) {
      setAuthError("Ajoutez un document légal pour la validation de la boutique.");
      return;
    }

    setIsLoading(true);
    let createdUser: FirebaseUser | null = null;
    const uploadedPaths: string[] = [];
    let registrationCommitted = false;
    try {
      const { auth } = await initFirebase();
      auth.languageCode = 'fr';
      const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, regPassword);
      createdUser = credential.user;
      const boutiqueId = `boutique_${credential.user.uid}`;

      await sendEmailVerification(credential.user);

      const preparedLogo = await compressImageToWebP(logoFile, { cropSquare: true });
      const logoUpload = await uploadBoutiqueRegistrationLogo(
        credential.user.uid,
        boutiqueId,
        preparedLogo.dataUrl,
      );
      uploadedPaths.push(logoUpload.fullPath);
      if (!logoUpload.url) throw new Error("Le logo Firebase ne possède pas d’URL publique.");

      const documentUpload = await uploadBoutiqueVerificationDocument(
        credential.user.uid,
        boutiqueId,
        docFile,
      );
      uploadedPaths.push(documentUpload.fullPath);

      const registrationResponse = await firebaseAuthenticatedFetch('/api/boutique-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boutiqueId,
          name: normalizedBoutiqueName,
          logo: logoUpload.url,
          logoStoragePath: logoUpload.fullPath,
          verificationDocName: documentUpload.name,
          verificationDocPath: documentUpload.fullPath,
        }),
      });
      const registrationPayload = await registrationResponse.json().catch(() => null);
      if (!registrationResponse.ok) {
        throw new Error(registrationPayload?.error || "La boutique n’a pas pu être enregistrée.");
      }
      registrationCommitted = true;

      await signOut(auth).catch((signOutError) => {
        console.error('La boutique est créée, mais la déconnexion automatique a échoué:', signOutError);
      });
      createdUser = null;
      setEmail(normalizedEmail);
      setPassword('');
      setRegPassword('');
      setRegConfirmPassword('');
      setLogoFile(null);
      setDocFile(null);
      setAcceptedTerms(false);
      setView('boutique_login');
      setAuthNotice(
        "Votre demande de boutique a bien été envoyée. Vérifiez votre adresse email : l’accès sera ouvert uniquement après l’approbation de l’administrateur.",
      );
    } catch (err: any) {
      if (!registrationCommitted) {
        for (const uploadedPath of [...uploadedPaths].reverse()) {
          await deleteUploadedStorageFile(uploadedPath).catch((cleanupError) => {
            console.error('Impossible de supprimer un fichier après l’échec de l’inscription:', cleanupError);
          });
        }
        if (createdUser) {
          await deleteUser(createdUser).catch((cleanupError) => {
            console.error('Impossible de supprimer le compte Auth après l’échec de l’inscription:', cleanupError);
          });
        }
      }
      setAuthError(translateAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    setAuthError(null);
    setAuthNotice(null);
    try {
      const { auth } = await initFirebase();
      const credential = await signInWithEmailAndPassword(auth, clientEmail, clientPassword);
      if (!credential.user.emailVerified) {
        await sendEmailVerification(credential.user).catch(() => undefined);
        await signOut(auth);
        setAuthNotice("Votre adresse email n’est pas encore vérifiée. Un nouveau lien vient de vous être envoyé. Vérifiez votre boîte email avant de vous connecter.");
        return;
      }
      await loadApprovedProfile(auth, UserRole.CLIENT);
      await onLogin(UserRole.CLIENT, credential.user.email || clientEmail, { uid: credential.user.uid });
    } catch (err: any) {
      setAuthError(translateAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleBoutiquePasswordReset = async () => {
    if (isLoading) return;
    const normalizedEmail = email.trim().toLowerCase();
    setAuthError(null);
    setAuthNotice(null);
    if (!normalizedEmail) {
      setAuthError("Saisissez d’abord votre adresse email.");
      return;
    }

    setIsLoading(true);
    try {
      const { auth } = await initFirebase();
      auth.languageCode = 'fr';
      await sendPasswordResetEmail(auth, normalizedEmail);
      setAuthNotice("Un email de réinitialisation du mot de passe vient de vous être envoyé.");
    } catch (error: any) {
      setAuthError(translateAuthError(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClientPasswordReset = async () => {
    if (isLoading) return;
    const normalizedEmail = clientEmail.trim().toLowerCase();
    setAuthError(null);
    setAuthNotice(null);
    if (!normalizedEmail) {
      setAuthError("Saisissez d’abord votre adresse email.");
      return;
    }

    setIsLoading(true);
    try {
      const { auth } = await initFirebase();
      await sendPasswordResetEmail(auth, normalizedEmail);
      setAuthNotice("Un email de réinitialisation du mot de passe vient de vous être envoyé.");
    } catch (error: any) {
      setAuthError(translateAuthError(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError(null);

    try {
      const { auth } = await initFirebase();
      const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      const profileResponse = await firebaseAuthenticatedFetch('/api/users/profile');
      const profile = await profileResponse.json().catch(() => null);

      if (!profileResponse.ok || profile?.role !== UserRole.ADMIN) {
        await signOut(auth);
        setAuthError("Ce compte ne possède pas les autorisations administrateur.");
        return;
      }

      await onLogin(UserRole.ADMIN, credential.user.email || email, { uid: credential.user.uid });
    } catch (err: any) {
      setAuthError(translateAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClientRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    const normalizedName = regClientName.trim();
    const normalizedEmail = regClientEmail.trim().toLowerCase();
    setAuthError(null);
    setAuthNotice(null);
    if (normalizedName.length < 2) {
      setAuthError("Veuillez saisir votre nom complet.");
      return;
    }
    if (!clientAcceptedTerms) {
      setAuthError("Veuillez accepter les conditions d’utilisation et la politique de confidentialité.");
      return;
    }
    if (regClientPassword !== regClientConfirmPassword) {
      setAuthError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (regClientPassword.length < 8) {
      setAuthError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    setIsLoading(true);
    let createdUser: FirebaseUser | null = null;
    try {
      const { auth } = await initFirebase();
      const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, regClientPassword);
      createdUser = credential.user;
      await sendEmailVerification(credential.user);

      const newProfile = {
        uid: credential.user.uid,
        email: normalizedEmail,
        displayName: normalizedName,
        role: UserRole.CLIENT,
        photoURL: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
        city: clientCity,
        preferences: {
          audiences: ["Femme", "Homme", "Enfants"],
          styles: ["Minimaliste", "Élégant"],
          sizes: ["M", "38"],
          favoriteCategories: ["robes", "outerwear"]
        },
        stats: {
          favoritesCount: 0,
          viewedProducts: 0
        },
        createdAt: new Date().toISOString()
      };

      const profileResponse = await firebaseAuthenticatedFetch('/api/users/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProfile)
      });
      const profilePayload = await profileResponse.json().catch(() => null);
      if (!profileResponse.ok) {
        throw new Error(profilePayload?.error || "Le profil client n’a pas pu être enregistré.");
      }

      await signOut(auth);
      createdUser = null;
      setClientEmail(normalizedEmail);
      setClientPassword('');
      setRegClientPassword('');
      setRegClientConfirmPassword('');
      setView('client_login');
      setAuthNotice("Votre demande de compte client a été envoyée. Vérifiez votre email : l’accès sera ouvert uniquement après l’approbation de l’administrateur.");
    } catch (err: any) {
      if (createdUser) await deleteUser(createdUser).catch(() => undefined);
      setAuthError(translateAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const completeGoogleSignIn = async (firebaseUser: FirebaseUser, role: UserRole) => {
    const { auth } = await initFirebase();
    const email = firebaseUser.email || '';
    const displayName = firebaseUser.displayName || (role === UserRole.BOUTIQUE ? 'Boutique StoreHub' : 'Client StoreHub');
    const photoURL = firebaseUser.photoURL || '';
    const existingResponse = await firebaseAuthenticatedFetch('/api/users/profile');
    const existingProfile = existingResponse.ok
      ? await existingResponse.json() as UserProfile
      : null;

    if (existingProfile) {
      if (existingProfile.role !== role) {
        await signOut(auth);
        throw Object.assign(new Error("Ce compte Google appartient à un autre espace de connexion."), { code: 'account/role-mismatch' });
      }
      const blockingMessage = getAccountBlockingMessage(existingProfile);
      if (blockingMessage) {
        await signOut(auth);
        throw Object.assign(new Error(blockingMessage), { code: `account/${existingProfile.accountStatus}` });
      }
      await onLogin(role, email, { displayName, photoURL, uid: firebaseUser.uid });
      return;
    }

    if (existingResponse.status !== 404) {
      const payload = await existingResponse.json().catch(() => null);
      throw new Error(payload?.error || "Le profil Google n’a pas pu être vérifié.");
    }
    if (role === UserRole.BOUTIQUE) {
      await signOut(auth);
      throw new Error("Pour ouvrir une boutique, utilisez « Créer une boutique » afin de fournir le logo et le document de vérification.");
    }

    const userProfile = {
      uid: firebaseUser.uid,
      email,
      displayName,
      role,
      photoURL: photoURL || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
      createdAt: new Date().toISOString(),
    };

    const profileResponse = await firebaseAuthenticatedFetch('/api/users/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userProfile),
    });
    if (!profileResponse.ok) {
      const payload = await profileResponse.json().catch(() => null);
      throw new Error(payload?.error || "Le profil Google n’a pas pu être enregistré.");
    }
    await signOut(auth);
    setAuthNotice("Votre demande de compte client a été envoyée à l’administrateur. Vous pourrez vous connecter après son approbation.");
  };

  const showGoogleAuthError = (error: any) => {
    const code = error?.code || '';
    if (code === 'auth/redirect-cancelled-by-user') {
      setAuthError('Connexion Google annulée. Veuillez réessayer.');
    } else if (code === 'auth/network-request-failed') {
      setAuthError('Problème de réseau. Vérifiez votre connexion Internet.');
    } else if (code === 'auth/unauthorized-domain') {
      setAuthError("La connexion Google n’est pas disponible depuis ce domaine.");
    } else if (code.includes('auth/operation-not-allowed') || code.includes('auth/configuration-not-found')) {
      setAuthError("La connexion Google est temporairement indisponible.");
    } else {
      setAuthError(translateAuthError(error));
    }
  };

  // Official Google Sign-In authentication handler
  const handleGoogleSignIn = async (role: UserRole) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      // Firebase is initialized by App before the login screen is interactive.
      // Calling signInWithPopup synchronously preserves the user's click gesture,
      // which mobile and embedded browsers require before opening a window.
      const auth = getClientAuth();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const popupResult = signInWithPopup(auth, provider);
      const result = await popupResult;
      await completeGoogleSignIn(result.user, role);
      setIsLoading(false);
    } catch (err: any) {
      console.error("Google Sign-In Error:", err);
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        setAuthError("La fenêtre Google a été fermée ou bloquée. Réessayez dans Chrome ou Safari.");
      } else if (code === 'auth/popup-blocked' || String(err?.message || '').includes('initialized')) {
        setAuthError("Google n’a pas pu s’ouvrir. Patientez une seconde puis réessayez.");
      } else {
        showGoogleAuthError(err);
      }
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {view === 'gate' ? (
        <motion.div 
          key="gate"
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={containerVariants}
          className="absolute inset-0 bg-[#F4EFE6] text-[#111111] flex flex-col items-center justify-between p-6 md:p-12 z-30 overflow-y-auto selection:bg-luxury-gold selection:text-black"
        >
          {/* 9:41 Safe Space Header spacer mimicking a luxury mobile/desktop canvas */}
          <motion.div variants={itemVariants} className="w-full flex justify-center py-2 select-none">
            <span className="font-mono text-xs tracking-widest text-[#111111]/30 font-medium animate-pulse">9:41</span>
          </motion.div>

          {/* Main Logo & Title Header Section */}
          <div className="flex flex-col items-center text-center max-w-xl mx-auto my-4">
            {/* Brand Name */}
            <motion.h1 
              variants={itemVariants}
              className="serif-title text-4xl sm:text-5xl font-light tracking-wide text-[#111111] flex items-center gap-1"
            >
              Store <span className="text-[#C5A850] font-normal">Hub</span>
            </motion.h1>
            
             {/* Subtitle Banner with dashed margins & framing */}
            <motion.div variants={itemVariants} className="mt-3 flex items-center gap-3">
              <div className="w-4 h-[1px] bg-[#C5A850]/40" />
              <span className="font-sans text-[10px] uppercase tracking-[0.25em] text-[#C5A850] font-semibold border border-[#C5A850]/20 px-3 py-1 bg-white/5 backdrop-blur-sm">
                La Galerie de vos Boutiques
              </span>
              <div className="w-4 h-[1px] bg-[#C5A850]/40" />
            </motion.div>

            {/* Delicate separator dots line */}
            <motion.div variants={itemVariants} className="my-5 flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 bg-[#C5A850] rounded-full opacity-40" />
              <span className="w-1.5 h-1.5 bg-[#C5A850] rounded-full opacity-70" />
              <motion.span 
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="w-2 h-2 bg-[#C5A850] rotate-45" 
              />
              <span className="w-1.5 h-1.5 bg-[#C5A850] rounded-full opacity-70" />
              <span className="w-1.5 h-1.5 bg-[#C5A850] rounded-full opacity-40" />
            </motion.div>

            {/* Prompt question */}
            <motion.h2 
              variants={itemVariants}
              className="serif-title text-lg sm:text-2xl text-[#111111]/80 font-light tracking-wide italic px-4"
            >
              Par quelle porte entrez-vous ?
            </motion.h2>
          </div>

          {/* Arched Doors Container - Responsive Layout */}
          <div className="grid grid-cols-2 gap-3 md:gap-6 w-full max-w-md mx-auto my-5 md:my-8 px-0 sm:px-4">
            
            {/* Door 1: Client Card (Dark Vault) */}
            <motion.div
              id="door-client-card"
              variants={doorLeftVariants}
              whileHover={{ 
                scale: 1.03,
                y: -8,
                boxShadow: "0 25px 50px -12px rgba(197,168,80,0.2)"
              }}
              whileTap={{ scale: 0.99 }}
              onClick={() => setView('client_login')}
              className="group relative cursor-pointer bg-[#111111] rounded-t-[7rem] rounded-b-[1.5rem] p-3 sm:p-4 md:p-5 mx-auto shadow-2xl transition-all duration-500 ease-out flex h-[330px] sm:h-[390px] md:h-[420px] w-full max-w-[170px] flex-col justify-between overflow-hidden"
            >
              {/* Inner Golden Stroke Inset Frame with smooth scale on hover */}
              <div className="absolute inset-2 rounded-t-[6.5rem] rounded-b-[1.25rem] border border-[#C5A850]/20 pointer-events-none group-hover:border-[#C5A850]/50 group-hover:scale-[1.005] transition-all duration-500" />
              
              {/* Top arch white light radial reflect */}
              <div className="absolute top-0 inset-x-0 h-36 bg-gradient-to-b from-white/[0.04] to-transparent rounded-t-[7rem]" />

              {/* SVG Hanger Icon Section */}
              <div className="flex-grow flex flex-col items-center justify-center pt-7 md:pt-10 pb-2 px-1 sm:px-2 text-center z-10">
                <motion.div 
                  className="w-14 h-14 md:w-16 md:h-16 mb-3 flex items-center justify-center"
                  animate={{ 
                    y: [0, -4, 0],
                  }}
                  whileHover={{ 
                    scale: 1.05,
                    rotate: [0, -4, 4, -2, 2, 0]
                  }}
                  transition={{ 
                    y: {
                      repeat: Infinity,
                      duration: 3.5,
                      ease: "easeInOut"
                    },
                    duration: 0.5
                  }}
                >
                  <svg className="w-12 h-12 md:w-14 md:h-14 text-[#C5A850] drop-shadow-[0_2px_8px_rgba(197,168,80,0.2)]" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.2">
                    <path d="M50 40 C50 28 62 28 62 34 C62 42 50 44 50 48" strokeLinecap="round" />
                    <path d="M50 48 L20 68 C18 69.5 19 72 21.5 72 L78.5 72 C81 72 82 69.5 80 68 L50 48 Z" strokeLinejoin="round" />
                  </svg>
                </motion.div>

                {/* Role title framed */}
                <div className="w-full h-10 md:h-11 flex items-center justify-center border border-[#C5A850]/25 rounded-none bg-[#161616]/80 group-hover:border-[#C5A850] group-hover:bg-[#C5A850]/10 transition-all duration-300 shadow-sm mb-2">
                  <h3 className="serif-title text-xs sm:text-sm md:text-base text-white font-light tracking-[0.16em] group-hover:text-[#C5A850] transition-colors duration-300 uppercase leading-none">
                    Client
                  </h3>
                </div>

                {/* Description */}
                <p className="text-zinc-300 font-light text-[10px] md:text-xs tracking-wide leading-relaxed mt-2 max-w-[150px] group-hover:text-white transition-colors duration-300">
                  Découvrez toutes vos boutiques en un seul lieu.
                </p>
              </div>

              {/* Bottom Button Indicator with Golden Line */}
              <div className="pb-4 md:pb-6 pt-2 flex flex-col items-center z-10">
                <div className="flex w-full items-center justify-center gap-2">
                  <span className="font-sans text-[8px] md:text-[10px] tracking-[0.14em] text-[#C5A850] font-semibold group-hover:text-white transition-colors duration-300 whitespace-nowrap">
                    SE CONNECTER
                  </span>
                  <div className="w-5 md:w-8 h-[1px] bg-[#C5A850] group-hover:w-10 transition-all duration-500 ease-out" />
                </div>
              </div>
            </motion.div>

            {/* Door 2: Boutique Card (Cream Vault) */}
            <motion.div
              id="door-boutique-card"
              variants={doorRightVariants}
              whileHover={{ 
                scale: 1.03,
                y: -8,
                boxShadow: "0 25px 50px -12px rgba(197,168,80,0.22)"
              }}
              whileTap={{ scale: 0.99 }}
              onClick={() => setView('boutique_login')}
              className="group relative cursor-pointer bg-[#FAF8F5] rounded-t-[7rem] rounded-b-[1.5rem] p-3 sm:p-4 md:p-5 mx-auto shadow-2xl transition-all duration-500 ease-out flex h-[330px] sm:h-[390px] md:h-[420px] w-full max-w-[170px] flex-col justify-between overflow-hidden border border-[#E9E4DB]"
            >
              {/* Inner Golden Stroke Inset Frame */}
              <div className="absolute inset-2 rounded-t-[6.5rem] rounded-b-[1.25rem] border border-[#C5A850]/20 pointer-events-none group-hover:border-[#C5A850]/50 group-hover:scale-[1.005] transition-all duration-500" />

              {/* Top arch gold light radial reflect */}
              <div className="absolute top-0 inset-x-0 h-36 bg-gradient-to-b from-[#C5A850]/[0.03] to-transparent rounded-t-[7rem]" />

              {/* SVG Boutique Store Icon Section */}
              <div className="flex-grow flex flex-col items-center justify-center pt-7 md:pt-10 pb-2 px-1 sm:px-2 text-center z-10">
                <motion.div 
                  className="w-14 h-14 md:w-16 md:h-16 mb-3 flex items-center justify-center relative"
                  animate={{ 
                    y: [0, -4, 0],
                  }}
                  whileHover={{ 
                    scale: 1.05,
                    rotate: [0, -2, 2, -1, 1, 0]
                  }}
                  transition={{ 
                    y: {
                      repeat: Infinity,
                      duration: 3.5,
                      ease: "easeInOut",
                      delay: 0.35
                    },
                    duration: 0.5
                  }}
                >
                  <svg className="w-12 h-12 md:w-14 md:h-14 text-[#C5A850] drop-shadow-[0_2px_8px_rgba(197,168,80,0.15)] overflow-visible" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.2">
                    {/* Canopy */}
                    <path d="M25 35 H75 V45 C75 48 71.5 48 70 45 C68.5 48 65 48 63.5 45 C62 48 58.5 48 57 45 C55.5 48 52 48 50.5 45 C49 48 45.5 48 44 45 C42.5 48 39 48 37.5 45 C36 48 32.5 48 31 45 C29.5 48 26 48 25 45 V35 Z" strokeLinejoin="round" />
                    {/* Outer Frame */}
                    <path d="M28 45 V72 H72 V45" strokeLinejoin="round" />
                    
                    {/* Warm ambient golden lights cast on the ground from door and window */}
                    <polygon points="33,72 47,72 58,94 22,94" className="opacity-0 group-hover:opacity-25 transition-all duration-700 ease-out fill-[#FBE395] stroke-none pointer-events-none" />
                    <polygon points="53,64 67,64 76,87 44,87" className="opacity-0 group-hover:opacity-20 transition-all duration-700 ease-out fill-[#FBE395] stroke-none pointer-events-none" />

                    {/* Door - Turn on warm glowing light inside */}
                    <rect x="33" y="54" width="14" height="18" className="transition-all duration-700 ease-out fill-transparent group-hover:fill-[#FBE395] group-hover:stroke-[#C5A850]" />
                    {/* Window - Turn on warm glowing light inside */}
                    <rect x="53" y="54" width="14" height="10" className="transition-all duration-700 ease-out fill-transparent group-hover:fill-[#FBE395] group-hover:stroke-[#C5A850]" />
                  </svg>
                </motion.div>

                {/* Role title framed */}
                <div className="w-[calc(100%+0.5rem)] sm:w-full h-10 md:h-11 flex items-center justify-center border border-[#C5A850]/25 rounded-none bg-white/60 group-hover:border-[#C5A850] group-hover:bg-[#C5A850]/15 transition-all duration-300 shadow-sm mb-2">
                  <h3 className="serif-title whitespace-nowrap text-[12px] text-[#111111] font-light tracking-[0.1em] group-hover:text-[#C5A850] transition-colors duration-300 uppercase leading-none">
                    Boutique
                  </h3>
                </div>

                {/* Description */}
                <p className="text-zinc-600 font-light text-[10px] md:text-xs tracking-wide leading-relaxed mt-2 max-w-[150px] group-hover:text-[#111111] transition-colors duration-300">
                  Ouvrez votre vitrine et gerez vos collections.
                </p>
              </div>

              {/* Bottom Button Indicator with Golden Line */}
              <div className="pb-4 md:pb-6 pt-2 flex flex-col items-center z-10">
                <div className="flex w-full items-center justify-center gap-2">
                  <span className="font-sans text-[8px] md:text-[10px] tracking-[0.14em] text-[#111111] font-semibold group-hover:text-[#C5A850] transition-colors duration-300 whitespace-nowrap">
                    ESPACE PRO
                  </span>
                  <div className="w-5 md:w-8 h-[1px] bg-[#C5A850] group-hover:w-10 transition-all duration-500 ease-out" />
                </div>
              </div>
            </motion.div>

          </div>

          {/* Bottom Footer legal bar with tracked text */}
          <motion.div 
            variants={itemVariants}
            className="w-full flex flex-col items-center gap-2 py-4 text-center select-none opacity-50 hover:opacity-100 transition-opacity"
          >
            <span className="font-sans text-[9px] uppercase tracking-[0.25em] text-[#111111] font-medium">
              Conditions · Confidentialite
            </span>
            <span 
              onClick={handleAdminTrigger}
              className="font-sans text-[9px] uppercase tracking-[0.3em] text-[#C5A850] font-semibold mt-1 cursor-pointer hover:opacity-80 transition-opacity"
            >
              Créé par IA Station
            </span>
          </motion.div>
        </motion.div>
      ) : view === 'boutique_login' ? (
        <motion.div
          key="boutique_login"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 bg-[#F4EFE6] text-[#111111] flex flex-col items-center p-6 md:p-12 z-30 overflow-y-auto selection:bg-luxury-gold selection:text-black"
        >
          {/* Header Bar */}
          <div className="w-full max-w-md mx-auto pt-5 md:pt-6">
            <div className="flex justify-between items-center text-[10px] tracking-[0.18em] font-mono text-[#C5A850] font-medium">
              <span>N° 01 · ÉDITION ALGÉRIENNE</span>
              <span>EST. MMXXVI</span>
            </div>
            {/* Elegant Solid Underline Accent */}
            <div className="h-[1px] bg-[#C5A850]/45 w-full mt-2" />
            {/* Retour Button placed below the line */}
            <div className="flex justify-start mt-2">
              <button 
                onClick={() => setView('gate')}
                className="flex items-center gap-2 text-[10px] tracking-[0.18em] font-mono text-[#C5A850] hover:text-[#111111] transition-colors group cursor-pointer"
              >
                <div className="flex items-center justify-center w-6 h-6 rounded-full border border-current/30 transition-colors shrink-0">
                  <ArrowLeft className="w-3 h-3 transform group-hover:-translate-x-0.5 transition-transform" />
                </div>
                <span>RETOUR</span>
              </button>
            </div>
          </div>

          {/* Core Login Card Layout */}
          <div className="w-full max-w-md mx-auto flex-grow flex flex-col justify-center py-8">
                   {/* Boutique Brand Logo and Box Panel */}
            <div className="mb-4 relative flex flex-col items-center select-none">
              {!logoError ? (
                <img 
                  src="/logo.svg" 
                  alt="HUBSTORES Logo" 
                  className="w-64 h-64 object-contain filter drop-shadow-[0_10px_30px_rgba(212,175,55,0.25)]"
                  referrerPolicy="no-referrer"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <svg className="w-64 h-64 text-[#D4AF37] filter drop-shadow-[0_10px_30px_rgba(212,175,55,0.25)]" viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <style>
                      @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600&amp;display=swap');
                      .logo-text-inline {'{'}
                        font-family: 'Cinzel', 'Playfair Display', 'Georgia', serif;
                        font-weight: 500;
                        fill: currentColor;
                        font-size: 19.5px;
                        letter-spacing: 0.18em;
                      {'}'}
                    </style>
                  </defs>
                  {/* Shifted emblem group to perfectly balance with the text below */}
                  <g transform="translate(10, 15)" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    
                    {/* BOUTIQUE AWNING / CANOPY */}
                    <path d="M 80,45 H 155" strokeWidth="2.6" />
                    <path d="M 80,48.5 H 155" strokeWidth="1.2" />
                    
                    {/* 5 perfectly rounded canopy scallops */}
                    <path d="M 80,48.5 V 60 C 80,65.5 95,65.5 95,60" />
                    <path d="M 95,48.5 V 60 C 95,65.5 110,65.5 110,60" />
                    <path d="M 110,48.5 V 60 C 110,65.5 125,65.5 125,60" />
                    <path d="M 125,48.5 V 60 C 125,65.5 140,65.5 140,60" />
                    <path d="M 140,48.5 V 60 C 140,65.5 155,65.5 155,60" />
                    
                    {/* Canopy vertical seam dividers */}
                    <path d="M 95,48.5 V 60" strokeWidth="1.0" />
                    <path d="M 110,48.5 V 60" strokeWidth="1.0" />
                    <path d="M 125,48.5 V 60" strokeWidth="1.0" />
                    <path d="M 140,48.5 V 60" strokeWidth="1.0" />
                    
                    {/* Shop walls */}
                    <path d="M 155,60 V 118" strokeWidth="2.2" />
                    <path d="M 80,88 V 118" strokeWidth="2.2" />
                    <path d="M 80,118 H 155" strokeWidth="2.2" />

                    {/* CLOTHES HANGER & T-SHIRT inside shop window */}
                    <path d="M 117.5,82.5 C 117.5,77 122.5,77 121,74.5 C 119.5,71.5 115,73 116.5,76.5" strokeWidth="1.6" />
                    <path d="M 104,89.5 L 117.5,83.5 L 131,89.5 Z" strokeWidth="1.6" />
                    <path d="M 106,89.5 L 99,95 L 103,100 L 108,96 L 108,118 L 127,118 L 127,96 L 132,100 L 136,95 L 129,89.5 L 122,89.5 L 117.5,98.5 L 113,89.5 Z" fill="currentColor" stroke="none" />
                    <path d="M 113,89.5 L 117.5,98.5 L 122,89.5" stroke="currentColor" strokeWidth="1.3" />

                    {/* THE FENNEC FOX */}
                    <path d="M 72.5,69.5 C 72.5,55 60.5,41 48,41 C 39,41 41.5,54.5 50.5,65.5 C 57.5,73.5 66.5,76.5 72.5,76.5 Z" strokeWidth="2.6" />
                    <path d="M 56.5,48.5 C 51.5,55 51.5,62 58.5,68.5" strokeWidth="1.3" />
                    <path d="M 45,45 C 42.5,51 45,58 51.5,63.5" strokeWidth="0.8" />

                    <path d="M 73.5,72 C 73.5,58.5 83.5,44 94,44 C 101,44 98.5,55.5 91.5,64.5 C 87,69 81.5,72 73.5,72 Z" strokeWidth="2.2" />
                    <path d="M 84,48.5 C 86.5,54 85,59.5 80.5,64" strokeWidth="1.3" />

                    <path d="M 72.5,76.5 C 72.5,81 81.5,81 84,83 C 86.5,84 84,86.5 80.5,86.5" strokeWidth="2.2" />
                    <path d="M 67.5,75.5 C 70,74.5 73,75.5 74.5,77.5" strokeWidth="1.6" />

                    <path d="M 59,83 C 52,92 57.5,107.5 61,118" strokeWidth="2.2" />
                    <path d="M 72.5,81 C 70,92.5 69,103.5 68,118" strokeWidth="2.2" />

                    <path d="M 61,118 C 50.5,118 50.5,132.5 61,136 C 76.5,139.5 94.5,131.5 112.5,127 C 126,123.5 137.5,118 128.5,112.5 C 115,109 101.5,116 90.5,116 C 79,116 69,112.5 61,118 Z" strokeWidth="2.6" />
                    <path d="M 112.5,127 C 117,123.5 121.5,119 128.5,112.5" strokeWidth="1.9" />
                    <path d="M 95.5,129 C 102,126.5 107.5,123.5 114,118" strokeWidth="1.1" />
                  </g>
                  <text x="120" y="195" className="logo-text-inline" textAnchor="middle">HUBSTORES</text>
                </svg>
              )}
            </div>

            {/* Display Title Sign In */}
            <h2 className="serif-title text-4xl sm:text-5xl text-[#111111] font-light tracking-wide text-left mb-8 select-none">
              Sign In
            </h2>

            {/* Boutique Form */}
            <form onSubmit={handleBoutiqueSubmit} className="space-y-6">
              {renderAuthStatus()}
              
              {/* Email Input Field */}
              <div className="space-y-2">
                <label className="block text-[10px] uppercase tracking-[0.2em] font-mono text-[#111111] font-semibold">
                  EMAIL
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="w-full bg-[#FCFBF9] border border-[#E3DDD0] rounded-lg px-4 py-3.5 text-sm text-[#111111] placeholder-zinc-400 outline-none focus:border-[#C5A850] focus:ring-1 focus:ring-[#C5A850] transition-all"
                />
              </div>

              {/* Password Input Field with toggle */}
              <div className="space-y-2">
                <label className="block text-[10px] uppercase tracking-[0.2em] font-mono text-[#111111] font-semibold">
                  MOT DE PASSE
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#FCFBF9] border border-[#E3DDD0] rounded-lg px-4 py-3.5 pr-11 text-sm text-[#111111] placeholder-zinc-400 outline-none focus:border-[#C5A850] focus:ring-1 focus:ring-[#C5A850] transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-[#111111] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {/* Forget Password link */}
                <div className="text-right">
                  <button
                    type="button"
                    onClick={handleBoutiquePasswordReset}
                    disabled={isLoading}
                    className="text-xs text-zinc-500 hover:text-[#C5A850] disabled:opacity-50 italic transition-colors cursor-pointer"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
              </div>

              {/* Premium Glow Button "Se Connecter" */}
              <div className="pt-3 relative group">
                <div className="absolute -inset-1.5 bg-gradient-to-r from-[#C29D38] via-[#E5C158] to-[#C29D38] rounded-2xl blur-xl opacity-30 group-hover:opacity-75 group-hover:blur-2xl transition-all duration-700 ease-out" />
                <div className="absolute -inset-0.5 bg-gradient-to-r from-[#E5C158] to-[#946E31] rounded-2xl blur-md opacity-20 group-hover:opacity-50 transition-all duration-500 ease-out animate-pulse" />
                
                <motion.button
                  type="submit"
                  whileHover={{ 
                    scale: 1.025, 
                    y: -4,
                    boxShadow: "0 25px 50px -10px rgba(197,168,80,0.5)"
                  }}
                  whileTap={{ scale: 0.975 }}
                  transition={{ type: "spring", stiffness: 400, damping: 18 }}
                  className="w-full relative cursor-pointer overflow-hidden bg-gradient-to-r from-[#DAB24B] via-[#FBE395] to-[#C09A34] text-[#111111] font-bold text-xs tracking-[0.25em] uppercase py-4.5 rounded-xl shadow-[0_12px_35px_rgba(197,168,80,0.35)] border-t border-l border-[#FFF6D1]/50 border-r border-b border-[#8C6B1C]/40 flex items-center justify-center transition-all duration-300"
                >
                  {/* Subtle inner metallic border glow */}
                  <div className="absolute inset-0.5 rounded-[10px] border border-white/20 pointer-events-none" />

                  {/* Shifting background gradient overlay on hover */}
                  <motion.div 
                    className="absolute inset-0 bg-gradient-to-r from-[#FBE395] via-[#E5C158] to-[#DAB24B] opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                  />

                  {/* Continuous automated luxury glare sweep (loops every 3s) + faster hover sweep */}
                  <motion.div
                    animate={{ 
                      x: ["-100%", "200%"],
                    }}
                    transition={{ 
                      repeat: Infinity, 
                      repeatDelay: 2.2,
                      duration: 1.3, 
                      ease: [0.16, 1, 0.3, 1] 
                    }}
                    className="absolute inset-y-0 left-0 w-2/3 bg-gradient-to-r from-transparent via-white/45 to-transparent skew-x-12 pointer-events-none z-10"
                  />

                  <span className="relative z-10 border-b border-[#111111]/30 pb-0.5 group-hover:border-[#111111] transition-colors duration-300">
                    Se Connecter
                  </span>
                </motion.button>
              </div>

            </form>

            {/* Separator Line */}
            <div className="relative my-8 text-center select-none">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E3DDD0]" />
              </div>
              <span className="relative bg-[#F4EFE6] px-4 font-mono text-[9px] text-zinc-400 uppercase tracking-[0.25em]">
                OU CONTINUER AVEC
              </span>
            </div>

            {/* Algerian Edition Beautiful Green Social Buttons Grid */}
            <div className="grid grid-cols-4 gap-3.5">
              {/* Google Button */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.08, y: -3 }}
                whileTap={{ scale: 0.92 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                onClick={() => handleGoogleSignIn(UserRole.BOUTIQUE)}
                className="group relative flex items-center justify-center bg-gradient-to-br from-[#457958] via-[#3F6E50] to-[#2B4E38] border border-[#528A65]/60 hover:border-[#D4AF37] text-white p-3.5 rounded-xl shadow-[0_4px_15px_rgba(63,110,80,0.3)] hover:shadow-[0_8px_25px_rgba(63,110,80,0.55),0_0_15px_rgba(212,175,55,0.35)] transition-all duration-300 cursor-pointer overflow-hidden"
                title="Continuer avec Google"
              >
                {/* Shimmer Light Reflection Sweep */}
                <div className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 -translate-x-full group-hover:translate-x-[300%] transition-transform duration-1000 ease-in-out pointer-events-none" />
                
                <motion.div
                  whileHover={{ scale: 1.15, rotate: [0, -6, 6, 0] }}
                  transition={{ duration: 0.3 }}
                >
                  <svg className="w-5 h-5 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09zM12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23zM5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63zM12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1c-4.3 0-8.01 2.47-9.82 6.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                </motion.div>
              </motion.button>

              {/* Facebook Button */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.08, y: -3 }}
                whileTap={{ scale: 0.92 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                disabled
                aria-disabled="true"
                className="group relative flex items-center justify-center bg-gradient-to-br from-[#457958] via-[#3F6E50] to-[#2B4E38] border border-[#528A65]/30 text-white/35 p-3.5 rounded-xl opacity-45 cursor-not-allowed overflow-hidden"
                title="Facebook bientôt disponible"
              >
                {/* Shimmer Light Reflection Sweep */}
                <div className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 -translate-x-full group-hover:translate-x-[300%] transition-transform duration-1000 ease-in-out pointer-events-none" />

                <motion.div
                  whileHover={{ scale: 1.15, rotate: [0, -6, 6, 0] }}
                  transition={{ duration: 0.3 }}
                >
                  <svg className="w-5 h-5 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1V12h3v3h-3v6.8c4.56-.93 8-4.96 8-9.8z"/>
                  </svg>
                </motion.div>
              </motion.button>

              {/* Instagram Button */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.08, y: -3 }}
                whileTap={{ scale: 0.92 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                disabled
                aria-disabled="true"
                className="group relative flex items-center justify-center bg-gradient-to-br from-[#457958] via-[#3F6E50] to-[#2B4E38] border border-[#528A65]/30 text-white/35 p-3.5 rounded-xl opacity-45 cursor-not-allowed overflow-hidden"
                title="Instagram bientôt disponible"
              >
                {/* Shimmer Light Reflection Sweep */}
                <div className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 -translate-x-full group-hover:translate-x-[300%] transition-transform duration-1000 ease-in-out pointer-events-none" />

                <motion.div
                  whileHover={{ scale: 1.15, rotate: [0, -6, 6, 0] }}
                  transition={{ duration: 0.3 }}
                >
                  <svg className="w-5 h-5 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                  </svg>
                </motion.div>
              </motion.button>

              {/* TikTok Button */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.08, y: -3 }}
                whileTap={{ scale: 0.92 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                disabled
                aria-disabled="true"
                className="group relative flex items-center justify-center bg-gradient-to-br from-[#457958] via-[#3F6E50] to-[#2B4E38] border border-[#528A65]/30 text-white/35 p-3.5 rounded-xl opacity-45 cursor-not-allowed overflow-hidden"
                title="TikTok bientôt disponible"
              >
                {/* Shimmer Light Reflection Sweep */}
                <div className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 -translate-x-full group-hover:translate-x-[300%] transition-transform duration-1000 ease-in-out pointer-events-none" />

                <motion.div
                  whileHover={{ scale: 1.15, rotate: [0, -6, 6, 0] }}
                  transition={{ duration: 0.3 }}
                >
                  <svg className="w-5 h-5 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                  </svg>
                </motion.div>
              </motion.button>
            </div>

            {/* Create Account Secondary Button */}
            <div className="mt-8 text-center space-y-3">
              <span className="block text-xs font-sans text-zinc-500">Pas encore de boutique ?</span>
              <button
                type="button"
                onClick={() => setView('boutique_register')}
                className="w-full bg-[#FAF8F5] hover:bg-[#FAF8F5]/80 active:scale-99 border border-[#111111]/80 text-[#111111] text-xs font-bold font-sans tracking-widest py-3.5 rounded-xl shadow-[0_4px_10px_rgba(0,0,0,0.06)] transition-all cursor-pointer"
              >
                CRÉER UN COMPTE
              </button>
            </div>

          </div>

          {/* Footer bar */}
          <div className="w-full flex flex-col items-center gap-1 py-2 text-center select-none opacity-40 hover:opacity-100 transition-opacity">
            <span className="font-sans text-[9px] uppercase tracking-[0.25em] text-[#111111] font-medium">
              Conditions · Confidentialite
            </span>
            <span 
              onClick={handleAdminTrigger}
              className="font-sans text-[9px] uppercase tracking-[0.3em] text-[#C5A850] font-semibold mt-1 cursor-pointer hover:opacity-80 transition-opacity"
            >
              Créé par IA Station
            </span>
          </div>
        </motion.div>
      ) : view === 'boutique_register' ? (
        <motion.div
          key="boutique_register"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 bg-[#F4EFE6] text-[#111111] flex flex-col items-center p-6 md:p-12 z-30 overflow-y-auto selection:bg-luxury-gold selection:text-black"
        >
          {/* Header Bar */}
          <div className="w-full max-w-md mx-auto pt-5 md:pt-6 flex justify-between items-center select-none">
            <button 
              onClick={() => setView('boutique_login')}
              className="flex items-center gap-2 text-xs font-mono text-zinc-600 hover:text-black transition-colors group cursor-pointer"
            >
              <div className="flex items-center justify-center w-7 h-7 rounded-full border border-current/30 transition-colors shrink-0">
                <ArrowLeft className="w-3.5 h-3.5 transform group-hover:-translate-x-0.5 transition-transform" />
              </div>
              <span>RETOUR</span>
            </button>
            <div className="flex items-center gap-1">
              <svg className="w-6 h-6 text-[#E5C158]" viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M 72.5,69.5 C 72.5,55 60.5,41 48,41 C 39,41 41.5,54.5 50.5,65.5 C 57.5,73.5 66.5,76.5 72.5,76.5 Z" />
                  <path d="M 73.5,72 C 73.5,58.5 83.5,44 94,44 C 101,44 98.5,55.5 91.5,64.5" />
                  <path d="M 72.5,76.5 C 72.5,81 81.5,81 84,83" />
                  <path d="M 59,83 C 52,92 57.5,107.5 61,118" />
                  <path d="M 72.5,81 C 70,92.5 69,103.5 68,118" />
                  <path d="M 61,118 C 50.5,118 50.5,132.5 61,136 C 76.5,139.5 94.5,131.5 112.5,127" />
                </g>
              </svg>
              <span className="font-serif text-sm tracking-[0.2em] text-[#C5A850] font-semibold">HUBSTORES.</span>
            </div>
          </div>

          {/* Core Register Layout */}
          <div className="w-full max-w-md mx-auto flex-grow py-8">
            <h2 className="serif-title text-4xl sm:text-5xl text-[#111111] font-light tracking-wide text-left mb-8 select-none">
              Créer mon compte
            </h2>

            <form onSubmit={handleRegisterSubmit} className="space-y-8">
              {renderAuthStatus()}
              {/* Section 1: IDENTIFIANTS */}
              <div className="space-y-6">
                <div>
                  <span className="text-xs uppercase font-mono tracking-widest text-[#C5A850] font-semibold">
                    1. IDENTIFIANTS
                  </span>
                  <div className="h-[1px] bg-[#C5A850]/45 w-full mt-2" />
                </div>
                
                {/* EMAIL PROFESSIONNEL */}
                <div className="space-y-2">
                  <label className="block text-[10px] uppercase tracking-[0.2em] font-mono text-[#111111] font-semibold">
                    EMAIL PROFESSIONNEL
                  </label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    placeholder="votre@email.com"
                    className="w-full bg-[#FCFBF9] border border-[#E3DDD0] rounded-lg px-4 py-3.5 text-sm text-[#111111] placeholder-zinc-400 outline-none focus:border-[#C5A850] focus:ring-1 focus:ring-[#C5A850] transition-all"
                  />
                </div>

                {/* NOM DE BOUTIQUE */}
                <div className="space-y-2">
                  <label className="block text-[10px] uppercase tracking-[0.2em] font-mono text-[#111111] font-semibold">
                    NOM DE BOUTIQUE
                  </label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={100}
                    autoComplete="name"
                    disabled={isLoading}
                    value={regBoutiqueName}
                    onChange={e => setRegBoutiqueName(e.target.value)}
                    placeholder="nom boutique"
                    className="w-full bg-[#FCFBF9] border border-[#E3DDD0] rounded-lg px-4 py-3.5 text-sm text-[#111111] placeholder-zinc-400 outline-none focus:border-[#C5A850] focus:ring-1 focus:ring-[#C5A850] transition-all"
                  />
                </div>

                {/* MOT DE PASSE */}
                <div className="space-y-2">
                  <label className="block text-[10px] uppercase tracking-[0.2em] font-mono text-[#111111] font-semibold">
                    MOT DE PASSE
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? "text" : "password"}
                      required
                      minLength={8}
                      value={regPassword}
                      onChange={e => setRegPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#FCFBF9] border border-[#E3DDD0] rounded-lg px-4 py-3.5 pr-11 text-sm text-[#111111] placeholder-zinc-400 outline-none focus:border-[#C5A850] focus:ring-1 focus:ring-[#C5A850] transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-[#111111] transition-colors"
                    >
                      {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* CONFIRMER LE MOT DE PASSE */}
                <div className="space-y-2">
                  <label className="block text-[10px] uppercase tracking-[0.2em] font-mono text-[#111111] font-semibold">
                    CONFIRMER LE MOT DE PASSE
                  </label>
                  <div className="relative">
                    <input
                      type={showRegConfirmPassword ? "text" : "password"}
                      required
                      minLength={8}
                      value={regConfirmPassword}
                      onChange={e => setRegConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#FCFBF9] border border-[#E3DDD0] rounded-lg px-4 py-3.5 pr-11 text-sm text-[#111111] placeholder-zinc-400 outline-none focus:border-[#C5A850] focus:ring-1 focus:ring-[#C5A850] transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-[#111111] transition-colors"
                    >
                      {showRegConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Section 2: DOCUMENTS REQUIS */}
              <div className="space-y-6">
                <div>
                  <span className="text-xs uppercase font-mono tracking-widest text-[#C5A850] font-semibold">
                    2. DOCUMENTS REQUIS
                  </span>
                  <div className="h-[1px] bg-[#C5A850]/45 w-full mt-2" />
                </div>

                {/* LOGO DE LA BOUTIQUE */}
                <div className="space-y-2">
                  <label className="block text-[10px] uppercase tracking-[0.2em] font-mono text-[#111111] font-semibold">
                    LOGO DE LA BOUTIQUE
                  </label>
                  
                  <div 
                    onDragOver={(e) => { e.preventDefault(); setIsDragOverLogo(true); }}
                    onDragLeave={() => setIsDragOverLogo(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragOverLogo(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        selectBoutiqueLogo(e.dataTransfer.files[0]);
                      }
                    }}
                    className={`border border-[#E3DDD0] bg-[#FCFBF9] rounded-lg p-6 flex flex-col items-center justify-center text-center transition-all shadow-[0_4px_12px_rgba(0,0,0,0.03)] ${isDragOverLogo ? 'border-[#C5A850] bg-[#C5A850]/5' : ''}`}
                  >
                    <Upload className="w-8 h-8 text-zinc-400 mb-3" />
                    
                    {logoFile ? (
                      <div className="space-y-2 mb-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Check className="w-3.5 h-3.5" />
                          {logoFile.name}
                        </span>
                        <p className="text-[11px] text-zinc-400">Glissez-déposez un autre logo pour le remplacer</p>
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-500 mb-4">JPG, PNG ou WebP · conversion WebP automatique · 1 Mo après optimisation.</p>
                    )}

                    <label className="cursor-pointer bg-black text-white text-xs font-semibold tracking-wider px-6 py-2.5 rounded-md hover:bg-zinc-800 transition-colors inline-block select-none">
                      Parcourir
                      <input 
                        type="file" 
                        accept="image/jpeg,image/png,image/webp" 
                        disabled={isLoading}
                        className="hidden" 
                        onChange={e => {
                          if (e.target.files && e.target.files[0]) {
                            selectBoutiqueLogo(e.target.files[0]);
                          }
                        }}
                      />
                    </label>

                    {logoErrorMsg && (
                      <p className="text-xs text-[#b43a2b] mt-4 font-light select-none italic" role="alert">
                        {logoErrorMsg}
                      </p>
                    )}
                  </div>
                </div>

                {/* DOCUMENTS D'INSCRIPTION */}
                <div className="space-y-2">
                  <label className="block text-[10px] uppercase tracking-[0.2em] font-mono text-[#111111] font-semibold">
                    DOCUMENT LÉGAL DE LA BOUTIQUE
                  </label>
                  
                  <div 
                    onDragOver={(e) => { e.preventDefault(); setIsDragOverDoc(true); }}
                    onDragLeave={() => setIsDragOverDoc(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragOverDoc(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        selectBoutiqueDocument(e.dataTransfer.files[0]);
                      }
                    }}
                    className={`border border-[#E3DDD0] bg-[#FCFBF9] rounded-lg p-6 flex flex-col items-center justify-center text-center transition-all shadow-[0_4px_12px_rgba(0,0,0,0.03)] ${isDragOverDoc ? 'border-[#C5A850] bg-[#C5A850]/5' : ''}`}
                  >
                    <Upload className="w-8 h-8 text-zinc-400 mb-3" />
                    
                    {docFile ? (
                      <div className="space-y-2 mb-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Check className="w-3.5 h-3.5" />
                          {docFile.name}
                        </span>
                        <p className="text-[11px] text-zinc-400">Glissez-déposez un autre document pour le remplacer</p>
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-500 mb-4 px-4 leading-relaxed">
                        PDF, JPG, PNG ou WebP · maximum 5 Mo · accès privé.
                      </p>
                    )}

                    <label className="cursor-pointer bg-black text-white text-xs font-semibold tracking-wider px-6 py-2.5 rounded-md hover:bg-zinc-800 transition-colors inline-block select-none">
                      Parcourir
                      <input 
                        type="file" 
                        accept="application/pdf,image/jpeg,image/png,image/webp" 
                        disabled={isLoading}
                        className="hidden" 
                        onChange={e => {
                          if (e.target.files && e.target.files[0]) {
                            selectBoutiqueDocument(e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Terms Checkbox and Create Account Button */}
              <div className="pt-4 space-y-6">
                <label className="flex items-start gap-3 cursor-pointer text-xs sm:text-sm text-zinc-600 font-light select-none">
                  <input 
                    type="checkbox" 
                    checked={acceptedTerms}
                    onChange={e => setAcceptedTerms(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-[#E3DDD0] text-[#C5A850] focus:ring-[#C5A850] accent-[#C5A850] cursor-pointer"
                  />
                  <span className="leading-tight">
                    J'accepte les conditions d'utilisation et la politique de confidentialité.
                  </span>
                </label>

                {/* Submit Button */}
                <div className="relative group">
                  <div className="absolute -inset-1.5 bg-gradient-to-r from-[#C29D38] via-[#E5C158] to-[#C29D38] rounded-2xl blur-xl opacity-40 group-hover:opacity-85 group-hover:blur-2xl transition-all duration-700 ease-out" />
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full relative cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 overflow-hidden bg-gradient-to-r from-[#DAB24B] via-[#FBE395] to-[#C09A34] text-[#111111] font-bold text-xs tracking-[0.25em] uppercase py-4.5 rounded-xl shadow-[0_12px_35px_rgba(197,168,80,0.45)] border-t border-l border-[#FFF6D1]/50 border-r border-b border-[#8C6B1C]/40 flex items-center justify-center transition-all duration-300"
                  >
                    <span className="relative z-10 pb-0.5 group-hover:border-[#111111] transition-colors duration-300">
                      {isLoading ? 'CRÉATION EN COURS…' : 'CRÉER MON COMPTE'}
                    </span>
                  </button>
                </div>

                {/* Back to Sign In */}
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setView('boutique_login')}
                    className="text-xs text-zinc-600 hover:text-[#C5A850] transition-colors cursor-pointer"
                  >
                    Déjà inscrit ? <span className="underline font-medium">Se connecter</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Footer bar */}
          <div className="w-full flex flex-col items-center gap-1 py-2 text-center select-none opacity-40 hover:opacity-100 transition-opacity mt-auto">
            <span className="font-sans text-[9px] uppercase tracking-[0.25em] text-[#111111] font-medium">
              Conditions · Confidentialite
            </span>
            <span 
              onClick={handleAdminTrigger}
              className="font-sans text-[9px] uppercase tracking-[0.3em] text-[#C5A850] font-semibold mt-1 cursor-pointer hover:opacity-80 transition-opacity"
            >
              Créé par IA Station
            </span>
          </div>
        </motion.div>
      ) : view === 'admin_login' ? (
        <motion.div
          key="admin_login"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 bg-[#090909] text-[#FAF8F5] flex flex-col items-center p-6 md:p-12 z-30 overflow-y-auto selection:bg-luxury-gold selection:text-black animate-fadeIn"
        >
          {/* Header Bar */}
          <div className="w-full max-w-md mx-auto pt-5 md:pt-6">
            <div className="flex justify-between items-center text-[10px] tracking-[0.18em] font-mono text-[#C5A850] font-medium">
              <span>ADMINISTRATION SÉCURISÉE</span>
              <span>CENTRE SOUVERAIN</span>
            </div>
            <div className="h-[1px] bg-red-950/40 w-full mt-2" />
            <div className="flex justify-start mt-2">
              <button 
                type="button"
                onClick={() => setView('gate')}
                className="flex items-center gap-2 text-[10px] tracking-[0.18em] font-mono text-[#C5A850] hover:text-white transition-colors group cursor-pointer"
              >
                <div className="flex items-center justify-center w-6 h-6 rounded-full border border-current/30 transition-colors shrink-0">
                  <ArrowLeft className="w-3 h-3 transform group-hover:-translate-x-0.5 transition-transform" />
                </div>
                <span>RETOUR</span>
              </button>
            </div>
          </div>

          {/* Core Admin Login */}
          <div className="w-full max-w-md mx-auto flex-grow flex flex-col justify-center py-8">
            <div className="mb-4 relative flex flex-col items-center select-none">
              <motion.div 
                className="w-24 h-24 flex items-center justify-center rounded-full bg-[#141414] border border-red-900/30 shadow-[0_10px_30px_rgba(0,0,0,0.6)]"
                whileHover={{ scale: 1.05 }}
              >
                <Lock className="w-8 h-8 text-red-500" />
              </motion.div>
            </div>

            <h2 className="serif-title text-3xl text-white font-light tracking-wide text-left mb-2 select-none">
              Espace Administrateur
            </h2>
            <p className="text-zinc-400 text-xs font-light tracking-wide mb-6">
              Connectez-vous pour valider les comptes, examiner les dossiers légaux et réguler StoreHub.
            </p>

            <form onSubmit={handleAdminSubmit} className="space-y-5">
              {renderAuthStatus()}

              {/* Email */}
              <div className="space-y-2">
                <label className="block text-[10px] uppercase tracking-[0.2em] font-mono text-zinc-300 font-semibold">
                  EMAIL ADMINISTRATEUR
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    disabled={isLoading}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="admin@votre-domaine.com"
                    className="w-full bg-[#121212] border border-zinc-800 rounded-lg pl-11 pr-4 py-3.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-red-800 focus:ring-1 focus:ring-red-800 transition-all font-mono"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="block text-[10px] uppercase tracking-[0.2em] font-mono text-zinc-300 font-semibold">
                  MOT DE PASSE SÉCURISÉ
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#121212] border border-zinc-800 rounded-lg pl-11 pr-11 py-3.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-red-800 focus:ring-1 focus:ring-red-800 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit button */}
              <div className="pt-2 relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-red-950 via-red-900 to-red-950 rounded-xl blur-lg opacity-40 group-hover:opacity-80 transition-all duration-500" />
                <button
                  type="submit"
                  className="w-full relative cursor-pointer bg-red-950 border border-red-800 text-red-200 font-bold text-xs tracking-[0.2em] uppercase py-4 rounded-xl shadow-lg flex items-center justify-center transition-all hover:bg-red-900"
                >
                  ENTRER DANS LE QUARTIER GÉNÉRAL
                </button>
              </div>
            </form>
          </div>

          {/* Footer bar */}
          <div className="w-full flex flex-col items-center gap-1 py-2 text-center select-none opacity-40 mt-auto">
            <span className="font-sans text-[9px] uppercase tracking-[0.25em] text-[#FAF8F5] font-medium">
              Système de Protection StoreHub HQ
            </span>
          </div>
        </motion.div>
      ) : view === 'client_login' ? (
        <motion.div
          key="client_login"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 bg-[#0E0E0E] text-[#FAF8F5] flex flex-col items-center p-6 md:p-12 z-30 overflow-y-auto selection:bg-luxury-gold selection:text-black"
        >
          {/* Header Bar */}
          <div className="w-full max-w-md mx-auto pt-5 md:pt-6">
            <div className="flex justify-between items-center text-[10px] tracking-[0.18em] font-mono text-[#C5A850] font-medium">
              <span>N° 01 · ÉDITION ALGÉRIENNE</span>
              <span>PORTAIL CLIENT</span>
            </div>
            {/* Elegant Solid Underline Accent */}
            <div className="h-[1px] bg-[#C5A850]/25 w-full mt-2" />
            {/* Retour Button placed below the line */}
            <div className="flex justify-start mt-2">
              <button 
                onClick={() => setView('gate')}
                className="flex items-center gap-2 text-[10px] tracking-[0.18em] font-mono text-[#C5A850] hover:text-white transition-colors group cursor-pointer"
              >
                <div className="flex items-center justify-center w-6 h-6 rounded-full border border-current/30 transition-colors shrink-0">
                  <ArrowLeft className="w-3 h-3 transform group-hover:-translate-x-0.5 transition-transform" />
                </div>
                <span>RETOUR</span>
              </button>
            </div>
          </div>

          {/* Core Login Card Layout */}
          <div className="w-full max-w-md mx-auto flex-grow flex flex-col justify-center py-8">
            
            {/* Elegant SVG Hanger Icon for Clients */}
            <div className="mb-4 relative flex flex-col items-center select-none">
              <motion.div 
                className="w-40 h-40 flex items-center justify-center rounded-full bg-[#181818] border border-[#C5A850]/20 shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
                whileHover={{ scale: 1.05 }}
              >
                <svg className="w-20 h-20 text-[#C5A850]" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <path d="M50 40 C50 28 62 28 62 34 C62 42 50 44 50 48" strokeLinecap="round" />
                  <path d="M50 48 L20 68 C18 69.5 19 72 21.5 72 L78.5 72 C81 72 82 69.5 80 68 L50 48 Z" strokeLinejoin="round" />
                </svg>
              </motion.div>
            </div>

            {/* Display Title Sign In */}
            <h2 className="serif-title text-4xl sm:text-5xl text-white font-light tracking-wide text-left mb-2 select-none">
              Connexion Client
            </h2>
            <p className="text-zinc-400 text-xs font-light tracking-wide mb-8">
              Entrez dans l'univers exclusif de la haute couture et du prêt-à-porter algérien.
            </p>

            {/* Client Form */}
            <form onSubmit={handleClientSubmit} className="space-y-6">
              {renderAuthStatus()}
              
              {/* Email Input Field */}
              <div className="space-y-2">
                <label className="block text-[10px] uppercase tracking-[0.2em] font-mono text-zinc-300 font-semibold">
                  ADRESSE EMAIL
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    disabled={isLoading}
                    value={clientEmail}
                    onChange={e => setClientEmail(e.target.value)}
                    placeholder="votre@email.com"
                    className="w-full bg-[#161616] border border-[#2D2D2D] rounded-lg pl-11 pr-4 py-3.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#C5A850] focus:ring-1 focus:ring-[#C5A850] transition-all"
                  />
                </div>
              </div>

              {/* Password Input Field with toggle */}
              <div className="space-y-2">
                <label className="block text-[10px] uppercase tracking-[0.2em] font-mono text-zinc-300 font-semibold">
                  MOT DE PASSE
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showClientPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    disabled={isLoading}
                    value={clientPassword}
                    onChange={e => setClientPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#161616] border border-[#2D2D2D] rounded-lg pl-11 pr-11 py-3.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#C5A850] focus:ring-1 focus:ring-[#C5A850] transition-all font-mono"
                  />
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => setShowClientPassword(!showClientPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors animate-fadeIn"
                  >
                    {showClientPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {/* Forget Password link */}
                <div className="text-right">
                  <button type="button" onClick={handleClientPasswordReset} disabled={isLoading} className="text-xs text-zinc-500 hover:text-[#C5A850] disabled:opacity-50 italic transition-colors cursor-pointer">
                    Mot de passe oublié ?
                  </button>
                </div>
              </div>

              {/* Premium Glow Button "Entrer" */}
              <div className="pt-3 relative group">
                <div className="absolute -inset-1.5 bg-gradient-to-r from-[#C29D38] via-[#E5C158] to-[#C29D38] rounded-2xl blur-xl opacity-30 group-hover:opacity-75 group-hover:blur-2xl transition-all duration-700 ease-out" />
                <div className="absolute -inset-0.5 bg-gradient-to-r from-[#E5C158] to-[#946E31] rounded-2xl blur-md opacity-20 group-hover:opacity-50 transition-all duration-500 ease-out animate-pulse" />
                
                <motion.button
                  type="submit"
                  disabled={isLoading}
                  whileHover={{ 
                    scale: 1.025, 
                    y: -4,
                    boxShadow: "0 25px 50px -10px rgba(197,168,80,0.5)"
                  }}
                  whileTap={{ scale: 0.975 }}
                  transition={{ type: "spring", stiffness: 400, damping: 18 }}
                  className="w-full relative cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 overflow-hidden bg-gradient-to-r from-[#DAB24B] via-[#FBE395] to-[#C09A34] text-[#111111] font-bold text-xs tracking-[0.25em] uppercase py-4.5 rounded-xl shadow-[0_12px_35px_rgba(197,168,80,0.35)] border-t border-l border-[#FFF6D1]/50 border-r border-b border-[#8C6B1C]/40 flex items-center justify-center transition-all duration-300"
                >
                  <div className="absolute inset-0.5 rounded-[10px] border border-white/20 pointer-events-none" />
                  <motion.div 
                    className="absolute inset-0 bg-gradient-to-r from-[#FBE395] via-[#E5C158] to-[#DAB24B] opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                  />
                  <motion.div
                    animate={{ 
                      x: ["-100%", "200%"],
                    }}
                    transition={{ 
                      repeat: Infinity, 
                      repeatDelay: 2.2,
                      duration: 1.3, 
                      ease: [0.16, 1, 0.3, 1] 
                    }}
                    className="absolute inset-y-0 left-0 w-2/3 bg-gradient-to-r from-transparent via-white/45 to-transparent skew-x-12 pointer-events-none z-10"
                  />
                  <span className="relative z-10 border-b border-[#111111]/30 pb-0.5 group-hover:border-[#111111] transition-colors duration-300">
                    {isLoading ? 'CONNEXION…' : 'Entrer dans la Galerie'}
                  </span>
                </motion.button>
              </div>

            </form>

            {/* Separator Line */}
            <div className="relative my-8 text-center select-none">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#222222]" />
              </div>
              <span className="relative bg-[#0E0E0E] px-4 font-mono text-[9px] text-zinc-500 uppercase tracking-[0.25em]">
                OU CONTINUER AVEC
              </span>
            </div>

            {/* Premium Green & Gold Social Buttons Grid */}
            <div className="grid grid-cols-4 gap-3.5">
              <motion.button
                type="button"
                whileHover={{ scale: 1.08, y: -3 }}
                whileTap={{ scale: 0.92 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                onClick={() => handleGoogleSignIn(UserRole.CLIENT)}
                className="group relative flex items-center justify-center bg-gradient-to-br from-[#1C2C22] via-[#243A2C] to-[#14221A] border border-[#3E624A]/60 hover:border-[#C5A850] text-[#C5A850] p-3.5 rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.5)] hover:shadow-[0_8px_25px_rgba(62,98,74,0.45),0_0_15px_rgba(197,168,80,0.3)] transition-all duration-300 cursor-pointer overflow-hidden"
                title="Continuer avec Google"
              >
                {/* Shimmer Light Reflection Sweep */}
                <div className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-[#C5A850]/25 to-transparent skew-x-12 -translate-x-full group-hover:translate-x-[300%] transition-transform duration-1000 ease-in-out pointer-events-none" />

                <motion.div
                  whileHover={{ scale: 1.15, rotate: [0, -6, 6, 0] }}
                  transition={{ duration: 0.3 }}
                >
                  <svg className="w-5 h-5 text-[#C5A850] drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09zM12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23zM5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63zM12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1c-4.3 0-8.01 2.47-9.82 6.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                </motion.div>
              </motion.button>

              <motion.button
                type="button"
                whileHover={{ scale: 1.08, y: -3 }}
                whileTap={{ scale: 0.92 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                disabled
                aria-disabled="true"
                className="group relative flex items-center justify-center bg-gradient-to-br from-[#1C2C22] via-[#243A2C] to-[#14221A] border border-[#3E624A]/30 text-[#C5A850]/35 p-3.5 rounded-xl opacity-45 cursor-not-allowed overflow-hidden"
                title="Facebook bientôt disponible"
              >
                {/* Shimmer Light Reflection Sweep */}
                <div className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-[#C5A850]/25 to-transparent skew-x-12 -translate-x-full group-hover:translate-x-[300%] transition-transform duration-1000 ease-in-out pointer-events-none" />

                <motion.div
                  whileHover={{ scale: 1.15, rotate: [0, -6, 6, 0] }}
                  transition={{ duration: 0.3 }}
                >
                  <svg className="w-5 h-5 text-[#C5A850] drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1V12h3v3h-3v6.8c4.56-.93 8-4.96 8-9.8z"/>
                  </svg>
                </motion.div>
              </motion.button>

              <motion.button
                type="button"
                whileHover={{ scale: 1.08, y: -3 }}
                whileTap={{ scale: 0.92 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                disabled
                aria-disabled="true"
                className="group relative flex items-center justify-center bg-gradient-to-br from-[#1C2C22] via-[#243A2C] to-[#14221A] border border-[#3E624A]/30 text-[#C5A850]/35 p-3.5 rounded-xl opacity-45 cursor-not-allowed overflow-hidden"
                title="Instagram bientôt disponible"
              >
                {/* Shimmer Light Reflection Sweep */}
                <div className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-[#C5A850]/25 to-transparent skew-x-12 -translate-x-full group-hover:translate-x-[300%] transition-transform duration-1000 ease-in-out pointer-events-none" />

                <motion.div
                  whileHover={{ scale: 1.15, rotate: [0, -6, 6, 0] }}
                  transition={{ duration: 0.3 }}
                >
                  <svg className="w-5 h-5 text-[#C5A850] drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                  </svg>
                </motion.div>
              </motion.button>

              <motion.button
                type="button"
                whileHover={{ scale: 1.08, y: -3 }}
                whileTap={{ scale: 0.92 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                disabled
                aria-disabled="true"
                className="group relative flex items-center justify-center bg-[#1C2C22] via-[#243A2C] to-[#14221A] bg-gradient-to-br border border-[#3E624A]/30 text-[#C5A850]/35 p-3.5 rounded-xl opacity-45 cursor-not-allowed overflow-hidden"
                title="TikTok bientôt disponible"
              >
                {/* Shimmer Light Reflection Sweep */}
                <div className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-[#C5A850]/25 to-transparent skew-x-12 -translate-x-full group-hover:translate-x-[300%] transition-transform duration-1000 ease-in-out pointer-events-none" />

                <motion.div
                  whileHover={{ scale: 1.15, rotate: [0, -6, 6, 0] }}
                  transition={{ duration: 0.3 }}
                >
                  <svg className="w-5 h-5 text-[#C5A850] drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                  </svg>
                </motion.div>
              </motion.button>
            </div>

            {/* Create Client Account Secondary Button */}
            <div className="mt-8 text-center space-y-3">
              <span className="block text-xs font-sans text-zinc-500">Pas encore de compte membre ?</span>
              <button
                type="button"
                onClick={() => setView('client_register')}
                className="w-full bg-[#181818] hover:bg-[#222222] active:scale-99 border border-[#C5A850]/50 text-white text-xs font-bold font-sans tracking-widest py-3.5 rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.5)] transition-all cursor-pointer"
              >
                CRÉER MON COMPTE CLIENT
              </button>
            </div>

          </div>

          {/* Footer bar */}
          <div className="w-full flex flex-col items-center gap-1 py-2 text-center select-none opacity-30 hover:opacity-100 transition-opacity mt-auto">
            <span className="font-sans text-[9px] uppercase tracking-[0.25em] text-white font-medium">
              Conditions · Confidentialite
            </span>
            <span 
              onClick={handleAdminTrigger}
              className="font-sans text-[9px] uppercase tracking-[0.3em] text-[#C5A850] font-semibold mt-1 cursor-pointer hover:opacity-80 transition-opacity"
            >
              Créé par IA Station
            </span>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="client_register"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 bg-[#0E0E0E] text-[#FAF8F5] flex flex-col items-center p-6 md:p-12 z-30 overflow-y-auto selection:bg-luxury-gold selection:text-black"
        >
          {/* Header Bar */}
          <div className="w-full max-w-md mx-auto pt-5 md:pt-6">
            <div className="flex justify-between items-center text-[10px] tracking-[0.18em] font-mono text-[#C5A850] font-medium">
              <span>N° 01 · ÉDITION ALGÉRIENNE</span>
              <span>INSCRIPTION CLIENT</span>
            </div>
            {/* Elegant Solid Underline Accent */}
            <div className="h-[1px] bg-[#C5A850]/25 w-full mt-2" />
            {/* Retour Button placed below the line */}
            <div className="flex justify-start mt-2">
              <button 
                onClick={() => setView('client_login')}
                className="flex items-center gap-2 text-[10px] tracking-[0.18em] font-mono text-[#C5A850] hover:text-white transition-colors group cursor-pointer"
              >
                <div className="flex items-center justify-center w-6 h-6 rounded-full border border-current/30 transition-colors shrink-0">
                  <ArrowLeft className="w-3 h-3 transform group-hover:-translate-x-0.5 transition-transform" />
                </div>
                <span>RETOUR</span>
              </button>
            </div>
          </div>

          {/* Core Registration Card Layout */}
          <div className="w-full max-w-md mx-auto flex-grow flex flex-col justify-center py-8">
            
            <h2 className="serif-title text-4xl sm:text-5xl text-white font-light tracking-wide text-left mb-2 select-none">
              Devenir Membre
            </h2>
            <p className="text-zinc-400 text-xs font-light tracking-wide mb-8">
              Rejoignez le vestiaire Store Hub pour enregistrer vos coups de cœur et consulter vos stylistes préférés.
            </p>

            <form onSubmit={handleClientRegisterSubmit} className="space-y-5">
              {renderAuthStatus()}
              
              {/* Nom Complet */}
              <div className="space-y-2">
                <label className="block text-[10px] uppercase tracking-[0.2em] font-mono text-zinc-300 font-semibold">
                  NOM COMPLET
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={100}
                    autoComplete="name"
                    disabled={isLoading}
                    value={regClientName}
                    onChange={e => setRegClientName(e.target.value)}
                    placeholder="Mounir Benali"
                    className="w-full bg-[#161616] border border-[#2D2D2D] rounded-lg pl-11 pr-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#C5A850] focus:ring-1 focus:ring-[#C5A850] transition-all"
                  />
                </div>
              </div>

              {/* Email Input Field */}
              <div className="space-y-2">
                <label className="block text-[10px] uppercase tracking-[0.2em] font-mono text-zinc-300 font-semibold">
                  ADRESSE EMAIL
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    disabled={isLoading}
                    value={regClientEmail}
                    onChange={e => setRegClientEmail(e.target.value)}
                    placeholder="votre@email.com"
                    className="w-full bg-[#161616] border border-[#2D2D2D] rounded-lg pl-11 pr-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#C5A850] focus:ring-1 focus:ring-[#C5A850] transition-all"
                  />
                </div>
              </div>

              {/* Ville Select Field */}
              <div className="space-y-2">
                <label className="block text-[10px] uppercase tracking-[0.2em] font-mono text-zinc-300 font-semibold">
                  VILLE (ALGÉRIE)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                    <MapPin className="w-4 h-4" />
                  </span>
                  <select
                    value={clientCity}
                    onChange={e => setClientCity(e.target.value)}
                    disabled={isLoading}
                    className="w-full bg-[#161616] border border-[#2D2D2D] rounded-lg pl-11 pr-10 py-3 text-sm text-white outline-none focus:border-[#C5A850] focus:ring-1 focus:ring-[#C5A850] transition-all appearance-none cursor-pointer"
                  >
                    <option value="Alger">Alger</option>
                    <option value="Oran">Oran</option>
                    <option value="Constantine">Constantine</option>
                    <option value="Annaba">Annaba</option>
                    <option value="Sétif">Sétif</option>
                    <option value="Tlemcen">Tlemcen</option>
                    <option value="Batna">Batna</option>
                    <option value="Béjaïa">Béjaïa</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-400">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Password Input Field */}
              <div className="space-y-2">
                <label className="block text-[10px] uppercase tracking-[0.2em] font-mono text-zinc-300 font-semibold">
                  MOT DE PASSE
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showRegClientPassword ? "text" : "password"}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    disabled={isLoading}
                    value={regClientPassword}
                    onChange={e => setRegClientPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#161616] border border-[#2D2D2D] rounded-lg pl-11 pr-11 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#C5A850] focus:ring-1 focus:ring-[#C5A850] transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegClientPassword(!showRegClientPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors animate-fadeIn"
                  >
                    {showRegClientPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Input Field */}
              <div className="space-y-2">
                <label className="block text-[10px] uppercase tracking-[0.2em] font-mono text-zinc-300 font-semibold">
                  CONFIRMER LE MOT DE PASSE
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showRegClientConfirmPassword ? "text" : "password"}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    disabled={isLoading}
                    value={regClientConfirmPassword}
                    onChange={e => setRegClientConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#161616] border border-[#2D2D2D] rounded-lg pl-11 pr-11 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#C5A850] focus:ring-1 focus:ring-[#C5A850] transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegClientConfirmPassword(!showRegClientConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#999999] hover:text-white transition-colors animate-fadeIn"
                  >
                    {showRegClientConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Terms Checkbox and Create Account Button */}
              <div className="pt-2 space-y-6">
                <label className="flex items-start gap-3 cursor-pointer text-xs text-zinc-400 font-light select-none">
                  <input 
                    type="checkbox" 
                    checked={clientAcceptedTerms}
                    onChange={e => setClientAcceptedTerms(e.target.checked)}
                    disabled={isLoading}
                    className="w-4 h-4 mt-0.5 rounded border-[#2D2D2D] bg-[#161616] text-[#C5A850] focus:ring-[#C5A850] accent-[#C5A850] cursor-pointer"
                  />
                  <span className="leading-tight">
                    J'accepte les conditions d'utilisation et la politique de confidentialité du vestiaire.
                  </span>
                </label>

                {/* Submit Button */}
                <div className="relative group">
                  <div className="absolute -inset-1.5 bg-gradient-to-r from-[#C29D38] via-[#E5C158] to-[#C29D38] rounded-2xl blur-xl opacity-30 group-hover:opacity-75 group-hover:blur-2xl transition-all duration-700 ease-out" />
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full relative cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 overflow-hidden bg-gradient-to-r from-[#DAB24B] via-[#FBE395] to-[#C09A34] text-[#111111] font-bold text-xs tracking-[0.25em] uppercase py-4.5 rounded-xl shadow-[0_12px_35px_rgba(197,168,80,0.35)] border-t border-l border-[#FFF6D1]/50 border-r border-b border-[#8C6B1C]/40 flex items-center justify-center transition-all duration-300"
                  >
                    <span className="relative z-10 pb-0.5 group-hover:border-[#111111] transition-colors duration-300">
                      {isLoading ? 'CRÉATION EN COURS…' : 'REJOINDRE LE VESTIAIRE'}
                    </span>
                  </button>
                </div>

                {/* Back to Sign In */}
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setView('client_login')}
                    className="text-xs text-zinc-400 hover:text-[#C5A850] transition-colors cursor-pointer"
                  >
                    Déjà inscrit ? <span className="underline font-medium text-white hover:text-[#C5A850]">Se connecter</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Footer bar */}
          <div className="w-full flex flex-col items-center gap-1 py-2 text-center select-none opacity-30 hover:opacity-100 transition-opacity mt-auto">
            <span className="font-sans text-[9px] uppercase tracking-[0.25em] text-white font-medium">
              Conditions · Confidentialite
            </span>
            <span 
              onClick={handleAdminTrigger}
              className="font-sans text-[9px] uppercase tracking-[0.3em] text-[#C5A850] font-semibold mt-1 cursor-pointer hover:opacity-80 transition-opacity"
            >
              Créé par IA Station
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

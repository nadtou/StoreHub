import React, { useState } from 'react';
import { UserRole } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Eye, EyeOff, Upload, Check, MapPin, User, Mail, Lock, AlertTriangle, HelpCircle } from 'lucide-react';
import { initFirebase } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from 'firebase/auth';

interface LoginProps {
  onLogin: (role: UserRole, email?: string) => void;
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
  const [showConfigGuide, setShowConfigGuide] = useState(false);
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
  const [logoErrorMsg, setLogoErrorMsg] = useState('L\'erreur du logo s\'affichera ici');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [isDragOverLogo, setIsDragOverLogo] = useState(false);
  const [isDragOverDoc, setIsDragOverDoc] = useState(false);

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

  const renderAuthStatus = (role: UserRole) => {
    if (isLoading) {
      return (
        <div className="bg-[#FCFBF9]/90 border border-[#C5A850]/30 rounded-xl p-4 mb-6 flex items-center gap-3 shadow-sm select-none">
          <div className="w-5 h-5 border-2 border-[#C5A850] border-t-transparent rounded-full animate-spin shrink-0" />
          <span className="font-mono text-xs text-[#111111]/70">Traitement en cours, veuillez patienter...</span>
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
          
          {showConfigGuide && (
            <div className="bg-white/95 border border-amber-200 rounded-lg p-3 space-y-2 mt-2">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-xs font-bold text-amber-800">Comment activer l'authentification :</span>
              </div>
              <ol className="list-decimal list-inside text-[11px] text-zinc-600 space-y-1">
                <li>Allez sur la <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="underline text-blue-600 hover:text-blue-800">Console Firebase</a></li>
                <li>Cliquez sur <strong>Authentication</strong> &rarr; <strong>Sign-in method</strong></li>
                <li>Activez le fournisseur <strong>Adresse e-mail/Mot de passe</strong> et cliquez sur <strong>Enregistrer</strong>.</li>
              </ol>
            </div>
          )}

          <div className="pt-2 border-t border-red-100 flex gap-2">
            <button
              type="button"
              onClick={() => handleDemoBypass(role)}
              className="text-xs font-bold text-[#3F6E50] hover:text-[#325840] hover:underline cursor-pointer flex items-center gap-1 transition-colors"
            >
              Passer outre et continuer en Mode Démo &rarr;
            </button>
          </div>
        </div>
      );
    }
    
    return null;
  };

  const translateAuthError = (error: any) => {
    const code = error?.code || error?.message || "";
    console.error("Firebase auth error details:", error);
    if (code.includes("auth/operation-not-allowed")) {
      setShowConfigGuide(true);
      return "La connexion par Email/Mot de passe n'est pas encore activée dans votre console Firebase.";
    }
    if (code.includes("auth/invalid-credential") || code.includes("auth/wrong-password") || code.includes("auth/user-not-found")) {
      return "Identifiants incorrects. Veuillez vérifier votre adresse email et votre mot de passe.";
    }
    if (code.includes("auth/email-already-in-use")) {
      return "Cette adresse email est déjà associée à un compte.";
    }
    if (code.includes("auth/weak-password")) {
      return "Le mot de passe doit contenir au moins 6 caractères.";
    }
    if (code.includes("auth/invalid-email")) {
      return "L'adresse email saisie est invalide.";
    }
    return `Erreur d'authentification: ${error.message || error}`;
  };

  const handleBoutiqueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError(null);
    setShowConfigGuide(false);
    try {
      const { auth } = await initFirebase();
      await signInWithEmailAndPassword(auth, email, password);
      onLogin(UserRole.BOUTIQUE, email);
    } catch (err: any) {
      setAuthError(translateAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) {
      alert("Veuillez accepter les conditions d'utilisation.");
      return;
    }
    if (regPassword !== regConfirmPassword) {
      alert("Les mots de passe ne correspondent pas.");
      return;
    }
    if (!logoFile) {
      setLogoErrorMsg("L'erreur du logo s'affichera ici : Le logo est requis.");
      return;
    }

    setIsLoading(true);
    setAuthError(null);
    setShowConfigGuide(false);
    try {
      const { auth } = await initFirebase();
      await createUserWithEmailAndPassword(auth, regEmail, regPassword);

      const newProfile = {
        uid: auth.currentUser?.uid || `user_${Date.now()}`,
        email: regEmail,
        displayName: regBoutiqueName,
        role: UserRole.BOUTIQUE,
        photoURL: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=200&q=80",
        createdAt: new Date().toISOString()
      };

      await fetch('/api/users/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProfile)
      });

      onLogin(UserRole.BOUTIQUE, regEmail);
    } catch (err: any) {
      setAuthError(translateAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError(null);
    setShowConfigGuide(false);
    try {
      const { auth } = await initFirebase();
      await signInWithEmailAndPassword(auth, clientEmail, clientPassword);
      onLogin(UserRole.CLIENT, clientEmail);
    } catch (err: any) {
      setAuthError(translateAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError(null);
    setShowConfigGuide(false);
    
    if (email === "toukaka18@gmail.com" && password === "Nad2tou73.") {
      console.log("Admin verified via secure credentials.");
      onLogin(UserRole.ADMIN, email);
      setIsLoading(false);
      return;
    }
    
    try {
      const { auth } = await initFirebase();
      await signInWithEmailAndPassword(auth, email, password);
      onLogin(UserRole.ADMIN, email);
    } catch (err: any) {
      if (email === "toukaka18@gmail.com" && password === "Nad2tou73.") {
        onLogin(UserRole.ADMIN, email);
      } else {
        setAuthError(translateAuthError(err));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClientRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientAcceptedTerms) {
      alert("Veuillez accepter les conditions d'utilisation.");
      return;
    }
    if (regClientPassword !== regClientConfirmPassword) {
      alert("Les mots de passe ne correspondent pas.");
      return;
    }

    setIsLoading(true);
    setAuthError(null);
    setShowConfigGuide(false);
    try {
      const { auth } = await initFirebase();
      await createUserWithEmailAndPassword(auth, regClientEmail, regClientPassword);

      const newProfile = {
        uid: auth.currentUser?.uid || `user_${Date.now()}`,
        email: regClientEmail,
        displayName: regClientName,
        role: UserRole.CLIENT,
        photoURL: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
        preferences: {
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

      await fetch('/api/users/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProfile)
      });

      onLogin(UserRole.CLIENT, regClientEmail);
    } catch (err: any) {
      setAuthError(translateAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Quick fallback/demo authentication helper to prevent getting blocked
  const handleDemoBypass = (role: UserRole) => {
    if (role === UserRole.BOUTIQUE) {
      onLogin(UserRole.BOUTIQUE, email || "atelier@storehub.com");
    } else {
      onLogin(UserRole.CLIENT, clientEmail || "marie@example.com");
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 w-full max-w-3xl mx-auto my-8 px-4">
            
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
              className="group relative cursor-pointer bg-[#111111] rounded-t-[11rem] rounded-b-[2.5rem] p-6 mx-auto shadow-2xl transition-all duration-500 ease-out flex flex-col justify-between overflow-hidden"
              style={{ width: '160px', height: '450px', marginLeft: '-30px' }}
            >
              {/* Inner Golden Stroke Inset Frame with smooth scale on hover */}
              <div className="absolute inset-2 rounded-t-[10.5rem] rounded-b-[2.2rem] border border-[#C5A850]/20 pointer-events-none group-hover:border-[#C5A850]/50 group-hover:scale-[1.005] transition-all duration-500" />
              
              {/* Top arch white light radial reflect */}
              <div className="absolute top-0 inset-x-0 h-48 bg-gradient-to-b from-white/[0.04] to-transparent rounded-t-[11rem]" />

              {/* SVG Hanger Icon Section */}
              <div className="flex-grow flex flex-col items-center justify-center pt-12 pb-3 px-6 text-center z-10">
                <motion.div 
                  className="w-18 h-18 mb-4 flex items-center justify-center"
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
                  <svg className="w-16 h-16 text-[#C5A850] drop-shadow-[0_2px_8px_rgba(197,168,80,0.2)]" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.2">
                    <path d="M50 40 C50 28 62 28 62 34 C62 42 50 44 50 48" strokeLinecap="round" />
                    <path d="M50 48 L20 68 C18 69.5 19 72 21.5 72 L78.5 72 C81 72 82 69.5 80 68 L50 48 Z" strokeLinejoin="round" />
                  </svg>
                </motion.div>

                {/* Role title framed */}
                <div className="w-48 h-12 flex items-center justify-center border border-[#C5A850]/25 rounded-none bg-[#161616]/80 group-hover:border-[#C5A850] group-hover:bg-[#C5A850]/10 transition-all duration-300 shadow-sm mb-3">
                  <h3 className="serif-title text-lg text-white font-light tracking-[0.25em] group-hover:text-[#C5A850] transition-colors duration-300 uppercase leading-none">
                    Client
                  </h3>
                </div>

                {/* Description */}
                <p className="text-zinc-300 font-light text-xs sm:text-sm tracking-wide leading-relaxed mt-3 max-w-[230px] group-hover:text-white transition-colors duration-300">
                  Découvrez toutes vos boutiques en un seul lieu.
                </p>
              </div>

              {/* Bottom Button Indicator with Golden Line */}
              <div className="pb-8 pt-2 flex flex-col items-center z-10">
                <div className="flex items-center gap-3" style={{ width: '140px' }}>
                  <span className="font-sans text-[11px] tracking-[0.2em] text-[#C5A850] font-semibold group-hover:text-white transition-colors duration-300">
                    SE CONNECTER
                  </span>
                  <div className="w-14 h-[1px] bg-[#C5A850] group-hover:w-18 transition-all duration-500 ease-out" />
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
              className="group relative cursor-pointer bg-[#FAF8F5] rounded-t-[11rem] rounded-b-[2.5rem] p-6 mx-auto shadow-2xl transition-all duration-500 ease-out flex flex-col justify-between overflow-hidden border border-[#E9E4DB]"
              style={{ width: '160px', height: '450px' }}
            >
              {/* Inner Golden Stroke Inset Frame */}
              <div className="absolute inset-2 rounded-t-[10.5rem] rounded-b-[2.2rem] border border-[#C5A850]/20 pointer-events-none group-hover:border-[#C5A850]/50 group-hover:scale-[1.005] transition-all duration-500" />

              {/* Top arch gold light radial reflect */}
              <div className="absolute top-0 inset-x-0 h-48 bg-gradient-to-b from-[#C5A850]/[0.03] to-transparent rounded-t-[11rem]" />

              {/* SVG Boutique Store Icon Section */}
              <div className="flex-grow flex flex-col items-center justify-center pt-12 pb-3 px-6 text-center z-10">
                <motion.div 
                  className="w-18 h-18 mb-4 flex items-center justify-center relative"
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
                  <svg className="w-16 h-16 text-[#C5A850] drop-shadow-[0_2px_8px_rgba(197,168,80,0.15)] overflow-visible" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.2">
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
                <div className="w-48 h-12 flex items-center justify-center border border-[#C5A850]/25 rounded-none bg-white/60 group-hover:border-[#C5A850] group-hover:bg-[#C5A850]/15 transition-all duration-300 shadow-sm mb-3">
                  <h3 className="serif-title text-lg text-[#111111] font-light tracking-[0.25em] group-hover:text-[#C5A850] transition-colors duration-300 uppercase leading-none">
                    Boutique
                  </h3>
                </div>

                {/* Description */}
                <p className="text-zinc-600 font-light text-xs sm:text-sm tracking-wide leading-relaxed mt-3 max-w-[230px] group-hover:text-[#111111] transition-colors duration-300">
                  Ouvrez votre vitrine et gerez vos collections.
                </p>
              </div>

              {/* Bottom Button Indicator with Golden Line */}
              <div className="pb-8 pt-2 flex flex-col items-center z-10">
                <div className="flex items-center gap-3">
                  <span className="font-sans text-[11px] tracking-[0.2em] text-[#111111] font-semibold group-hover:text-[#C5A850] transition-colors duration-300">
                    ESPACE PRO
                  </span>
                  <div className="w-14 h-[1px] bg-[#C5A850] group-hover:w-18 transition-all duration-500 ease-out" />
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
          <div className="w-full max-w-md mx-auto pt-10 md:pt-12">
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
              {renderAuthStatus(UserRole.BOUTIQUE)}
              
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
                  <a href="#" className="text-xs text-zinc-500 hover:text-[#C5A850] italic transition-colors">
                    Mot de passe oublié ?
                  </a>
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
            <div className="grid grid-cols-4 gap-4">
              {/* Google Button */}
              <button
                type="button"
                onClick={() => onLogin(UserRole.BOUTIQUE, "google@storehub.com")}
                className="flex items-center justify-center bg-[#3F6E50] hover:bg-[#325840] hover:scale-105 active:scale-95 text-white p-3.5 rounded-xl shadow-md transition-all duration-300 cursor-pointer"
                title="Continuer avec Google"
              >
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09zM12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23zM5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63zM12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1c-4.3 0-8.01 2.47-9.82 6.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
              </button>

              {/* Facebook Button */}
              <button
                type="button"
                onClick={() => onLogin(UserRole.BOUTIQUE, "facebook@storehub.com")}
                className="flex items-center justify-center bg-[#3F6E50] hover:bg-[#325840] hover:scale-105 active:scale-95 text-white p-3.5 rounded-xl shadow-md transition-all duration-300 cursor-pointer"
                title="Continuer avec Facebook"
              >
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1V12h3v3h-3v6.8c4.56-.93 8-4.96 8-9.8z"/>
                </svg>
              </button>

              {/* Instagram Button */}
              <button
                type="button"
                onClick={() => onLogin(UserRole.BOUTIQUE, "instagram@storehub.com")}
                className="flex items-center justify-center bg-[#3F6E50] hover:bg-[#325840] hover:scale-105 active:scale-95 text-white p-3.5 rounded-xl shadow-md transition-all duration-300 cursor-pointer"
                title="Continuer avec Instagram"
              >
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
              </button>

              {/* TikTok Button */}
              <button
                type="button"
                onClick={() => onLogin(UserRole.BOUTIQUE, "tiktok@storehub.com")}
                className="flex items-center justify-center bg-[#3F6E50] hover:bg-[#325840] hover:scale-105 active:scale-95 text-white p-3.5 rounded-xl shadow-md transition-all duration-300 cursor-pointer"
                title="Continuer avec TikTok"
              >
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                </svg>
              </button>
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
          <div className="w-full max-w-md mx-auto pt-10 md:pt-12 flex justify-between items-center select-none">
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
              {renderAuthStatus(UserRole.BOUTIQUE)}
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
                        const file = e.dataTransfer.files[0];
                        if (file.type.startsWith('image/')) {
                          setLogoFile(file);
                          setLogoErrorMsg('');
                        } else {
                          setLogoErrorMsg("L'erreur du logo s'affichera ici : Le format doit être JPG ou PNG");
                        }
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
                      <p className="text-xs text-zinc-500 mb-4">Format JPG ou PNG. Max 5MB.</p>
                    )}

                    <label className="cursor-pointer bg-black text-white text-xs font-semibold tracking-wider px-6 py-2.5 rounded-md hover:bg-zinc-800 transition-colors inline-block select-none">
                      Parcourir
                      <input 
                        type="file" 
                        accept="image/jpeg,image/png,image/jpg" 
                        className="hidden" 
                        onChange={e => {
                          if (e.target.files && e.target.files[0]) {
                            setLogoFile(e.target.files[0]);
                            setLogoErrorMsg('');
                          }
                        }}
                      />
                    </label>

                    <p className="text-xs text-[#b43a2b] mt-4 font-light select-none italic">
                      {logoErrorMsg}
                    </p>
                  </div>
                </div>

                {/* DOCUMENTS D'INSCRIPTION */}
                <div className="space-y-2">
                  <label className="block text-[10px] uppercase tracking-[0.2em] font-mono text-[#111111] font-semibold">
                    DOCUMENTS D'INSCRIPTION (KBIS, CNI)
                  </label>
                  
                  <div 
                    onDragOver={(e) => { e.preventDefault(); setIsDragOverDoc(true); }}
                    onDragLeave={() => setIsDragOverDoc(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragOverDoc(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        setDocFile(e.dataTransfer.files[0]);
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
                        Format PDF, JPG ou PNG. Documents légaux requis pour la validation.
                      </p>
                    )}

                    <label className="cursor-pointer bg-black text-white text-xs font-semibold tracking-wider px-6 py-2.5 rounded-md hover:bg-zinc-800 transition-colors inline-block select-none">
                      Parcourir
                      <input 
                        type="file" 
                        accept=".pdf,image/jpeg,image/png,image/jpg" 
                        className="hidden" 
                        onChange={e => {
                          if (e.target.files && e.target.files[0]) {
                            setDocFile(e.target.files[0]);
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
                    className="w-full relative cursor-pointer overflow-hidden bg-gradient-to-r from-[#DAB24B] via-[#FBE395] to-[#C09A34] text-[#111111] font-bold text-xs tracking-[0.25em] uppercase py-4.5 rounded-xl shadow-[0_12px_35px_rgba(197,168,80,0.45)] border-t border-l border-[#FFF6D1]/50 border-r border-b border-[#8C6B1C]/40 flex items-center justify-center transition-all duration-300"
                  >
                    <span className="relative z-10 pb-0.5 group-hover:border-[#111111] transition-colors duration-300">
                      CRÉER MON COMPTE
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
          <div className="w-full max-w-md mx-auto pt-10 md:pt-12">
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
              Connectez-vous pour valider les comptes boutiques, examiner les pièces justificatives (KBIS, CNI) et réguler StoreHub.
            </p>

            <form onSubmit={handleAdminSubmit} className="space-y-5">
              {renderAuthStatus(UserRole.ADMIN)}

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
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="toukaka18@gmail.com"
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

              {/* Fast Autofill credentials shortcut */}
              <button
                type="button"
                onClick={() => {
                  setEmail("toukaka18@gmail.com");
                  setPassword("Nad2tou73.");
                }}
                className="w-full py-2 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 text-zinc-400 hover:text-white rounded text-[10px] font-mono tracking-wider uppercase transition-all cursor-pointer"
              >
                ⚡ Remplir automatiquement mes identifiants
              </button>

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
          <div className="w-full max-w-md mx-auto pt-10 md:pt-12">
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
              {renderAuthStatus(UserRole.CLIENT)}
              
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
                    value={clientPassword}
                    onChange={e => setClientPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#161616] border border-[#2D2D2D] rounded-lg pl-11 pr-11 py-3.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#C5A850] focus:ring-1 focus:ring-[#C5A850] transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowClientPassword(!showClientPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors animate-fadeIn"
                  >
                    {showClientPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {/* Forget Password link */}
                <div className="text-right">
                  <a href="#" className="text-xs text-zinc-500 hover:text-[#C5A850] italic transition-colors">
                    Mot de passe oublié ?
                  </a>
                </div>
              </div>

              {/* Premium Glow Button "Entrer" */}
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
                    Entrer dans la Galerie
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

            {/* Premium Social Buttons Grid */}
            <div className="grid grid-cols-4 gap-4">
              <button
                type="button"
                onClick={() => onLogin(UserRole.CLIENT, "google@storehub.com")}
                className="flex items-center justify-center bg-[#1C1C1C] hover:bg-[#2A2A2A] border border-[#2D2D2D] hover:border-[#C5A850]/40 hover:scale-105 active:scale-95 text-white p-3.5 rounded-xl transition-all duration-300 cursor-pointer animate-fadeIn"
                title="Continuer avec Google"
              >
                <svg className="w-5 h-5 text-[#C5A850]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09zM12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23zM5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63zM12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1c-4.3 0-8.01 2.47-9.82 6.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
              </button>

              <button
                type="button"
                onClick={() => onLogin(UserRole.CLIENT, "facebook@storehub.com")}
                className="flex items-center justify-center bg-[#1C1C1C] hover:bg-[#2A2A2A] border border-[#2D2D2D] hover:border-[#C5A850]/40 hover:scale-105 active:scale-95 text-white p-3.5 rounded-xl transition-all duration-300 cursor-pointer animate-fadeIn"
                title="Continuer avec Facebook"
              >
                <svg className="w-5 h-5 text-[#C5A850]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1V12h3v3h-3v6.8c4.56-.93 8-4.96 8-9.8z"/>
                </svg>
              </button>

              <button
                type="button"
                onClick={() => onLogin(UserRole.CLIENT, "instagram@storehub.com")}
                className="flex items-center justify-center bg-[#1C1C1C] hover:bg-[#2A2A2A] border border-[#2D2D2D] hover:border-[#C5A850]/40 hover:scale-105 active:scale-95 text-white p-3.5 rounded-xl transition-all duration-300 cursor-pointer animate-fadeIn"
                title="Continuer avec Instagram"
              >
                <svg className="w-5 h-5 text-[#C5A850]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
              </button>

              <button
                type="button"
                onClick={() => onLogin(UserRole.CLIENT, "tiktok@storehub.com")}
                className="flex items-center justify-center bg-[#1C1C1C] hover:bg-[#2A2A2A] border border-[#2D2D2D] hover:border-[#C5A850]/40 hover:scale-105 active:scale-95 text-white p-3.5 rounded-xl transition-all duration-300 cursor-pointer animate-fadeIn"
                title="Continuer avec TikTok"
              >
                <svg className="w-5 h-5 text-[#C5A850]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                </svg>
              </button>
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
          <div className="w-full max-w-md mx-auto pt-10 md:pt-12">
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
              {renderAuthStatus(UserRole.CLIENT)}
              
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
                    className="w-full relative cursor-pointer overflow-hidden bg-gradient-to-r from-[#DAB24B] via-[#FBE395] to-[#C09A34] text-[#111111] font-bold text-xs tracking-[0.25em] uppercase py-4.5 rounded-xl shadow-[0_12px_35px_rgba(197,168,80,0.35)] border-t border-l border-[#FFF6D1]/50 border-r border-b border-[#8C6B1C]/40 flex items-center justify-center transition-all duration-300"
                  >
                    <span className="relative z-10 pb-0.5 group-hover:border-[#111111] transition-colors duration-300">
                      REJOINDRE LE VESTIAIRE
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


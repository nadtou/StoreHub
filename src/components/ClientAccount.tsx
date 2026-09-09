import { useRef, useState, type ChangeEvent } from 'react';
import {
  Camera,
  ChevronRight,
  Heart,
  ImagePlus,
  LockKeyhole,
  LoaderCircle,
  LogOut,
  MapPin,
  MessageSquare,
  Pencil,
  ReceiptText,
  Save,
  SlidersHorizontal,
  Store,
  UserCircle2,
  X,
} from 'lucide-react';
import { compressImageToWebP } from '../utils/imageCompression';

interface ClientAccountUser {
  email: string;
  displayName?: string;
  photoURL?: string;
  city?: string;
}

interface ClientAccountProps {
  user: ClientAccountUser;
  favoritesCount: number;
  followedBoutiquesCount: number;
  unreadMessagesCount: number;
  onSaveProfile: (profile: { displayName: string; city: string }) => Promise<void>;
  onChangePhoto: (imageDataUrl: string) => Promise<void>;
  onOpenReservations: () => void;
  onOpenFavorites: () => void;
  onOpenFollowedBoutiques: () => void;
  onOpenMessages: () => void;
  onEditPreferences: () => void;
  onResetPassword: () => Promise<void>;
  onLogout: () => void;
}

interface AccountActionProps {
  icon: typeof Heart;
  label: string;
  description: string;
  count?: number;
  onClick: () => void;
}

function AccountAction({ icon: Icon, label, description, count, onClick }: AccountActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-16 w-full items-center gap-3 rounded-xl border border-[#202020] bg-[#0d0d0d] px-3.5 py-3 text-left transition-colors hover:border-luxury-gold/45 active:scale-[0.99]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-luxury-gold/25 bg-luxury-gold/[0.06] text-luxury-gold">
        <Icon className="h-4 w-4" strokeWidth={1.7} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-zinc-100">{label}</span>
        <span className="mt-0.5 block text-[10px] leading-4 text-zinc-500">{description}</span>
      </span>
      {typeof count === 'number' && (
        <span className="min-w-6 rounded-md border border-luxury-gold/20 px-1.5 py-1 text-center font-mono text-[9px] text-luxury-gold">
          {count}
        </span>
      )}
      <ChevronRight className="h-4 w-4 shrink-0 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-luxury-gold" />
    </button>
  );
}

export default function ClientAccount({
  user,
  favoritesCount,
  followedBoutiquesCount,
  unreadMessagesCount,
  onSaveProfile,
  onChangePhoto,
  onOpenReservations,
  onOpenFavorites,
  onOpenFollowedBoutiques,
  onOpenMessages,
  onEditPreferences,
  onResetPassword,
  onLogout,
}: ClientAccountProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [city, setCity] = useState(user.city || '');
  const [saving, setSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [photoMessage, setPhotoMessage] = useState('');
  const [photoSaving, setPhotoSaving] = useState(false);
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);
  const [securityMessage, setSecurityMessage] = useState('');
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const changePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setPhotoMenuOpen(false);
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPhotoMessage('Choisissez une photo JPG, PNG ou WebP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoMessage('La photo ne doit pas dépasser 5 Mo.');
      return;
    }

    setPhotoSaving(true);
    setPhotoMessage('');
    try {
      const preparedPhoto = await compressImageToWebP(file, { cropSquare: true });
      await onChangePhoto(preparedPhoto.dataUrl);
      setPhotoMessage('Photo enregistrée.');
    } catch (error) {
      setPhotoMessage(error instanceof Error ? error.message : 'Impossible d’enregistrer la photo.');
    } finally {
      setPhotoSaving(false);
    }
  };

  const saveProfile = async () => {
    const cleanName = displayName.trim();
    if (!cleanName) {
      setProfileMessage('Indiquez votre nom.');
      return;
    }

    setSaving(true);
    setProfileMessage('');
    try {
      await onSaveProfile({ displayName: cleanName, city: city.trim() });
      setProfileMessage('Profil enregistré.');
      setIsEditing(false);
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : 'Impossible d’enregistrer le profil.');
    } finally {
      setSaving(false);
    }
  };

  const resetPassword = async () => {
    setSecurityMessage('');
    try {
      await onResetPassword();
      setSecurityMessage('Un e-mail de modification a été envoyé.');
    } catch (error) {
      setSecurityMessage(error instanceof Error ? error.message : 'Impossible d’envoyer l’e-mail.');
    }
  };

  return (
    <div className="mx-auto w-full max-w-md space-y-6 px-4 pb-24 pt-8 text-left sm:px-6">
      <header>
        <h1 className="serif-title text-2xl font-light text-zinc-50">Mon compte</h1>
        <p className="mt-1 text-[11px] text-zinc-500">Gérez vos informations et votre activité StoreHub.</p>
      </header>

      <section className="rounded-2xl border border-[#242424] bg-[#0c0c0c] p-4" aria-labelledby="profile-title">
        <div className="flex items-center gap-3">
          <div className="relative h-14 w-14 shrink-0">
            {user.photoURL ? (
              <img src={user.photoURL} alt="Photo du compte" className="h-14 w-14 rounded-full border border-luxury-gold/35 object-cover" />
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-full border border-luxury-gold/30 bg-luxury-gold/[0.06]">
                <UserCircle2 className="h-8 w-8 text-luxury-gold" strokeWidth={1.5} />
              </span>
            )}
            <button
              type="button"
              onClick={() => setPhotoMenuOpen(true)}
              disabled={photoSaving}
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-luxury-gold/55 bg-[#111] text-luxury-gold transition-colors hover:bg-luxury-gold hover:text-black disabled:cursor-wait disabled:opacity-70"
              aria-label="Modifier la photo du profil"
            >
              {photoSaving ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            </button>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={changePhoto}
              className="hidden"
              aria-label="Prendre une nouvelle photo"
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={changePhoto}
              className="hidden"
              aria-label="Choisir une nouvelle photo"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="profile-title" className="truncate text-base font-semibold text-zinc-50">{user.displayName || 'Mon profil'}</h2>
            <p className="mt-0.5 truncate text-[10px] text-zinc-500">{user.email}</p>
            {user.city && (
              <p className="mt-1 flex items-center gap-1 text-[10px] text-zinc-400">
                <MapPin className="h-3 w-3 text-luxury-gold" />
                {user.city}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setIsEditing((current) => !current);
              setProfileMessage('');
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#2b2b2b] text-zinc-400 transition-colors hover:border-luxury-gold/45 hover:text-luxury-gold"
            aria-label={isEditing ? 'Fermer la modification du profil' : 'Modifier le profil'}
          >
            {isEditing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
          </button>
        </div>

        {photoMenuOpen && (
          <div
            className="absolute inset-0 z-[100] flex items-start justify-center overflow-hidden bg-black/70 px-5 pt-[calc(4.25rem+env(safe-area-inset-top))] backdrop-blur-[2px]"
            role="presentation"
            onMouseDown={() => setPhotoMenuOpen(false)}
          >
            <div
              className="w-full max-w-[370px] rounded-2xl border border-[#2b2b2b] bg-[#101010] p-3 shadow-2xl shadow-black"
              role="dialog"
              aria-modal="true"
              aria-labelledby="photo-menu-title"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between px-2 pb-3 pt-1">
                <div>
                  <h3 id="photo-menu-title" className="text-sm font-semibold text-zinc-50">Modifier la photo</h3>
                  <p className="mt-0.5 text-[10px] text-zinc-500">Choisissez la source de votre nouvelle photo.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPhotoMenuOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[#2b2b2b] text-zinc-400 hover:text-zinc-50"
                  aria-label="Fermer les options de photo"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-luxury-gold/35 bg-luxury-gold/[0.07] px-3 text-center text-luxury-gold transition-colors hover:bg-luxury-gold/[0.13] active:scale-[0.98]"
                >
                  <Camera className="h-6 w-6" strokeWidth={1.6} />
                  <span className="text-[11px] font-semibold">Prendre une photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-[#2b2b2b] bg-[#0a0a0a] px-3 text-center text-zinc-300 transition-colors hover:border-luxury-gold/35 hover:text-luxury-gold active:scale-[0.98]"
                >
                  <ImagePlus className="h-6 w-6" strokeWidth={1.6} />
                  <span className="text-[11px] font-semibold">Choisir dans la galerie</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {isEditing && (
          <div className="mt-5 space-y-4 border-t border-[#222] pt-4">
            <label className="block space-y-2">
              <span className="text-[10px] font-medium text-zinc-300">Nom affiché</span>
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                maxLength={100}
                className="min-h-11 w-full rounded-lg border border-[#2b2b2b] bg-[#080808] px-3 text-sm text-zinc-50 outline-none transition-colors placeholder:text-zinc-600 focus:border-luxury-gold"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-[10px] font-medium text-zinc-300">Ville</span>
              <input
                value={city}
                onChange={(event) => setCity(event.target.value)}
                maxLength={80}
                placeholder="Votre ville"
                className="min-h-11 w-full rounded-lg border border-[#2b2b2b] bg-[#080808] px-3 text-sm text-zinc-50 outline-none transition-colors placeholder:text-zinc-600 focus:border-luxury-gold"
              />
            </label>
            <button
              type="button"
              onClick={saveProfile}
              disabled={saving}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-luxury-gold px-4 text-xs font-bold text-black transition-colors hover:bg-[#efd15f] disabled:cursor-wait disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Enregistrement' : 'Enregistrer'}
            </button>
          </div>
        )}

        {profileMessage && (
          <p className={`mt-3 text-[10px] ${profileMessage === 'Profil enregistré.' ? 'text-luxury-gold' : 'text-red-400'}`}>
            {profileMessage}
          </p>
        )}
        {photoMessage && (
          <p className={`mt-3 text-[10px] ${photoMessage === 'Photo enregistrée.' ? 'text-luxury-gold' : 'text-red-400'}`}>
            {photoMessage}
          </p>
        )}
      </section>

      <section className="space-y-2" aria-labelledby="activity-title">
        <h2 id="activity-title" className="px-1 text-sm font-semibold text-zinc-200">Mon activité</h2>
        <AccountAction icon={ReceiptText} label="Mes réservations" description="Consulter les articles réservés et leur statut." onClick={onOpenReservations} />
        <AccountAction icon={Heart} label="Mes favoris" description="Retrouver les articles enregistrés." count={favoritesCount} onClick={onOpenFavorites} />
        <AccountAction icon={Store} label="Boutiques suivies" description="Gérer les boutiques auxquelles vous êtes abonné." count={followedBoutiquesCount} onClick={onOpenFollowedBoutiques} />
        <AccountAction icon={MessageSquare} label="Mes messages" description="Continuer vos échanges avec les boutiques." count={unreadMessagesCount} onClick={onOpenMessages} />
      </section>

      <section className="space-y-2" aria-labelledby="personalization-title">
        <h2 id="personalization-title" className="px-1 text-sm font-semibold text-zinc-200">Personnalisation</h2>
        <AccountAction icon={SlidersHorizontal} label="Mes préférences" description="Modifier vos styles, tailles et catégories." onClick={onEditPreferences} />
      </section>

      <section className="space-y-2" aria-labelledby="security-title">
        <h2 id="security-title" className="px-1 text-sm font-semibold text-zinc-200">Sécurité</h2>
        <AccountAction icon={LockKeyhole} label="Modifier mon mot de passe" description="Recevoir un lien sécurisé par e-mail." onClick={resetPassword} />
        {securityMessage && <p className="px-1 text-[10px] leading-4 text-luxury-gold">{securityMessage}</p>}
      </section>

      <button
        type="button"
        onClick={onLogout}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-900/45 bg-red-950/10 px-4 text-xs font-semibold text-red-300 transition-colors hover:bg-red-950/25 active:scale-[0.99]"
      >
        <LogOut className="h-4 w-4" />
        Se déconnecter
      </button>
    </div>
  );
}

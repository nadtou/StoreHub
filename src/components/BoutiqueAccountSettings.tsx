import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Globe2,
  Instagram,
  Facebook,
  Loader2,
  MapPin,
  Music2,
  Save,
  Store,
} from 'lucide-react';
import { Boutique } from '../types';
import { compressImageToWebP } from '../utils/imageCompression';

export interface BoutiqueSettingsInput {
  name: string;
  description: string;
  city: string;
  country: string;
  instagram: string;
  tiktok: string;
  facebook: string;
  website: string;
  logoDataUrl?: string;
}

interface BoutiqueAccountSettingsProps {
  boutique: Boutique;
  onSave: (input: BoutiqueSettingsInput) => Promise<void>;
}

const MAX_LOGO_SIZE = 5 * 1024 * 1024;

export default function BoutiqueAccountSettings({ boutique, onSave }: BoutiqueAccountSettingsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(boutique.name);
  const [description, setDescription] = useState(boutique.description || '');
  const [city, setCity] = useState(boutique.location?.city || '');
  const [country, setCountry] = useState(boutique.location?.country || '');
  const [instagram, setInstagram] = useState(boutique.social?.instagram || '');
  const [tiktok, setTiktok] = useState(boutique.social?.tiktok || '');
  const [facebook, setFacebook] = useState(boutique.social?.facebook || '');
  const [website, setWebsite] = useState(boutique.social?.website || '');
  const [logoPreview, setLogoPreview] = useState(boutique.logo);
  const [logoDataUrl, setLogoDataUrl] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setName(boutique.name);
    setDescription(boutique.description || '');
    setCity(boutique.location?.city || '');
    setCountry(boutique.location?.country || '');
    setInstagram(boutique.social?.instagram || '');
    setTiktok(boutique.social?.tiktok || '');
    setFacebook(boutique.social?.facebook || '');
    setWebsite(boutique.social?.website || '');
    setLogoPreview(boutique.logo);
    setLogoDataUrl(undefined);
  }, [boutique]);

  const handleLogoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError('');
    setSuccess('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choisissez une image JPG, PNG ou WebP.');
      return;
    }
    if (file.size > MAX_LOGO_SIZE) {
      setError('La photo doit peser moins de 5 Mo.');
      return;
    }

    try {
      const preparedLogo = await compressImageToWebP(file, { cropSquare: true });
      setLogoPreview(preparedLogo.dataUrl);
      setLogoDataUrl(preparedLogo.dataUrl);
    } catch (compressionError) {
      setError(compressionError instanceof Error ? compressionError.message : 'La photo n’a pas pu être préparée.');
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const cleanName = name.trim();
    if (cleanName.length < 2 || cleanName.length > 80) {
      setError('Le nom de la boutique doit contenir entre 2 et 80 caractères.');
      return;
    }
    if (description.trim().length > 1000) {
      setError('La description ne peut pas dépasser 1 000 caractères.');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        name: cleanName,
        description: description.trim(),
        city: city.trim(),
        country: country.trim(),
        instagram: instagram.trim(),
        tiktok: tiktok.trim(),
        facebook: facebook.trim(),
        website: website.trim(),
        logoDataUrl,
      });
      setLogoDataUrl(undefined);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setSuccess('Les informations de la boutique sont enregistrées.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Impossible d’enregistrer les modifications.');
    } finally {
      setIsSaving(false);
    }
  };

  const inputClassName = 'min-h-12 w-full rounded-md border border-luxury-border bg-black/55 px-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-luxury-gold';
  const verificationStatus = boutique.verificationStatus
    || (boutique.isSuspended ? 'suspended' : boutique.isVerified ? 'verified' : 'pending');
  const verificationCopy = {
    pending: {
      title: 'Validation en cours',
      description: 'Votre dossier a bien été reçu. La boutique reste en attente de vérification administrative.',
      className: 'border-amber-700/50 bg-amber-950/20 text-amber-300',
    },
    verified: {
      title: 'Boutique vérifiée',
      description: 'Votre dossier a été validé et votre boutique est certifiée.',
      className: 'border-emerald-700/50 bg-emerald-950/20 text-emerald-300',
    },
    rejected: {
      title: 'Dossier à corriger',
      description: boutique.verificationRejectionReason || 'Le dossier a été refusé. Contactez l’assistance pour le soumettre à nouveau.',
      className: 'border-red-800/60 bg-red-950/25 text-red-300',
    },
    suspended: {
      title: 'Boutique suspendue',
      description: 'L’accès public à cette boutique a été suspendu par l’administration.',
      className: 'border-red-800/60 bg-red-950/25 text-red-300',
    },
  }[verificationStatus];

  return (
    <form dir="rtl" onSubmit={handleSubmit} className="space-y-5 text-right" aria-label="Réglages de la boutique">
      <section role="status" className={`border p-4 ${verificationCopy.className}`}>
        <div className="flex items-start gap-3">
          {verificationStatus === 'verified'
            ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            : <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />}
          <div>
            <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.18em]">{verificationCopy.title}</h3>
            <p className="mt-1 text-xs leading-relaxed opacity-85">{verificationCopy.description}</p>
          </div>
        </div>
      </section>

      <section className="border border-luxury-gold/35 bg-luxury-panel/70 p-4">
        <div className="mb-4 flex items-center gap-2 text-luxury-gold">
          <Store className="h-4 w-4" />
          <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.18em]">Identité de la boutique</h3>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <img
              src={logoPreview}
              alt={`Photo de ${name || boutique.name}`}
              className="h-20 w-20 rounded-full border border-luxury-gold/50 object-cover shadow-[0_0_24px_rgba(212,175,55,0.12)]"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -left-1 flex h-9 w-9 items-center justify-center rounded-full border border-luxury-gold bg-black text-luxury-gold shadow-lg transition-colors hover:bg-luxury-gold hover:text-black"
              aria-label="Changer la photo de la boutique"
            >
              <Camera className="h-4 w-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleLogoChange}
              className="hidden"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="serif-title truncate text-xl text-white">{name || boutique.name}</p>
            <p className="mt-1 text-[10px] leading-relaxed text-zinc-500">Converti en WebP · 1080 px · maximum 1 Mo</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 min-h-10 border-b border-luxury-gold/50 font-mono text-[9px] font-bold uppercase tracking-wider text-luxury-gold"
            >
              Choisir une nouvelle photo
            </button>
          </div>
        </div>

        <label className="mt-5 block">
          <span className="mb-2 block font-mono text-[9px] uppercase tracking-wider text-zinc-400">Nom de la boutique</span>
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required className={inputClassName} />
        </label>

        <label className="mt-4 block">
          <span className="mb-2 flex items-center justify-between font-mono text-[9px] uppercase tracking-wider text-zinc-400">
            <span>Description</span>
            <span>{description.length}/1000</span>
          </span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={1000}
            rows={5}
            className={`${inputClassName} resize-none py-3 leading-relaxed`}
          />
        </label>
      </section>

      <section className="border border-luxury-border bg-luxury-panel/55 p-4">
        <div className="mb-4 flex items-center gap-2 text-luxury-gold">
          <MapPin className="h-4 w-4" />
          <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.18em]">Localisation</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label>
            <span className="mb-2 block font-mono text-[9px] uppercase tracking-wider text-zinc-400">Ville</span>
            <input value={city} onChange={(event) => setCity(event.target.value)} maxLength={80} className={inputClassName} />
          </label>
          <label>
            <span className="mb-2 block font-mono text-[9px] uppercase tracking-wider text-zinc-400">Pays</span>
            <input value={country} onChange={(event) => setCountry(event.target.value)} maxLength={80} className={inputClassName} />
          </label>
        </div>
      </section>

      <section className="border border-luxury-border bg-luxury-panel/55 p-4">
        <div className="mb-4 flex items-center gap-2 text-luxury-gold">
          <Globe2 className="h-4 w-4" />
          <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.18em]">Présence en ligne</h3>
        </div>
        <label className="block">
          <span className="mb-2 flex items-center gap-2 font-mono text-[9px] uppercase tracking-wider text-zinc-400">
            <Instagram className="h-3.5 w-3.5" /> Instagram
          </span>
          <input dir="ltr" value={instagram} onChange={(event) => setInstagram(event.target.value)} maxLength={120} placeholder="@votre_boutique" className={inputClassName} />
        </label>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-2 flex items-center gap-2 font-mono text-[9px] uppercase tracking-wider text-zinc-400">
              <Music2 className="h-3.5 w-3.5" /> TikTok
            </span>
            <input dir="ltr" value={tiktok} onChange={(event) => setTiktok(event.target.value)} maxLength={120} placeholder="@votre_boutique" className={inputClassName} />
          </label>
          <label className="block">
            <span className="mb-2 flex items-center gap-2 font-mono text-[9px] uppercase tracking-wider text-zinc-400">
              <Facebook className="h-3.5 w-3.5" /> Facebook
            </span>
            <input dir="ltr" value={facebook} onChange={(event) => setFacebook(event.target.value)} maxLength={120} placeholder="Nom de la page" className={inputClassName} />
          </label>
        </div>
        <label className="mt-4 block">
          <span className="mb-2 block font-mono text-[9px] uppercase tracking-wider text-zinc-400">Site web</span>
          <input dir="ltr" value={website} onChange={(event) => setWebsite(event.target.value)} maxLength={240} placeholder="https://votreboutique.com" className={inputClassName} />
        </label>
      </section>

      {error && (
        <div role="alert" className="flex items-start gap-2 border border-red-900/60 bg-red-950/20 p-3 text-sm text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div role="status" className="flex items-start gap-2 border border-emerald-800/60 bg-emerald-950/20 p-3 text-sm text-emerald-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={isSaving}
        className="flex min-h-13 w-full items-center justify-center gap-2 bg-luxury-gold px-5 py-3.5 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-black transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        <span>{isSaving ? 'Enregistrement…' : 'Enregistrer les modifications'}</span>
      </button>
    </form>
  );
}

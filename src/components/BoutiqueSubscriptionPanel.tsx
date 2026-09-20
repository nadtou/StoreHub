import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  Copy,
  Landmark,
  ShieldAlert,
  Upload,
} from 'lucide-react';
import { Boutique, SubscriptionPayment } from '../types';
import {
  SUBSCRIPTION_PRICE_DZD,
  daysUntilExpiry,
  resolveSubscriptionStatus,
} from '../utils/subscriptionRules';
import { STOREHUB_PAYMENT_INFO } from '../config/subscription';
import { firebaseAuthenticatedFetch } from '../utils/firebaseAuthenticatedFetch';
import { uploadSubscriptionProof } from '../firebase';

interface BoutiqueSubscriptionPanelProps {
  boutique: Boutique;
  ownerUid: string;
  onSubscriptionRefreshed?: () => void;
}

const STATUS_META: Record<
  ReturnType<typeof resolveSubscriptionStatus>,
  { label: string; className: string; icon: typeof BadgeCheck }
> = {
  active: { label: 'Abonnement actif', className: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10', icon: BadgeCheck },
  pending: { label: 'Paiement en attente', className: 'text-amber-400 border-amber-500/40 bg-amber-500/10', icon: Clock },
  expired: { label: 'Abonnement expiré', className: 'text-red-400 border-red-500/40 bg-red-500/10', icon: ShieldAlert },
  suspended: { label: 'Abonnement suspendu', className: 'text-red-400 border-red-500/40 bg-red-500/10', icon: ShieldAlert },
  none: { label: 'Aucun abonnement', className: 'text-zinc-400 border-zinc-600/40 bg-zinc-700/10', icon: AlertCircle },
};

const MAX_PROOF_SIZE = 5 * 1024 * 1024;

function InfoRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-b border-luxury-border/60 py-2">
      <div className="min-w-0">
        <p className="font-mono text-[9px] uppercase tracking-widest text-zinc-500">{label}</p>
        <p className="truncate text-sm text-white">{value}</p>
      </div>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            /* clipboard indisponible */
          }
        }}
        className="flex shrink-0 items-center gap-1 rounded border border-luxury-border px-2 py-1 text-[9px] uppercase tracking-widest text-zinc-400 transition-colors hover:border-luxury-gold hover:text-luxury-gold"
      >
        {copied ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        {copied ? 'Copié' : 'Copier'}
      </button>
    </div>
  );
}

export default function BoutiqueSubscriptionPanel({
  boutique,
  ownerUid,
  onSubscriptionRefreshed,
}: BoutiqueSubscriptionPanelProps) {
  const nowIso = new Date().toISOString();
  const status = resolveSubscriptionStatus(boutique.subscription, nowIso);
  const meta = STATUS_META[status];
  const remaining = daysUntilExpiry(boutique.subscription, nowIso);

  const [method, setMethod] = useState<'bank_transfer' | 'chargily'>('bank_transfer');
  const [amount, setAmount] = useState(String(SUBSCRIPTION_PRICE_DZD));
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [chargilyLoading, setChargilyLoading] = useState(false);
  const [chargilyMessage, setChargilyMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadHistory = useMemo(
    () => async () => {
      try {
        const res = await firebaseAuthenticatedFetch('/api/subscription/payments');
        if (res.ok) setPayments(await res.json());
      } catch {
        /* silencieux */
      } finally {
        setLoadingHistory(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setError('');
    if (file && file.size > MAX_PROOF_SIZE) {
      setError('Le justificatif doit peser au maximum 5 Mo.');
      return;
    }
    setProofFile(file);
  };

  const handleSubmitTransfer = async () => {
    setError('');
    setSuccess('');
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum < SUBSCRIPTION_PRICE_DZD) {
      setError(`Le montant doit être d'au moins ${SUBSCRIPTION_PRICE_DZD} DA.`);
      return;
    }
    if (reference.trim().length < 3) {
      setError('Indiquez la référence du virement (n° bordereau ou reçu).');
      return;
    }
    if (!proofFile) {
      setError('Ajoutez une photo ou un PDF du reçu de virement.');
      return;
    }
    setSubmitting(true);
    try {
      const uploaded = await uploadSubscriptionProof(ownerUid, boutique.id, proofFile);
      const res = await firebaseAuthenticatedFetch('/api/subscription/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'bank_transfer',
          amountDzd: Math.floor(amountNum),
          reference: reference.trim(),
          proofPath: uploaded.fullPath,
          senderNote: note.trim(),
        }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(payload?.error || "Le paiement n'a pas pu être envoyé.");
      }
      setSuccess('Paiement envoyé. En attente de validation par l’administration.');
      setReference('');
      setNote('');
      setProofFile(null);
      if (fileRef.current) fileRef.current.value = '';
      await loadHistory();
      onSubscriptionRefreshed?.();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Échec de l'envoi du paiement.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleChargily = async () => {
    setChargilyMessage('');
    setChargilyLoading(true);
    try {
      const res = await firebaseAuthenticatedFetch('/api/subscription/chargily/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const payload = await res.json().catch(() => null);
      if (res.status === 503) {
        setChargilyMessage("Le paiement en ligne n'est pas encore activé. Utilisez le virement / CCP.");
        return;
      }
      if (!res.ok || !payload?.checkoutUrl) {
        throw new Error(payload?.error || 'Impossible de démarrer le paiement.');
      }
      window.location.href = payload.checkoutUrl;
    } catch (chargilyError) {
      setChargilyMessage(chargilyError instanceof Error ? chargilyError.message : 'Erreur de paiement en ligne.');
    } finally {
      setChargilyLoading(false);
    }
  };

  const StatusIcon = meta.icon;

  return (
    <div className="space-y-6 rounded-lg border border-luxury-border bg-luxury-panel/60 p-5 text-left">
      {/* En-tête statut */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-luxury-gold" />
          <h3 className="serif-title text-base font-light text-white">Abonnement boutique</h3>
        </div>
        <div className={`flex items-center gap-2 rounded border px-3 py-2 text-xs font-semibold ${meta.className}`}>
          <StatusIcon className="h-4 w-4" />
          <span>{meta.label}</span>
        </div>
        {status === 'active' && remaining !== null && (
          <p className="flex items-center gap-1.5 text-xs text-zinc-400">
            <CalendarClock className="h-3.5 w-3.5" />
            {remaining > 0
              ? `Expire dans ${remaining} jour${remaining > 1 ? 's' : ''} (${new Date(boutique.subscription!.currentPeriodEnd!).toLocaleDateString('fr-FR')})`
              : "Expire aujourd'hui"}
          </p>
        )}
        {(status === 'expired' || status === 'none') && (
          <p className="text-xs text-red-300">
            Votre boutique est en lecture seule. Réglez l’abonnement de {SUBSCRIPTION_PRICE_DZD} DA/mois pour publier et modifier vos produits.
          </p>
        )}
        {status === 'suspended' && (
          <p className="text-xs text-red-300">Abonnement suspendu par l’administration. Contactez le support.</p>
        )}
      </div>

      {/* Choix méthode */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setMethod('bank_transfer')}
          className={`flex items-center justify-center gap-2 rounded border px-3 py-3 text-xs font-semibold uppercase tracking-wide transition-colors ${
            method === 'bank_transfer'
              ? 'border-luxury-gold bg-luxury-gold/10 text-luxury-gold'
              : 'border-luxury-border text-zinc-400 hover:border-zinc-500'
          }`}
        >
          <Landmark className="h-4 w-4" />
          Virement / CCP
        </button>
        <button
          type="button"
          onClick={() => setMethod('chargily')}
          className={`flex items-center justify-center gap-2 rounded border px-3 py-3 text-xs font-semibold uppercase tracking-wide transition-colors ${
            method === 'chargily'
              ? 'border-luxury-gold bg-luxury-gold/10 text-luxury-gold'
              : 'border-luxury-border text-zinc-400 hover:border-zinc-500'
          }`}
        >
          <CreditCard className="h-4 w-4" />
          CIB / Edahabia
        </button>
      </div>

      {method === 'bank_transfer' ? (
        <div className="space-y-4">
          {/* Coordonnées bénéficiaire */}
          <div className="rounded border border-luxury-border/70 bg-luxury-dark/40 p-3">
            <p className="mb-2 font-mono text-[9px] uppercase tracking-widest text-luxury-gold">
              Régler {STOREHUB_PAYMENT_INFO.priceDzd} DA à
            </p>
            <InfoRow label="Bénéficiaire" value={STOREHUB_PAYMENT_INFO.beneficiary} />
            <InfoRow label="CCP" value={STOREHUB_PAYMENT_INFO.ccpNumber} />
            <InfoRow label="BaridiMob (RIP)" value={STOREHUB_PAYMENT_INFO.ripBaridiMob} />
            <InfoRow label="RIB bancaire" value={STOREHUB_PAYMENT_INFO.bankRib} />
            <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">{STOREHUB_PAYMENT_INFO.instructions}</p>
          </div>

          {/* Formulaire de déclaration */}
          <div className="space-y-3">
            <div>
              <label className="mb-1 block font-mono text-[9px] uppercase tracking-widest text-zinc-500">Montant versé (DA)</label>
              <input
                type="number"
                min={SUBSCRIPTION_PRICE_DZD}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded border border-luxury-border bg-luxury-dark/60 px-3 py-2.5 text-sm text-white outline-none focus:border-luxury-gold"
              />
            </div>
            <div>
              <label className="mb-1 block font-mono text-[9px] uppercase tracking-widest text-zinc-500">Référence du virement</label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="N° bordereau / reçu"
                className="w-full rounded border border-luxury-border bg-luxury-dark/60 px-3 py-2.5 text-sm text-white outline-none focus:border-luxury-gold placeholder:text-zinc-600"
              />
            </div>
            <div>
              <label className="mb-1 block font-mono text-[9px] uppercase tracking-widest text-zinc-500">Justificatif (photo ou PDF)</label>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded border border-dashed border-luxury-border bg-luxury-dark/40 px-3 py-3 text-xs text-zinc-300 transition-colors hover:border-luxury-gold hover:text-luxury-gold"
              >
                <Upload className="h-4 w-4" />
                {proofFile ? proofFile.name.slice(0, 40) : 'Choisir un fichier'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleFile}
                className="hidden"
              />
            </div>
            <div>
              <label className="mb-1 block font-mono text-[9px] uppercase tracking-widest text-zinc-500">Note (facultatif)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Ex: virement effectué le 20/09 depuis mon CCP"
                className="w-full resize-none rounded border border-luxury-border bg-luxury-dark/60 px-3 py-2.5 text-sm text-white outline-none focus:border-luxury-gold placeholder:text-zinc-600"
              />
            </div>

            {error && (
              <p className="flex items-start gap-2 rounded border border-red-900/60 bg-red-950/30 p-2.5 text-xs text-red-300" role="alert">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </p>
            )}
            {success && (
              <p className="flex items-start gap-2 rounded border border-emerald-900/60 bg-emerald-950/30 p-2.5 text-xs text-emerald-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                {success}
              </p>
            )}

            <button
              type="button"
              onClick={handleSubmitTransfer}
              disabled={submitting}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded bg-luxury-gold px-4 text-xs font-bold uppercase tracking-widest text-black transition-colors hover:bg-[#E7C85C] disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {submitting ? 'Envoi…' : 'Envoyer le paiement'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3 rounded border border-luxury-border/70 bg-luxury-dark/40 p-4 text-center">
          <CreditCard className="mx-auto h-8 w-8 text-luxury-gold" />
          <p className="text-sm text-white">Paiement en ligne CIB / Edahabia</p>
          <p className="text-xs text-zinc-400">
            Réglez instantanément {SUBSCRIPTION_PRICE_DZD} DA par carte CIB ou Edahabia via Chargily. L’abonnement
            s’active automatiquement après le paiement.
          </p>
          <button
            type="button"
            onClick={handleChargily}
            disabled={chargilyLoading}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded bg-luxury-gold px-4 text-xs font-bold uppercase tracking-widest text-black transition-colors hover:bg-[#E7C85C] disabled:opacity-50"
          >
            {chargilyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            {chargilyLoading ? 'Redirection…' : `Payer ${SUBSCRIPTION_PRICE_DZD} DA en ligne`}
          </button>
          {chargilyMessage && (
            <p className="flex items-start gap-2 rounded border border-amber-900/50 bg-amber-950/20 p-2.5 text-left text-xs text-amber-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {chargilyMessage}
            </p>
          )}
        </div>
      )}

      {/* Historique */}
      <div className="space-y-2">
        <h4 className="font-mono text-[9px] uppercase tracking-widest text-zinc-500">Historique des paiements</h4>
        {loadingHistory ? (
          <p className="flex items-center gap-2 text-xs text-zinc-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Chargement…
          </p>
        ) : payments.length === 0 ? (
          <p className="text-xs text-zinc-600">Aucun paiement pour l’instant.</p>
        ) : (
          <ul className="space-y-2">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 rounded border border-luxury-border/60 bg-luxury-dark/30 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-xs text-white">{p.amountDzd} DA — {p.method === 'chargily' ? 'CIB/Edahabia' : 'Virement'}</p>
                  <p className="font-mono text-[9px] text-zinc-500">{new Date(p.submittedAt).toLocaleDateString('fr-FR')}</p>
                </div>
                <span
                  className={`shrink-0 rounded px-2 py-1 text-[9px] font-mono uppercase tracking-widest ${
                    p.status === 'approved'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : p.status === 'rejected'
                        ? 'bg-red-500/10 text-red-400'
                        : 'bg-amber-500/10 text-amber-400'
                  }`}
                >
                  {p.status === 'approved' ? 'Validé' : p.status === 'rejected' ? 'Refusé' : 'En attente'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

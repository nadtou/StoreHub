import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  BadgeCheck,
  Check,
  Clock,
  ExternalLink,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react';
import { SubscriptionPayment } from '../types';
import { firebaseAuthenticatedFetch } from '../utils/firebaseAuthenticatedFetch';
import { getSubscriptionProofUrl } from '../firebase';

type StatusFilter = 'pending' | 'approved' | 'rejected' | 'all';

const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'pending', label: 'En attente' },
  { id: 'approved', label: 'Validés' },
  { id: 'rejected', label: 'Refusés' },
  { id: 'all', label: 'Tous' },
];

export default function AdminSubscriptionPayments() {
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('pending');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [proofUrls, setProofUrls] = useState<Record<string, string>>({});
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await firebaseAuthenticatedFetch('/api/admin/subscription/payments');
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || 'Chargement impossible.');
      setPayments(Array.isArray(payload) ? payload : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Chargement impossible.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openProof = async (payment: SubscriptionPayment) => {
    if (!payment.proofPath) return;
    try {
      const url = proofUrls[payment.id] || (await getSubscriptionProofUrl(payment.proofPath));
      setProofUrls((prev) => ({ ...prev, [payment.id]: url }));
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      setError("Impossible d'ouvrir le justificatif.");
    }
  };

  const review = async (payment: SubscriptionPayment, approve: boolean, reason?: string) => {
    setBusyId(payment.id);
    setError('');
    try {
      const res = await firebaseAuthenticatedFetch(`/api/admin/subscription/payments/${payment.id}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approve, rejectionReason: reason }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || 'Action impossible.');
      setRejectingId(null);
      setRejectReason('');
      await load();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'Action impossible.');
    } finally {
      setBusyId(null);
    }
  };

  const visible = payments.filter((p) => (filter === 'all' ? true : p.status === filter));
  const pendingCount = payments.filter((p) => p.status === 'pending').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="serif-title text-xl font-light text-white">Paiements & Abonnements</h2>
          <p className="text-xs text-zinc-500">
            {pendingCount > 0 ? `${pendingCount} paiement(s) en attente de validation` : 'Aucun paiement en attente'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="flex items-center gap-2 rounded border border-luxury-border px-3 py-2 text-[10px] uppercase tracking-widest text-zinc-400 transition-colors hover:border-luxury-gold hover:text-luxury-gold"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Actualiser
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest transition-colors ${
              filter === f.id
                ? 'border-luxury-gold bg-luxury-gold/10 text-luxury-gold'
                : 'border-luxury-border text-zinc-400 hover:border-zinc-500'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="flex items-start gap-2 rounded border border-red-900/60 bg-red-950/30 p-2.5 text-xs text-red-300" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </p>
      )}

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement des paiements…
        </p>
      ) : visible.length === 0 ? (
        <p className="rounded border border-luxury-border/60 bg-luxury-dark/30 p-6 text-center text-sm text-zinc-600">
          Aucun paiement dans cette catégorie.
        </p>
      ) : (
        <ul className="space-y-3">
          {visible.map((payment) => (
            <li key={payment.id} className="rounded-lg border border-luxury-border bg-luxury-panel/50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{payment.boutiqueName}</p>
                  <p className="font-mono text-[10px] text-zinc-500">{payment.boutiqueId}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
                    <span className="text-luxury-gold">{payment.amountDzd} DA</span>
                    <span>{payment.method === 'chargily' ? 'CIB/Edahabia' : 'Virement / CCP'}</span>
                    <span>{new Date(payment.submittedAt).toLocaleString('fr-FR')}</span>
                  </div>
                  {payment.reference && (
                    <p className="mt-1 text-xs text-zinc-400">Réf : <span className="text-white">{payment.reference}</span></p>
                  )}
                  {payment.senderNote && (
                    <p className="mt-1 text-xs italic text-zinc-500">« {payment.senderNote} »</p>
                  )}
                  {payment.status === 'rejected' && payment.rejectionReason && (
                    <p className="mt-1 text-xs text-red-400">Motif refus : {payment.rejectionReason}</p>
                  )}
                  {payment.status === 'approved' && payment.periodEnd && (
                    <p className="mt-1 text-xs text-emerald-400">
                      Abonnement jusqu’au {new Date(payment.periodEnd).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
                <span
                  className={`flex shrink-0 items-center gap-1 rounded px-2 py-1 text-[9px] font-mono uppercase tracking-widest ${
                    payment.status === 'approved'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : payment.status === 'rejected'
                        ? 'bg-red-500/10 text-red-400'
                        : 'bg-amber-500/10 text-amber-400'
                  }`}
                >
                  {payment.status === 'approved' ? <BadgeCheck className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                  {payment.status === 'approved' ? 'Validé' : payment.status === 'rejected' ? 'Refusé' : 'En attente'}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {payment.proofPath && (
                  <button
                    type="button"
                    onClick={() => void openProof(payment)}
                    className="flex items-center gap-1.5 rounded border border-luxury-border px-3 py-2 text-[10px] uppercase tracking-widest text-zinc-300 transition-colors hover:border-luxury-gold hover:text-luxury-gold"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Voir le justificatif
                  </button>
                )}

                {payment.status === 'pending' && rejectingId !== payment.id && (
                  <>
                    <button
                      type="button"
                      disabled={busyId === payment.id}
                      onClick={() => void review(payment, true)}
                      className="flex items-center gap-1.5 rounded bg-emerald-600 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                    >
                      {busyId === payment.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      Valider
                    </button>
                    <button
                      type="button"
                      disabled={busyId === payment.id}
                      onClick={() => { setRejectingId(payment.id); setRejectReason(''); }}
                      className="flex items-center gap-1.5 rounded border border-red-800/60 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-red-400 transition-colors hover:bg-red-950/40 disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" /> Refuser
                    </button>
                  </>
                )}
              </div>

              {rejectingId === payment.id && (
                <div className="mt-3 space-y-2 rounded border border-red-900/50 bg-red-950/20 p-3">
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Motif du refus (visible par la boutique)"
                    className="w-full rounded border border-luxury-border bg-luxury-dark/60 px-3 py-2 text-xs text-white outline-none focus:border-red-500 placeholder:text-zinc-600"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busyId === payment.id}
                      onClick={() => void review(payment, false, rejectReason.trim() || undefined)}
                      className="flex items-center gap-1.5 rounded bg-red-600 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-red-500 disabled:opacity-50"
                    >
                      {busyId === payment.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                      Confirmer le refus
                    </button>
                    <button
                      type="button"
                      onClick={() => { setRejectingId(null); setRejectReason(''); }}
                      className="rounded border border-luxury-border px-3 py-2 text-[10px] uppercase tracking-widest text-zinc-400 hover:text-white"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

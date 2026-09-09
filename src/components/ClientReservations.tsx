import { AlertCircle, Clock3, PackageCheck, RefreshCw, ShoppingBag, Store } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Boutique, ManualOrder, Product } from '../types';
import { FirebaseAuthRequiredError, firebaseAuthenticatedFetch } from '../utils/firebaseAuthenticatedFetch';

interface ClientReservationsProps {
  boutiques: Boutique[];
  products: Product[];
}

const statusDetails: Record<ManualOrder['status'], { label: string; className: string; icon: typeof Clock3 }> = {
  en_attente: {
    label: 'En attente',
    className: 'border-amber-500/35 bg-amber-500/10 text-amber-300',
    icon: Clock3,
  },
  en_cours: {
    label: 'Confirmée',
    className: 'border-luxury-gold/40 bg-luxury-gold/10 text-luxury-gold',
    icon: ShoppingBag,
  },
  livre: {
    label: 'Livrée',
    className: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300',
    icon: PackageCheck,
  },
};

export default function ClientReservations({ boutiques, products }: ClientReservationsProps) {
  const [reservations, setReservations] = useState<ManualOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReservations = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await firebaseAuthenticatedFetch('/api/reservations/mine');
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Impossible de charger vos réservations.');
      setReservations(Array.isArray(payload) ? payload : []);
    } catch (loadError) {
      setError(loadError instanceof FirebaseAuthRequiredError
        ? 'Reconnectez-vous pour consulter vos réservations.'
        : loadError instanceof Error
          ? loadError.message
          : 'Impossible de charger vos réservations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReservations();
  }, []);

  return (
    <section className="space-y-4 text-left" aria-labelledby="client-reservations-title">
      <div className="flex items-end justify-between gap-4 border-b border-luxury-border pb-3">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-luxury-gold">Suivi personnel</p>
          <h3 id="client-reservations-title" className="serif-title mt-1 text-xl font-light text-white">Mes réservations</h3>
        </div>
        {!loading && !error && (
          <span className="border border-luxury-border px-2 py-1 font-mono text-[9px] text-zinc-400">
            {reservations.length}
          </span>
        )}
      </div>

      {loading && (
        <div className="flex min-h-32 flex-col items-center justify-center border border-luxury-border bg-luxury-panel/20">
          <RefreshCw className="h-5 w-5 animate-spin text-luxury-gold" />
          <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-500">Chargement des réservations</p>
        </div>
      )}

      {!loading && error && (
        <div className="border border-red-900/40 bg-red-950/10 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            <div className="min-w-0 flex-1">
              <p className="text-xs leading-relaxed text-red-200">{error}</p>
              <button
                type="button"
                onClick={loadReservations}
                className="mt-3 min-h-10 border border-red-800/50 px-4 font-mono text-[9px] uppercase tracking-widest text-red-300 transition-colors hover:bg-red-950/30"
              >
                Réessayer
              </button>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && reservations.length === 0 && (
        <div className="flex min-h-40 flex-col items-center justify-center border border-dashed border-luxury-gold/25 bg-luxury-panel/10 px-6 text-center">
          <ShoppingBag className="h-7 w-7 text-luxury-gold/55" />
          <h4 className="serif-title mt-3 text-base font-light text-white">Aucune réservation</h4>
          <p className="mt-1 max-w-64 text-[11px] leading-relaxed text-zinc-500">
            Les articles que vous réservez auprès des boutiques apparaîtront ici avec leur statut.
          </p>
        </div>
      )}

      {!loading && !error && reservations.length > 0 && (
        <div className="space-y-3">
          {reservations.map((reservation) => {
            const product = products.find(item => item.id === reservation.productId);
            const boutique = boutiques.find(item => item.id === reservation.boutiqueId);
            const status = statusDetails[reservation.status] || statusDetails.en_attente;
            const StatusIcon = status.icon;

            return (
              <article key={reservation.id} className="border border-luxury-border bg-luxury-panel/20 p-3">
                <div className="flex gap-3">
                  {product?.images[0]?.url ? (
                    <img
                      src={product.images[0].url}
                      alt=""
                      className="h-20 w-16 shrink-0 border border-luxury-border object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-16 shrink-0 items-center justify-center border border-luxury-border bg-black/40">
                      <ShoppingBag className="h-5 w-5 text-zinc-600" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="serif-title truncate text-sm font-light text-white">
                        {reservation.productName || product?.name || 'Article réservé'}
                      </h4>
                      <span className={`flex shrink-0 items-center gap-1 border px-2 py-1 font-mono text-[8px] uppercase tracking-wider ${status.className}`}>
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </span>
                    </div>

                    <p className="mt-1 flex items-center gap-1.5 text-[10px] text-zinc-500">
                      <Store className="h-3 w-3 text-luxury-gold/70" />
                      {boutique?.name || 'Boutique StoreHub'}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[9px] text-zinc-400">
                      {reservation.selectedSize && <span>Taille {reservation.selectedSize}</span>}
                      {reservation.selectedColor && <span>{reservation.selectedColor}</span>}
                      {reservation.amount && <span className="text-luxury-gold">{reservation.amount}</span>}
                    </div>
                  </div>
                </div>

                <p className="mt-3 border-t border-luxury-border/70 pt-2 font-mono text-[8px] uppercase tracking-wider text-zinc-600">
                  Réservée le {new Date(reservation.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

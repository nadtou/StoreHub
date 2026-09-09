import { useState } from 'react';
import { Boutique } from '../types';
import { ArrowLeft, Search, MapPin, Store, MessageSquare, ExternalLink, Star } from 'lucide-react';

interface BoutiquesListProps {
  boutiques: Boutique[];
  isLoading?: boolean;
  onBack: () => void;
  onVisitBoutique: (boutiqueId: string) => void;
  onContactBoutique: (boutique: Boutique) => void;
}

export default function BoutiquesList({ boutiques, isLoading = false, onBack, onVisitBoutique, onContactBoutique }: BoutiquesListProps) {
  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState('Toutes');

  const cities = ['Toutes', 'Alger', 'Oran', 'Constantine', 'Annaba', 'Tlemcen', 'Paris'];

  const filtered = boutiques.filter(b => {
    const cityName = b.location?.city || 'Alger';
    const matchSearch = b.name.toLowerCase().includes(search.toLowerCase()) || 
                        b.description.toLowerCase().includes(search.toLowerCase()) ||
                        cityName.toLowerCase().includes(search.toLowerCase());
    const matchCity = selectedCity === 'Toutes' || cityName.toLowerCase().includes(selectedCity.toLowerCase());
    return matchSearch && matchCity;
  });

  return (
    <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 pt-8 pb-2 animate-fadeIn space-y-6 flex-1 flex flex-col">
      
      {/* Header with Return Arrow */}
      <div className="flex items-center justify-between border-b border-luxury-border pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-luxury-panel border border-luxury-border hover:border-luxury-gold/50 flex items-center justify-center text-zinc-400 hover:text-luxury-gold transition-all cursor-pointer"
            title="Retour"
          >
            <ArrowLeft className="w-4.5 h-4.5" />
          </button>
          <div>
            <h1 className="serif-title text-xl font-light text-white tracking-wide">
              Boutiques suivies
            </h1>
            <p className="font-mono text-[9px] uppercase tracking-widest text-luxury-gold">
              Vos abonnements ({filtered.length})
            </p>
          </div>
        </div>
        <Store className="w-5 h-5 text-luxury-gold opacity-80" />
      </div>

      {/* Filter and Search controls */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher une boutique, créateur ou ville..."
            className="w-full bg-[#101010] border border-luxury-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-luxury-gold transition-all font-sans"
          />
        </div>

        {/* City Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {cities.map(city => (
            <button
              key={city}
              onClick={() => setSelectedCity(city)}
              className={`px-3 py-1 rounded-full text-[10px] font-mono tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                selectedCity === city
                  ? 'bg-luxury-gold text-black font-semibold'
                  : 'bg-luxury-panel border border-luxury-border text-zinc-400 hover:text-white'
              }`}
            >
              {city}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Boutiques - Strictly 2 items per row */}
      {isLoading ? (
        <div className="py-12 text-center text-zinc-500 font-mono text-xs">
          Chargement de vos boutiques suivies…
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-zinc-500 font-mono text-xs">
          {search || selectedCity !== 'Toutes'
            ? 'Aucune boutique suivie ne correspond à votre recherche.'
            : 'Vous ne suivez encore aucune boutique.'}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:gap-6">
          {filtered.map(b => (
            <div
              key={b.id}
              className="bg-[#090909] border border-[#141414] rounded-2xl overflow-hidden flex flex-col justify-between hover:border-luxury-gold/30 transition-all duration-300 group"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-zinc-900">
                <img
                  src={b.coverImage}
                  alt={b.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                
                {/* Logo badge */}
                <div className="absolute bottom-2 left-2 flex items-center gap-2">
                  <img
                    src={b.logo}
                    alt={b.name}
                    className="w-8 h-8 rounded-full border border-luxury-gold/50 object-cover bg-black"
                  />
                  <div className="text-left">
                    <h3 className="serif-title text-xs font-semibold text-white tracking-wide truncate max-w-[110px]">
                      {b.name}
                    </h3>
                    <div className="flex items-center gap-1 text-[9px] text-zinc-300 font-mono">
                      <MapPin className="w-2.5 h-2.5 text-luxury-gold" />
                      <span>{b.location?.city || 'Alger'}</span>
                    </div>
                  </div>
                </div>

                <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-full border border-luxury-border flex items-center gap-1">
                  <Star className="w-3 h-3 text-luxury-gold fill-luxury-gold" />
                  <span className="text-[9px] font-mono text-white font-semibold">4.9</span>
                </div>
              </div>

              {/* Description & Tags */}
              <div className="p-3 space-y-2 flex-grow flex flex-col justify-between">
                <p className="text-[10px] text-zinc-400 line-clamp-2 leading-relaxed font-light">
                  {b.description}
                </p>

                <div className="flex flex-wrap gap-1">
                  {b.tags?.slice(0, 2).map(tag => (
                    <span key={tag} className="text-[8px] font-mono px-1.5 py-0.5 bg-luxury-panel border border-luxury-border text-luxury-gold rounded">
                      #{tag}
                    </span>
                  ))}
                </div>

                {/* Actions */}
                <div className="pt-2 flex items-center gap-2 border-t border-[#141414]">
                  <button
                    onClick={() => onVisitBoutique(b.id)}
                    className="flex-1 py-1.5 bg-luxury-gold text-black rounded text-[10px] font-mono font-semibold hover:bg-white transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>Visiter</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>

                  <button
                    onClick={() => onContactBoutique(b)}
                    className="w-7 h-7 rounded bg-luxury-panel border border-luxury-border hover:border-luxury-gold/50 text-zinc-300 hover:text-luxury-gold flex items-center justify-center transition-all cursor-pointer"
                    title="Contacter en privé"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

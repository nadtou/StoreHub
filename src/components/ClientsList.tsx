import { useState } from 'react';
import { ArrowLeft, Search, UserCheck, Mail, Calendar, ShieldCheck, MessageSquare, Sparkles } from 'lucide-react';

interface ClientItem {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  role: string;
  createdAt: string;
  favoritesCount?: number;
  vipStatus?: boolean;
}

interface ClientsListProps {
  onBack: () => void;
  onContactClient?: (client: ClientItem) => void;
}

const mockClients: ClientItem[] = [
  {
    uid: 'client_1',
    displayName: 'Marie Laurent',
    email: 'marie.laurent@gmail.com',
    photoURL: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
    role: 'CLIENT ÉLITE',
    createdAt: '2026-07-12',
    favoritesCount: 14,
    vipStatus: true
  },
  {
    uid: 'client_2',
    displayName: 'Yasmine Benali',
    email: 'yasmine.b@yahoo.fr',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    role: 'CLIENT ÉLITE',
    createdAt: '2026-07-18',
    favoritesCount: 8,
    vipStatus: true
  },
  {
    uid: 'client_3',
    displayName: 'Karim Mansouri',
    email: 'karim.mansouri@outlook.com',
    photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    role: 'CLIENT',
    createdAt: '2026-07-25',
    favoritesCount: 5,
    vipStatus: false
  },
  {
    uid: 'client_4',
    displayName: 'Lina Zerrouki',
    email: 'lina.zerrouki@gmail.com',
    photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    role: 'CLIENT ÉLITE',
    createdAt: '2026-08-01',
    favoritesCount: 19,
    vipStatus: true
  },
  {
    uid: 'client_5',
    displayName: 'Samy Khelil',
    email: 'samy.khelil@icloud.com',
    photoURL: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    role: 'CLIENT',
    createdAt: '2026-08-02',
    favoritesCount: 3,
    vipStatus: false
  }
];

export default function ClientsList({ onBack, onContactClient }: ClientsListProps) {
  const [search, setSearch] = useState('');
  const [filterVip, setFilterVip] = useState(false);

  const filtered = mockClients.filter(c => {
    const matchSearch = c.displayName.toLowerCase().includes(search.toLowerCase()) || 
                        c.email.toLowerCase().includes(search.toLowerCase());
    const matchVip = !filterVip || c.vipStatus;
    return matchSearch && matchVip;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 pb-24 animate-fadeIn space-y-6">
      
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
              Espace Clients
            </h1>
            <p className="font-mono text-[9px] uppercase tracking-widest text-luxury-gold">
              Annuaire & Membres Préférés ({filtered.length})
            </p>
          </div>
        </div>
        <UserCheck className="w-5 h-5 text-luxury-gold opacity-80" />
      </div>

      {/* Filter and Search controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-grow">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un membre par nom ou email..."
            className="w-full bg-[#101010] border border-luxury-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-luxury-gold transition-all font-sans"
          />
        </div>

        <button
          onClick={() => setFilterVip(!filterVip)}
          className={`px-4 py-2.5 rounded-xl text-xs font-mono tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
            filterVip
              ? 'bg-luxury-gold text-black font-semibold'
              : 'bg-luxury-panel border border-luxury-border text-zinc-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Filtre VIP</span>
        </button>
      </div>

      {/* Grid of Clients - Strictly 2 per row */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-zinc-500 font-mono text-xs">
          Aucun client ne correspond à la recherche.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:gap-6">
          {filtered.map(client => (
            <div
              key={client.uid}
              className="bg-[#090909] border border-[#141414] rounded-2xl p-4 flex flex-col items-center justify-between hover:border-luxury-gold/30 transition-all duration-300 space-y-3 group text-center"
            >
              {/* Photo centrée + Infos centrées */}
              <div className="flex flex-col items-center text-center space-y-2 w-full">
                <img
                  src={client.photoURL}
                  alt={client.displayName}
                  className="w-12 h-12 rounded-full border border-luxury-gold/40 object-cover bg-black shrink-0 mx-auto"
                />
                <div className="min-w-0 w-full text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <h3 className="serif-title text-xs font-semibold text-white tracking-wide truncate">
                      {client.displayName}
                    </h3>
                    {client.vipStatus && (
                      <ShieldCheck className="w-3 h-3 text-luxury-gold shrink-0" />
                    )}
                  </div>
                  <p className="text-[9px] text-zinc-500 font-mono truncate text-center">
                    {client.email}
                  </p>
                </div>
              </div>

              {/* Status pill & stats */}
              <div className="w-full bg-luxury-panel/40 border border-luxury-border/60 rounded-xl p-2.5 space-y-1.5 text-center">
                <div className="flex items-center justify-between text-[9px] font-mono">
                  <span className="text-zinc-500">Statut:</span>
                  <span className="text-luxury-gold font-semibold uppercase">{client.role}</span>
                </div>
                <div className="flex items-center justify-between text-[9px] font-mono">
                  <span className="text-zinc-500">Coups de cœur:</span>
                  <span className="text-white font-medium">{client.favoritesCount} articles</span>
                </div>
                <div className="flex items-center justify-between text-[9px] font-mono">
                  <span className="text-zinc-500">Membre depuis:</span>
                  <span className="text-zinc-400">{client.createdAt}</span>
                </div>
              </div>

              {/* Contact Button */}
              <button
                onClick={() => onContactClient && onContactClient(client)}
                className="w-full py-2 bg-luxury-panel border border-luxury-border hover:border-luxury-gold/40 hover:bg-luxury-gold/10 text-zinc-300 hover:text-luxury-gold rounded-xl text-[10px] font-mono uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer text-center"
              >
                <MessageSquare className="w-3.5 h-3.5 text-luxury-gold" />
                <span>Message</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { MessageSquare, Clock, ChevronRight, User } from "lucide-react";
import { Boutique, UserProfile, UserRole } from "../types";
import { getStableChatUserId, getUserBoutique } from "../utils/chatIdentity";
import { firebaseAuthenticatedFetch } from "../utils/firebaseAuthenticatedFetch";

export interface Thread {
  chatId: string;
  boutiqueId?: string;
  boutiqueName?: string;
  boutiqueLogo?: string;
  clientId?: string;
  clientName?: string;
  clientPhoto?: string;
  lastMessageText: string;
  lastMessageTime: string;
  senderRole: string;
  senderName: string;
}

interface BoutiqueChatThreadsProps {
  currentUser: { role: UserRole; email: string; uid?: string; displayName?: string; photoURL?: string };
  onSelectThread: (chatId: string, boutique: Boutique, client: any) => void;
  boutiques: Boutique[];
}

export default function BoutiqueChatThreads({
  currentUser,
  onSelectThread,
  boutiques,
}: BoutiqueChatThreadsProps) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);

  const isClient = currentUser.role === UserRole.CLIENT;
  const activeBoutique = getUserBoutique(currentUser, boutiques);
  const userIdentifier = isClient
    ? getStableChatUserId(currentUser)
    : activeBoutique?.id || "";

  useEffect(() => {
    const fetchThreads = async () => {
      if (!userIdentifier) {
        setLoading(false);
        return;
      }
      
      try {
        const url = isClient
          ? `/api/chats/threads/client/${encodeURIComponent(userIdentifier)}`
          : `/api/chats/threads/boutique/${encodeURIComponent(userIdentifier)}?ownerId=${encodeURIComponent(activeBoutique?.ownerId || "")}`;
        
        const response = await firebaseAuthenticatedFetch(url);
        if (response.ok) {
          const data = await response.json();
          setThreads(data);
        }
      } catch (error) {
        console.error("Failed to load chat threads:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchThreads();
    const interval = setInterval(fetchThreads, 10000); // Poll threads list every 10s

    return () => clearInterval(interval);
  }, [userIdentifier, isClient, activeBoutique?.ownerId]);

  const handleThreadClick = (thread: Thread) => {
    // We need to build the full Boutique and Client models to pass to the active chat screen
    const threadBoutiqueId = thread.boutiqueId;
    if (!threadBoutiqueId) return;
    const foundBoutique = boutiques.find((b) => b.id === threadBoutiqueId);
    if (!foundBoutique) return;
    
    const threadClient: any = {
      uid: thread.clientId || currentUser.uid || "user_demo_1",
      displayName: thread.clientName || "Marie Laurent",
      photoURL: thread.clientPhoto || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
      email: isClient ? currentUser.email : "client@storehub.com"
    };

    onSelectThread(thread.chatId, foundBoutique, threadClient);
  };

  if (loading) {
    return (
      <div className="py-12 text-center space-y-2">
        <div className="w-5 h-5 border border-luxury-gold border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Chargement des messages...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-4 h-[1px] bg-luxury-gold/50" />
        <h3 className="font-mono text-[10px] uppercase text-luxury-gold tracking-[0.25em] font-semibold">
          Vos Échanges Directs
        </h3>
      </div>

      {threads.length === 0 ? (
        <div className="p-6 bg-luxury-panel/30 border border-luxury-border text-center space-y-3">
          <MessageSquare className="w-6 h-6 text-zinc-600 mx-auto" />
          <div className="space-y-0.5">
            <h4 className="text-xs text-zinc-400 font-medium font-sans">Aucun message pour le moment</h4>
            <p className="text-[10px] text-zinc-500 font-light max-w-[240px] mx-auto leading-relaxed">
              {isClient
                ? "Discutez avec les créateurs en visitant la page de leur boutique et en cliquant sur 'Contacter l'Atelier'."
                : "Les messages de vos clients apparaîtront ici dès qu'ils vous contacteront."}
            </p>
          </div>
        </div>
      ) : (
        <div className="border border-luxury-border divide-y divide-luxury-border bg-luxury-panel/10">
          {threads.map((thread) => {
            const partnerName = isClient ? thread.boutiqueName : thread.clientName;
            const partnerLogo = isClient ? thread.boutiqueLogo : thread.clientPhoto;
            
            // Format time
            const lastMsgDate = new Date(thread.lastMessageTime);
            const timeStr = lastMsgDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            const dateStr = lastMsgDate.toLocaleDateString([], { month: "short", day: "numeric" });
            const formattedTime = `${dateStr} à ${timeStr}`;

            return (
              <div
                key={thread.chatId}
                onClick={() => handleThreadClick(thread)}
                className="flex items-center justify-between p-4 hover:bg-luxury-panel/30 cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-3.5 flex-grow min-w-0">
                  <img
                    src={partnerLogo}
                    alt={partnerName}
                    className="w-11 h-11 rounded-full object-cover border border-luxury-gold/20 shrink-0"
                  />
                  <div className="min-w-0 flex-grow">
                    <div className="flex items-baseline justify-between gap-2">
                      <h4 className="serif-title text-sm font-light text-white group-hover:text-luxury-gold transition-colors truncate">
                        {partnerName}
                      </h4>
                      <span className="font-mono text-[9px] text-zinc-600 shrink-0">
                        {timeStr}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 font-light truncate mt-1 leading-relaxed">
                      <span className="font-medium text-zinc-500">
                        {thread.senderRole === (isClient ? "client" : "boutique") ? "Vous: " : ""}
                      </span>
                      {thread.lastMessageText}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-luxury-gold transition-colors pl-1 shrink-0" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

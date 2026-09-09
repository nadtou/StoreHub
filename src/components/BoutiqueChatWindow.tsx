import React, { useState, useEffect, useRef } from "react";
import { Send, ArrowLeft, Store, MessageSquare, Clock, User } from "lucide-react";
import { Boutique, UserProfile, UserRole } from "../types";
import { getStableChatUserId } from "../utils/chatIdentity";
import { firebaseAuthenticatedFetch } from "../utils/firebaseAuthenticatedFetch";

export interface ChatMessage {
  id: string;
  chatId: string;
  clientId: string;
  clientName: string;
  clientPhoto: string;
  boutiqueId: string;
  boutiqueOwnerId: string;
  boutiqueName: string;
  boutiqueLogo: string;
  senderId: string;
  senderName: string;
  senderRole: "client" | "boutique";
  text: string;
  createdAt: string;
}

interface BoutiqueChatWindowProps {
  chatId: string;
  currentUser: { role: UserRole; email: string; uid?: string; displayName?: string; photoURL?: string };
  boutique: Boutique;
  client: { uid: string; displayName: string; photoURL: string; email: string };
  onBack: () => void;
}

export default function BoutiqueChatWindow({
  chatId,
  currentUser,
  boutique,
  client,
  onBack,
}: BoutiqueChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Poll for messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const participantRole = currentUser.role === UserRole.CLIENT ? "client" : "boutique";
        const participantId = getStableChatUserId(currentUser);
        const response = await firebaseAuthenticatedFetch(
          `/api/chats/messages?chatId=${encodeURIComponent(chatId)}&participantRole=${participantRole}&participantId=${encodeURIComponent(participantId)}`,
        );
        if (response.ok) {
          const data = await response.json();
          setMessages(data);
        }
      } catch (error) {
        console.error("Failed to fetch messages:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages(); // initial fetch
    const interval = setInterval(fetchMessages, 3000); // Poll every 3s for pseudo-realtime

    return () => clearInterval(interval);
  }, [chatId, currentUser]);

  // Scroll to bottom when messages list changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedText = inputText.trim();
    if (!trimmedText || sending) return;

    const senderId = getStableChatUserId(currentUser);
    if (!senderId) {
      setSendError("Votre session n'est pas identifiable. Reconnectez-vous avant d'envoyer un message.");
      return;
    }
    const senderName = currentUser.displayName || currentUser.email.split("@")[0];
    const senderRole = currentUser.role === UserRole.CLIENT ? "client" : "boutique";

    const newMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      chatId,
      clientId: client.uid,
      clientName: client.displayName,
      clientPhoto: client.photoURL,
      boutiqueId: boutique.id,
      boutiqueOwnerId: boutique.ownerId,
      boutiqueName: boutique.name,
      boutiqueLogo: boutique.logo,
      senderId,
      senderName,
      senderRole,
      text: trimmedText,
      createdAt: new Date().toISOString(),
    };

    // Optimistic UI update
    setMessages((prev) => [...prev, newMessage]);
    setInputText("");
    setSendError("");
    setSending(true);

    try {
      const response = await firebaseAuthenticatedFetch("/api/chats/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMessage),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Le message n'a pas pu être enregistré.");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((previous) => previous.filter((message) => message.id !== newMessage.id));
      setInputText(trimmedText);
      setSendError(error instanceof Error ? error.message : "Le message n'a pas pu être envoyé.");
    } finally {
      setSending(false);
    }
  };

  const isClient = currentUser.role === UserRole.CLIENT;
  const chatPartnerName = isClient ? boutique.name : client.displayName;
  const chatPartnerLogo = isClient ? boutique.logo : client.photoURL;

  return (
    <div className="flex flex-col h-full bg-luxury-dark text-white select-none animate-fadeIn">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-luxury-panel border-b border-luxury-border shadow-md shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Retour"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <img
            src={chatPartnerLogo}
            alt={chatPartnerName}
            className="w-10 h-10 rounded-full border border-luxury-gold/30 object-cover"
          />
          <div>
            <h3 className="serif-title text-sm font-light text-white tracking-wide">
              {chatPartnerName}
            </h3>
            <span className="flex items-center gap-1.5 text-[9px] font-mono text-emerald-500 uppercase tracking-widest mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Direct
            </span>
          </div>
        </div>

        {isClient && (
          <div className="text-zinc-500 hover:text-luxury-gold transition-colors text-xs font-mono tracking-wider flex items-center gap-1">
            <Store className="w-4 h-4 text-luxury-gold" />
            <span className="hidden sm:inline">Atelier</span>
          </div>
        )}
      </header>

      {/* Messages Scroll Area */}
      <div className="flex-grow overflow-y-auto px-4 py-6 space-y-4 flex flex-col no-scrollbar">
        {loading && messages.length === 0 ? (
          <div className="flex-grow flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="w-6 h-6 border-2 border-luxury-gold border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-zinc-500 font-mono">Chargement de la conversation...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="w-12 h-12 bg-luxury-panel border border-luxury-border flex items-center justify-center text-luxury-gold">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-[280px]">
              <h4 className="serif-title text-base font-light text-white">Nouvelle discussion</h4>
              <p className="text-zinc-500 text-xs font-light leading-relaxed">
                {isClient
                  ? `Posez vos questions à l'Atelier ${boutique.name} concernant les tailles, les matières ou la livraison personnalisée.`
                  : `Échangez directement avec votre client ${client.displayName} pour convenir d'un rendez-vous d'essayage ou d'un mode de paiement.`}
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === getStableChatUserId(currentUser);
            const messageTime = new Date(msg.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[85%] ${
                  isMe ? "self-end items-end" : "self-start items-start"
                }`}
              >
                {/* Sender name for group chats (optional, but clean) */}
                <span className="text-[9px] text-zinc-500 font-mono mb-1 px-1">
                  {isMe ? "Vous" : msg.senderName}
                </span>

                {/* Message bubble */}
                <div
                  className={`p-3.5 text-xs font-light leading-relaxed rounded-none border ${
                    isMe
                      ? "bg-luxury-gold/5 border-luxury-gold/30 text-white"
                      : "bg-luxury-panel border-luxury-border text-zinc-200"
                  }`}
                >
                  <p className="break-words whitespace-pre-wrap">{msg.text}</p>
                </div>

                {/* Timestamp */}
                <span className="text-[9px] text-zinc-600 font-mono mt-1 flex items-center gap-1 px-1">
                  <Clock className="w-2.5 h-2.5" />
                  {messageTime}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form Footer */}
      {sendError && (
        <p className="px-4 py-2 bg-red-950/40 border-t border-red-900/50 text-[10px] text-red-300" role="alert">
          {sendError}
        </p>
      )}
      <form
        onSubmit={handleSendMessage}
        className="p-3 bg-luxury-panel border-t border-luxury-border flex gap-2 shrink-0 items-center"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Rédiger votre message..."
          className="flex-grow bg-luxury-dark/60 border border-luxury-border/60 text-white text-xs px-3.5 py-3 rounded-none focus:outline-none focus:border-luxury-gold transition-colors placeholder:text-zinc-600"
        />
        <button
          type="submit"
          className="bg-luxury-gold hover:bg-luxury-gold/90 text-black px-4 py-3 font-semibold transition-all flex items-center justify-center shrink-0 disabled:opacity-50 cursor-pointer"
          disabled={!inputText.trim() || sending}
          title="Envoyer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { Product, Boutique } from '../types';
import FennecMascot from './FennecMascot';
import FennecFaceIcon from './FennecFaceIcon';
import { Send, X, Sparkles } from 'lucide-react';

interface FenncoAICenterProps {
  isOpen: boolean;
  onClose: () => void;
  boutique: Boutique;
  products: Product[];
}

interface ChatMsg {
  sender: 'user' | 'fennco';
  text: string;
  timestamp: string;
}

export default function FenncoAICenter({ isOpen, onClose, boutique, products }: FenncoAICenterProps) {
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([
    {
      sender: 'fennco',
      text: `Salam ${boutique?.name || 'Gérant'} ! Je suis FENNCO IA, votre assistant commercial. Posez-moi vos questions sur vos vêtements, votre catalogue ou vos ventes.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [chatMessages, isTyping, isOpen]);

  if (!isOpen) return null;

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = userInput.trim();
    if (!text || isTyping) return;

    const newMsg: ChatMsg = {
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, newMsg]);
    setUserInput('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/fennco-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          boutiqueId: boutique?.id
        })
      });

      if (res.ok) {
        const data = await res.json();
        setChatMessages(prev => [...prev, {
          sender: 'fennco',
          text: data.text || "J'ai analysé votre demande. Comment puis-je vous aider davantage ?",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      } else {
        throw new Error("Erreur serveur");
      }
    } catch (err) {
      // Direct clear response fallback
      setTimeout(() => {
        setChatMessages(prev => [...prev, {
          sender: 'fennco',
          text: `Pour votre boutique **${boutique?.name || 'Atelier'}** :\n\n- Vous avez **${products.length} articles** enregistrés.\n- Astuce : Pensez à vérifier vos pièces en rupture de stock et à mettre en avant vos modèles phares.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }, 500);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      {/* Container: Fullscreen on mobile, rounded modal on desktop */}
      <div className="relative w-full h-full max-h-full sm:h-[85vh] sm:max-w-xl bg-[#0A0A0A] border-0 sm:border sm:border-[#D4AF37]/40 shadow-[0_0_40px_rgba(212,175,55,0.2)] flex flex-col overflow-hidden sm:rounded-2xl">
        
        {/* Header - Mobile First */}
        <div className="p-4 bg-gradient-to-b from-[#141414] to-[#0A0A0A] border-b border-[#D4AF37]/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <FennecMascot size="md" showGlow={true} />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="serif-title text-xl font-normal text-[#D4AF37] tracking-wide">
                  FENNCO IA
                </h2>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-[11px] text-zinc-400 tracking-wide font-sans">
                Assistant Question / Réponse
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 hover:border-[#D4AF37] text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Zone d'affichage des réponses (Chat Messages) */}
        <div className="relative flex-1 overflow-y-auto p-4 bg-[#0A0A0A]">
          {/* Fennec Emblem Watermark Background — decorative only, ~90% transparent, scaled down 30%, edges faded into the black background */}
          <div
            className="absolute inset-0 bg-center bg-cover bg-no-repeat pointer-events-none"
            style={{
              backgroundImage: "url('/assets/fennco-chat-bg.jpg')",
              opacity: 0.1,
              transform: 'scale(0.7)',
              WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 72%)',
              maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 72%)',
            }}
            aria-hidden="true"
          />

          <div className="relative z-10 space-y-4">
          {chatMessages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-2 mb-1 px-1">
                {msg.sender === 'fennco' && (
                  <FennecFaceIcon className="w-3.5 h-3.5 text-[#D4AF37]" />
                )}
                <span className="text-[10px] text-zinc-500 font-mono">
                  {msg.sender === 'user' ? 'Vous' : 'FENNCO IA'} • {msg.timestamp}
                </span>
              </div>

              <div
                className={`max-w-[88%] sm:max-w-[80%] p-3.5 rounded-2xl text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-[#D4AF37] text-black font-medium rounded-tr-none shadow-[0_2px_10px_rgba(212,175,55,0.2)]'
                    : 'bg-[#141414] text-white border border-[#D4AF37]/30 rounded-tl-none whitespace-pre-wrap shadow-[0_2px_12px_rgba(0,0,0,0.5)]'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex items-center gap-2 text-[#D4AF37] text-xs font-mono p-2 animate-pulse">
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>FENNCO IA formule votre réponse...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Formulaire de saisie (Mobile First) */}
        <form 
          onSubmit={handleSendMessage}
          className="p-3 sm:p-4 bg-[#121212] border-t border-[#D4AF37]/30 flex items-center gap-2 shrink-0"
        >
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Posez votre question à FENNCO IA..."
            className="flex-1 bg-[#0A0A0A] border border-zinc-800 focus:border-[#D4AF37] text-white placeholder-zinc-500 text-sm px-4 py-3 rounded-xl focus:outline-none transition-colors"
          />

          <button
            type="submit"
            disabled={!userInput.trim() || isTyping}
            className="bg-[#D4AF37] hover:bg-[#c49f2e] active:scale-95 text-black px-4 sm:px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all disabled:opacity-40 disabled:scale-100 cursor-pointer shrink-0 shadow-[0_0_15px_rgba(212,175,55,0.25)]"
          >
            <span className="hidden sm:inline">Envoyer</span>
            <Send className="w-4 h-4" />
          </button>
        </form>

      </div>
    </div>
  );
}

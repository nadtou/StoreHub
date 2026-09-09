import { useState, useRef, useEffect } from 'react';
import { Product, UserPreferences } from '../types';
import { Send, Sparkles, MessageSquare, Compass, Trash2, ArrowRight } from 'lucide-react';

interface Message {
  id: string;
  sender: 'user' | 'model';
  text: string;
  timestamp: Date;
}

interface StylistChatProps {
  preferences: UserPreferences | null;
  products: Product[];
  onProductClick: (product: Product) => void;
}

export default function StylistChat({ preferences, products, onProductClick }: StylistChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'model',
      text: "Bonjour. Je suis FENNCO IA, votre conseiller mode personnel chez StoreHub.\n\nJe peux vous aider à trouver des articles pour femme, homme ou enfant, puis composer une tenue selon votre style. Que recherchez-vous aujourd’hui ?",
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const suggestedPrompts = [
    "Compose-moi une tenue élégante pour une occasion.",
    "Propose-moi un look minimaliste pour tous les jours.",
    "Quelles chaussures vont avec mes préférences ?"
  ];

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: `msg_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      // Proxy request to backend Express Gemini Endpoint
      const response = await fetch('/api/stylist/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages,
          preferences
        })
      });

      if (!response.ok) {
        throw new Error("Impossible de joindre FENNCO IA.");
      }

      const result = await response.json();
      
      const modelMsg: Message = {
        id: `msg_${Date.now() + 1}`,
        sender: 'model',
        text: result.text || "Pardonnez-moi, mes fils se sont emmêlés. Pouvons-nous reprendre ?",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, modelMsg]);
    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
        id: `msg_${Date.now() + 1}`,
        sender: 'model',
        text: "Mes excuses les plus sincères, j'ai rencontré un léger contretemps technique lors de notre session style. Pouvons-nous réessayer dans un instant ?",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome',
        sender: 'model',
        text: "Bonjour. Je suis FENNCO IA, votre conseiller mode personnel chez StoreHub.\n\nReprenons sur de nouvelles bases. Quel article ou quelle tenue recherchez-vous aujourd’hui ?",
        timestamp: new Date()
      }
    ]);
  };

  // Extract products mentioned in FENNCO IA's message for quick interaction
  const getMentionedProducts = (text: string): Product[] => {
    return products.filter(p => {
      const escapedName = p.name.toLowerCase();
      return text.toLowerCase().includes(escapedName);
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-6 mt-[45px] pb-24 h-[calc(100vh-180px)] flex flex-col justify-between">
      
      {/* Chat header */}
      <div className="flex justify-between items-center pb-4 border-b border-luxury-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border border-luxury-gold/30 bg-luxury-gold/5 flex items-center justify-center relative">
            <Sparkles className="w-5 h-5 text-luxury-gold animate-pulse" />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-black" />
          </div>
          <div>
            <h1 className="serif-title text-lg font-light text-white tracking-wide">
              FENNCO IA
            </h1>
            <p className="font-mono text-[9px] uppercase tracking-widest text-luxury-gold">
              Conseiller mode StoreHub • En ligne
            </p>
          </div>
        </div>

        <button
          onClick={clearChat}
          className="w-9 h-9 rounded-none bg-luxury-panel/60 hover:bg-luxury-panel border border-luxury-border hover:border-luxury-border/60 text-zinc-500 hover:text-zinc-300 flex items-center justify-center transition-colors"
          title="Réinitialiser l'entretien"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Messages list */}
      <div className="flex-grow overflow-y-auto py-6 space-y-6 pr-2 no-scrollbar">
        {messages.map(msg => {
          const isModel = msg.sender === 'model';
          const mentioned = isModel ? getMentionedProducts(msg.text) : [];
          
          return (
            <div key={msg.id} className={`flex flex-col ${isModel ? 'items-start' : 'items-end'} animate-fadeIn`}>
              
              {/* Message text bubble */}
              <div 
                className={`max-w-[85%] rounded-none px-4.5 py-3.5 text-xs tracking-wide leading-relaxed ${
                  isModel 
                    ? 'bg-luxury-panel/30 border border-luxury-border text-zinc-200 font-light whitespace-pre-line' 
                    : 'bg-luxury-gold text-black font-semibold'
                }`}
              >
                {msg.text}
              </div>

              {/* Mentioned products recommendations block (inside assistant's response) */}
              {mentioned.length > 0 && (
                <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                  {mentioned.map(p => (
                    <div
                      key={p.id}
                      onClick={() => onProductClick(p)}
                      className="flex items-center gap-3 bg-luxury-panel/80 hover:bg-luxury-panel border border-luxury-border hover:border-luxury-gold/25 rounded-none p-2.5 cursor-pointer transition-all"
                    >
                      <img src={p.images[0].url} alt={p.name} className="w-10 h-13 rounded-none object-cover" />
                      <div className="flex-grow">
                        <span className="font-mono text-[8px] text-zinc-500 uppercase tracking-widest block">{p.boutiqueName}</span>
                        <h4 className="serif-title text-xs text-white tracking-wide truncate max-w-[120px]">{p.name}</h4>
                        <span className="font-mono text-[10px] text-luxury-gold font-semibold">{p.price} DA</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
                    </div>
                  ))}
                </div>
              )}

              {/* Timestamp label */}
              <span className="font-mono text-[8px] text-zinc-600 mt-1.5 uppercase">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>

            </div>
          );
        })}

        {/* Typing bubble */}
        {isTyping && (
          <div className="flex flex-col items-start animate-pulse">
            <div className="bg-luxury-panel/30 border border-luxury-border rounded-none px-5 py-3.5 text-xs text-zinc-500 font-mono tracking-widest flex items-center gap-2">
              <span>FENNCO IA prépare sa sélection</span>
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-luxury-gold rounded-none animate-bounce delay-100" />
                <span className="w-1.5 h-1.5 bg-luxury-gold rounded-none animate-bounce delay-200" />
                <span className="w-1.5 h-1.5 bg-luxury-gold rounded-none animate-bounce delay-300" />
              </span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Suggested initial questions */}
      {messages.length === 1 && !isTyping && (
        <div className="pb-4 font-mono text-[9px] uppercase tracking-widest text-zinc-500 text-center">
          <p className="mb-2">Suggestions style :</p>
          <div className="flex flex-wrap justify-center gap-2.5">
            {suggestedPrompts.map(prompt => (
              <button
                key={prompt}
                onClick={() => handleSendMessage(prompt)}
                className="px-3.5 py-1.5 bg-luxury-panel border border-luxury-border hover:border-luxury-gold/25 rounded-none text-zinc-400 hover:text-luxury-gold transition-all font-mono"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Inputs typing bar */}
      <div className="flex gap-3 pt-4 border-t border-luxury-border bg-luxury-dark">
        <input
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSendMessage(inputText)}
          placeholder="Décrivez votre besoin à FENNCO IA..."
          className="flex-grow bg-luxury-panel/40 border border-luxury-border focus:border-luxury-gold rounded-none px-4 py-3 text-sm text-white outline-none transition-all duration-300 font-light"
        />
        <button
          onClick={() => handleSendMessage(inputText)}
          disabled={!inputText.trim() || isTyping}
          className={`w-12 h-12 rounded-none flex items-center justify-center transition-all ${
            inputText.trim() && !isTyping
              ? 'bg-luxury-gold text-black hover:bg-luxury-gold/90 cursor-pointer shadow-lg shadow-luxury-gold/10'
              : 'bg-luxury-panel text-zinc-600 border border-luxury-border cursor-not-allowed'
          }`}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}

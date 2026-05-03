import React, { useState, useRef, useEffect } from "react";
import { 
  Send, 
  Bot, 
  User, 
  Image as ImageIcon, 
  X, 
  Loader2, 
  ArrowLeft,
  Sparkles,
  Zap,
  Dumbbell,
  Mic,
  Camera
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { foodApi } from "@/lib/api";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  image?: string;
  timestamp: Date;
}

const AICoach: React.FC = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm your NutriGuide AI Coach. How can I help you with your fitness and nutrition goals today? You can ask me anything or even share a photo of your food or workout setup!",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = async () => {
    if (!input.trim() && !selectedImage) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      image: selectedImage || undefined,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    const currentImage = selectedImage;
    setSelectedImage(null);
    setIsLoading(true);

    try {
      const res = await foodApi.aiCoach(userMessage.content, currentImage || undefined);
      if (res.ok) {
        const data = await res.json();
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error("Coach is busy at the moment.");
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="hover:bg-white/5 text-slate-400"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-black tracking-tight text-lg leading-none">AI Coach</h1>
              <span className="text-[10px] text-primary font-black uppercase tracking-widest opacity-70">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block mr-1 animate-pulse" />
                Live Expert Mode
              </span>
            </div>
          </div>
        </div>
        
      </header>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 pt-24 pb-32 space-y-6 scroll-smooth custom-scrollbar"
      >
        <AnimatePresence initial={false}>
          {messages.map((m, idx) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] md:max-w-[70%] group`}>
                <div className={`flex items-end gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    m.role === 'user' ? 'bg-primary' : 'bg-slate-800 border border-white/10 text-primary'
                  }`}>
                    {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  
                  <div className={`relative px-4 py-3 rounded-2xl ${
                    m.role === 'user' 
                      ? 'bg-primary text-white rounded-br-none shadow-lg shadow-primary/20' 
                      : 'bg-white/5 border border-white/10 text-slate-100 rounded-bl-none backdrop-blur-3xl'
                  }`}>
                    {m.image && (
                      <div className="mb-3 rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                        <img src={m.image} alt="Uploaded" className="max-w-full h-auto max-h-64 object-cover" />
                      </div>
                    )}
                    <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap font-medium">
                      {m.content}
                    </p>
                    <span className="text-[9px] opacity-40 mt-1 block font-mono">
                      {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-2xl rounded-bl-none flex items-center gap-3">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-xs text-slate-400 font-medium">AI Coach is thinking...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/80 backdrop-blur-xl border-t border-white/5 z-50">
        <div className="max-w-4xl mx-auto relative mt-2">
          {/* Image Preview Overlay */}
          <AnimatePresence>
            {selectedImage && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-full left-0 mb-4 p-2 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-10 flex items-center gap-3"
              >
                <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-white/20">
                  <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
                  <button 
                    onClick={clearImage}
                    className="absolute top-0.5 right-0.5 bg-black/60 text-white p-0.5 rounded-full hover:bg-red-500 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="pr-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-0.5">Attached Image</p>
                  <p className="text-xs text-slate-400 font-medium truncate max-w-[120px]">Multimodal analysis ready</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative group transition-all">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 via-primary/10 to-primary/30 rounded-2xl blur opacity-30 group-focus-within:opacity-100 transition-opacity" />
            <div className="relative flex items-end gap-2 bg-slate-900/90 border border-white/10 rounded-2xl p-2 pl-4">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask your coach anything..."
                className="flex-1 bg-transparent border-0 focus:ring-0 text-slate-100 placeholder:text-slate-500 min-h-[44px] max-h-32 py-3 resize-none outline-none text-sm md:text-base font-medium"
              />
              
              <div className="flex items-center gap-1.5 pb-1">
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                />
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-9 w-9 rounded-xl hover:bg-white/5 text-slate-400"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="w-5 h-5" />
                </Button>
                <Button 
                  onClick={handleSend}
                  disabled={isLoading || (!input.trim() && !selectedImage)}
                  className="h-9 w-9 rounded-xl bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          
          <div className="mt-3 flex justify-center gap-6">
            <div className="flex items-center gap-2 opacity-30">
                <Dumbbell className="w-3 h-3" />
                <span className="text-[10px] font-black uppercase tracking-widest">Training Tips</span>
            </div>
            <div className="flex items-center gap-2 opacity-30">
                <Sparkles className="w-3 h-3" />
                <span className="text-[10px] font-black uppercase tracking-widest">Diet Plans</span>
            </div>
            <div className="flex items-center gap-2 opacity-30">
                <Mic className="w-3 h-3" />
                <span className="text-[10px] font-black uppercase tracking-widest">Voice Ready</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
};

export default AICoach;

'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Sparkles, Bot, User } from 'lucide-react';
import { Pet } from '@/lib/adapters/base';
import { MockAdapter } from '@/lib/adapters/mock';
import { findMatch } from '@/lib/services/ai';
import Image from 'next/image';
import Link from 'next/link';

interface Message {
  role: 'bot' | 'user';
  text: string;
  attachments?: Pet[]; // The pets the AI recommends
}

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: 'Hi! I\'m the AI Matchmaker. Tell me about your lifestyle (e.g., "I live in an apartment and love hiking") and I\'ll find your perfect pet!' }
  ]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // 1. Add User Message
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsTyping(true);

    // 2. Fetch All Pets (In real app, backend does this)
    const adapter = new MockAdapter();
    const allPets = await adapter.getAllPets();

    // 3. Call AI Service
    const response = await findMatch(userMsg, allPets);

    // 4. Add Bot Response
    setIsTyping(false);
    setMessages(prev => [...prev, { 
      role: 'bot', 
      text: response.text,
      attachments: response.pets 
    }]);
  };

  return (
    <>
      {/* TOGGLE BUTTON (Floats in bottom right) */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-slate-900 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform z-50 flex items-center gap-2 animate-bounce-slow"
        >
          <Sparkles size={24} className="text-orange-400" />
          <span className="font-bold pr-2">AI Matchmaker</span>
        </button>
      )}

      {/* CHAT WINDOW */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-full max-w-sm h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
          
          {/* Header */}
          <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
            <div className="flex items-center gap-2">
              <div className="bg-white/10 p-2 rounded-full">
                <Bot size={20} className="text-orange-400" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Pet Concierge</h3>
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Online
                </p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
              <X size={20} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50" ref={scrollRef}>
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl p-4 ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-gray-200 text-slate-700 rounded-tl-none shadow-sm'}`}>
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                  
                  {/* RECOMMENDED PET CARDS */}
                  {msg.attachments && (
                    <div className="mt-3 space-y-2">
                      {msg.attachments.map(pet => (
                        <Link href={`/pet/${pet.id}`} key={pet.id} className="flex items-center gap-3 bg-gray-50 hover:bg-blue-50 p-2 rounded-xl border border-gray-200 transition group">
                          <div className="relative w-12 h-12 flex-shrink-0">
                            <Image src={pet.imageUrl} alt={pet.name} fill className="object-cover rounded-lg" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-slate-900 text-sm truncate">{pet.name}</h4>
                            <p className="text-xs text-slate-500 truncate">{pet.breed}</p>
                          </div>
                          <div className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                             <Send size={16} />
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl p-4 rounded-tl-none shadow-sm flex gap-1">
                   <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                   <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></div>
                   <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100 flex gap-2">
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe your lifestyle..."
              className="flex-1 bg-gray-100 border-0 rounded-xl px-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-medium"
            />
            <button 
                type="submit" 
                disabled={!input.trim() || isTyping}
                className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={18} />
            </button>
          </form>

        </div>
      )}
    </>
  );
}
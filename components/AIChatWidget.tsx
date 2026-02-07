'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Bot, RotateCcw, Zap } from 'lucide-react';
import { Pet } from '@/lib/adapters/base';
import { ConversationState, createInitialState } from '@/lib/services/ai';
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
  
  // Conversation state - persists across messages
  const [conversationState, setConversationState] = useState<ConversationState>(createInitialState());
  
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: 'Hi! I\'m your Pet Concierge. Tell me about your lifestyle and I\'ll find your perfect companion! First - are you looking for a Dog or a Cat?' }
  ]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleStartOver = () => {
    setConversationState(createInitialState());
    setMessages([
      { role: 'bot', text: 'Let\'s start fresh! Are you looking for a Dog or a Cat?' }
    ]);
  };

  // Quick Match - get random pets immediately
  const handleQuickMatch = async () => {
    setIsTyping(true);
    setMessages(prev => [...prev, { role: 'user', text: '⚡ Quick Match!' }]);

    try {
      const res = await fetch('/api/ai/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: 'surprise me with some pets!', 
          conversationState 
        }),
      });
      
      const data = await res.json();
      setConversationState(data.newState);
      setIsTyping(false);
      setMessages(prev => [...prev, { 
        role: 'bot', 
        text: data.reply,
        attachments: data.pets 
      }]);
    } catch (error) {
      setIsTyping(false);
      setMessages(prev => [...prev, { 
        role: 'bot', 
        text: 'Oops! Something went wrong. Please try again.' 
      }]);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // 1. Add User Message
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsTyping(true);

    try {
      // 2. Call the API endpoint
      const res = await fetch('/api/ai/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMsg, 
          conversationState 
        }),
      });
      
      const data = await res.json();
      
      // 3. Update conversation state
      setConversationState(data.newState);

      // 4. Add Bot Response
      setIsTyping(false);
      setMessages(prev => [...prev, { 
        role: 'bot', 
        text: data.reply,
        attachments: data.pets 
      }]);
    } catch (error) {
      setIsTyping(false);
      setMessages(prev => [...prev, { 
        role: 'bot', 
        text: 'Sorry, I had trouble processing that. Please try again!' 
      }]);
    }
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
            <div className="flex items-center gap-2">
              <button 
                onClick={handleStartOver} 
                className="text-slate-400 hover:text-white p-1.5 hover:bg-white/10 rounded-lg transition"
                title="Start Over"
              >
                <RotateCcw size={18} />
              </button>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
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

          {/* Quick Match Button */}
          <div className="px-3 pt-2 bg-white">
            <button
              onClick={handleQuickMatch}
              disabled={isTyping}
              className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white py-2 px-4 rounded-xl hover:from-orange-600 hover:to-pink-600 transition flex items-center justify-center gap-2 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <Zap size={16} />
              Quick Match - Surprise Me!
            </button>
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
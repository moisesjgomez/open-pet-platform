'use client';

import { Pet } from '@/lib/adapters/base';
import Link from 'next/link';
import Image from 'next/image';
import { Star, ArrowRight, Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

export default function UrgentBanner({ pets }: { pets: Pet[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  
  // Ref to track the last time we swiped (to prevent rapid-fire scrolling)
  const lastSwipeTime = useRef(0);

  // Filter Logic
  const specialPets = pets
    .filter(p => p.status === 'Available')
    .sort((a, b) => b.daysInShelter - a.daysInShelter)
    .slice(0, 5);

  const pet = specialPets[currentIndex];

  // Nav Logic
  const nextPet = () => {
    setCurrentIndex((prev) => (prev === specialPets.length - 1 ? 0 : prev + 1));
  };

  const prevPet = () => {
    setCurrentIndex((prev) => (prev === 0 ? specialPets.length - 1 : prev - 1));
  };

  // TRACKPAD SWIPE HANDLER
  const handleWheel = (e: React.WheelEvent) => {
    const now = Date.now();
    // 800ms Cooldown: Don't allow another swipe if we just swiped
    if (now - lastSwipeTime.current < 800) return;

    // deltaX is horizontal scroll (Trackpad left/right)
    if (Math.abs(e.deltaX) > 20) {
      if (e.deltaX > 0) {
        nextPet(); // Swiping Right -> Next
      } else {
        prevPet(); // Swiping Left -> Prev
      }
      lastSwipeTime.current = now; // Reset timer
    }
  };

  // Auto-Scroll Logic
  useEffect(() => {
    if (isHovered) return;

    const timer = setInterval(() => {
      nextPet();
    }, 8000);

    return () => clearInterval(timer);
  }, [currentIndex, isHovered]);

  if (!pet) return null;

  return (
    <div 
      className="max-w-7xl mx-auto px-6 -mt-12 relative z-20 mb-16"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onWheel={handleWheel} // <--- Attach the Trackpad Listener here
    >
      <div className="flex items-center gap-2 mb-4 text-rose-500 font-black text-xl uppercase tracking-wider">
        <span className="animate-pulse">💖</span> Waiting for a Hero
      </div>

      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-rose-100 flex flex-col md:flex-row h-auto md:h-[500px]">
        
        {/* LEFT: Image Area */}
        <div className="relative h-72 md:h-full md:w-1/2 group">
          <div key={pet.id} className="relative w-full h-full animate-in fade-in duration-700">
             <Image 
                src={pet.imageUrl} 
                alt={pet.name} 
                fill 
                className="object-cover"
             />
          </div>

          <div className="absolute top-4 left-4 bg-rose-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg flex items-center gap-2 animate-pulse">
            <Heart size={16} fill="currentColor" />
            Needs Extra Love: {pet.daysInShelter} Days Waiting
          </div>

          <div className="absolute bottom-4 right-4 flex gap-2 z-20">
            <button onClick={prevPet} className="p-3 bg-white/20 text-white hover:bg-slate-900 hover:text-white rounded-full backdrop-blur transition border border-white/30">
                <ChevronLeft size={24} />
            </button>
            <button onClick={nextPet} className="p-3 bg-white/20 text-white hover:bg-slate-900 hover:text-white rounded-full backdrop-blur transition border border-white/30">
                <ChevronRight size={24} />
            </button>
          </div>

          {!isHovered && (
            <div className="absolute bottom-0 left-0 h-1 bg-blue-500 opacity-50" key={currentIndex} style={{ width: '100%', animation: 'shrink 5s linear' }}></div>
          )}
        </div>

        {/* RIGHT: Content */}
        <div className="p-8 md:p-12 flex-1 flex flex-col justify-center items-start bg-gradient-to-br from-white to-blue-50/50">
          <div className="flex items-center justify-between w-full mb-4">
             <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider flex items-center gap-1">
               <Star size={14} fill="currentColor" /> Staff Favorite
             </span>
             <div className="flex gap-1">
                {specialPets.map((_, idx) => (
                    <div key={idx} className={`h-2 w-2 rounded-full transition-all ${idx === currentIndex ? 'bg-slate-900 w-4' : 'bg-gray-300'}`} />
                ))}
             </div>
          </div>
          
          <h2 key={pet.name} className="text-3xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">
            Meet {pet.name}
          </h2>
          
          <p className="text-slate-600 text-lg leading-relaxed mb-8 max-w-lg">
            {pet.description} The staff loves {pet.name} and we are looking for a special home that deserves this loyalty.
          </p>

          <div className="flex flex-wrap gap-4 mt-auto">
            <Link 
              href={`/pet/${pet.id}`} 
              className="px-8 py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition flex items-center gap-2 shadow-lg shadow-slate-200"
            >
              Meet {pet.name} <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes shrink {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
}
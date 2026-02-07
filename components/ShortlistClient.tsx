'use client';

import { useState, useEffect } from 'react';
import { Pet } from '@/lib/adapters/base';
import { loadProfile, removeFromShortlist, saveProfile } from '@/lib/ai/learning-engine';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, ArrowLeft, Trash2, Sparkles } from 'lucide-react';

export default function ShortlistClient({ allPets }: { allPets: Pet[] }) {
  const [shortlist, setShortlist] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const profile = loadProfile();
    
    // Filter allPets to only include the ones in the user's liked list
    const likedPets = allPets.filter(pet => profile.likedPetIds.includes(pet.id));
    
    setShortlist(likedPets);
    setLoading(false);
  }, [allPets]);

  const handleRemove = (petId: string) => {
    const profile = loadProfile();
    const updatedProfile = removeFromShortlist(profile, petId);
    saveProfile(updatedProfile);
    
    // Update UI
    setShortlist(prev => prev.filter(p => p.id !== petId));
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500 font-bold animate-pulse">
        Loading your shortlist...
      </div>
    );
  }

  if (shortlist.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <Heart size={64} className="text-gray-300 mb-4" />
        <h1 className="text-3xl font-black text-slate-900 mb-2">Your Shortlist is Empty</h1>
        <p className="text-gray-500 mb-8 max-w-md">
          Start swiping to add pets to your shortlist. Every pet you swipe right on will appear here!
        </p>
        <div className="flex gap-4">
          <Link 
            href="/swipe" 
            className="px-8 py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition shadow-lg"
          >
            Start Swiping
          </Link>
          <Link 
            href="/" 
            className="px-8 py-4 bg-white text-slate-900 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition"
          >
            Browse All
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-6">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold mb-4 transition"
          >
            <ArrowLeft size={20} />
            Back to Browse
          </Link>
          
          <div className="flex items-center gap-3 mb-2">
            <Heart size={32} className="text-red-500" fill="currentColor" />
            <h1 className="text-4xl font-black text-slate-900">Your Shortlist</h1>
          </div>
          <p className="text-gray-500 text-lg">
            {shortlist.length} {shortlist.length === 1 ? 'pet' : 'pets'} you've fallen for
          </p>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {shortlist.map((pet) => (
            <div 
              key={pet.id} 
              className="group bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300"
            >
              {/* Image */}
              <div className="relative h-72 w-full bg-gray-100">
                <Image 
                  src={pet.imageUrl} 
                  alt={pet.name} 
                  fill 
                  className="object-cover transition-transform duration-500 group-hover:scale-110" 
                />
                
                {/* Remove Button */}
                <button
                  onClick={() => handleRemove(pet.id)}
                  className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-sm rounded-full text-red-500 hover:bg-red-500 hover:text-white transition shadow-lg"
                  title="Remove from shortlist"
                >
                  <Trash2 size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-2xl font-black text-slate-900">{pet.name}</h3>
                  <span className="text-slate-500 font-bold text-sm">{pet.sex}</span>
                </div>
                
                <p className="text-blue-600 font-bold text-sm mb-3 uppercase tracking-wide">
                  {pet.breed}
                </p>
                
                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {pet.tags?.slice(0, 4).map(tag => {
                    let style = 'bg-slate-100 text-slate-700 border-slate-200';
                    if (['High Energy', 'Playful'].includes(tag)) style = 'bg-orange-50 text-orange-700 border-orange-100';
                    else if (['Low Energy', 'Chill', 'Couch Potato'].includes(tag)) style = 'bg-blue-50 text-blue-700 border-blue-100';
                    else if (tag.includes('Good with')) style = 'bg-green-50 text-green-700 border-green-100';
                    else if (!['Dog', 'Cat', 'Small', 'Medium', 'Large'].includes(tag)) style = 'bg-purple-50 text-purple-700 border-purple-100';
                    
                    return (
                      <span key={tag} className={`border px-2 py-1 rounded-md text-xs font-bold ${style}`}>
                        {style.includes('purple') && <Sparkles size={10} className="inline mr-1" />}
                        {tag}
                      </span>
                    );
                  })}
                </div>

                <Link 
                  href={`/pet/${pet.id}`} 
                  className="block w-full text-center py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
                >
                  View Profile
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

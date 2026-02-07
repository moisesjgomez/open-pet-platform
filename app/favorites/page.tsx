'use client';

import { useState, useEffect } from 'react';
import { Pet } from '@/lib/adapters/base';
import Image from 'next/image';
import Link from 'next/link';
import { Trash2, ExternalLink } from 'lucide-react';

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<Pet[]>([]);

  // Load from Browser Memory on startup
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('myFavorites') || '[]');
    setFavorites(saved);
  }, []);

  const removeFavorite = (id: string) => {
    const updated = favorites.filter(pet => pet.id !== id);
    setFavorites(updated);
    localStorage.setItem('myFavorites', JSON.stringify(updated));
  };

  if (favorites.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">No favorites yet!</h1>
        <Link href="/swipe" className="px-6 py-3 bg-slate-900 text-white rounded-full font-bold shadow-lg hover:bg-slate-800 transition">
          Go Swipe
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-black text-gray-900 mb-8 flex items-center gap-2">
          Your Shortlist <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-lg">{favorites.length}</span>
        </h1>

        <div className="grid gap-6">
          {favorites.map((pet) => (
            <div key={pet.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex gap-6 items-center group hover:shadow-md transition">
              
              {/* Thumbnail */}
              <div className="relative w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0">
                <Image src={pet.imageUrl} alt={pet.name} fill className="object-cover rounded-xl" />
              </div>

              {/* Details */}
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900">{pet.name}</h2>
                <p className="text-gray-500 text-sm font-medium">{pet.breed}</p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <Link 
                   href={`/pet/${pet.id}`}
                   className="p-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition flex items-center justify-center"
                >
                   <ExternalLink size={20} />
                </Link>
                <button 
                  onClick={() => removeFavorite(pet.id)}
                  className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition flex items-center justify-center"
                >
                  <Trash2 size={20} />
                </button>
              </div>

            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
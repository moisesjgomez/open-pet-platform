'use client';

import { useState } from 'react';
import { Pet } from '@/lib/adapters/base';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, MapPin, Share2, Heart, ShieldCheck, Sparkles } from 'lucide-react';
import AdoptionFormModal from '@/components/AdoptionFormModal';

export default function PetProfileClient({ pet }: { pet: Pet }) {
  const [showForm, setShowForm] = useState(false);

  // AI MATCH SCORE LOGIC
  const matchScore = pet.tags.includes('Chill') ? 94 : pet.tags.includes('High Energy') ? 88 : 91;
  
  // Gallery State
  const [activeImage, setActiveImage] = useState(pet.imageUrl);

  return (
    <div className="min-h-screen bg-white">
      
      {/* HERO IMAGE & GALLERY */}
      <div className="relative h-[50vh] md:h-[65vh] w-full bg-gray-900 group">
        <Image 
            src={activeImage} 
            alt={pet.name} 
            fill 
            className="object-contain md:object-cover transition-opacity duration-500" 
            priority 
        />
        
        {/* Navigation Overlay */}
        <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start bg-gradient-to-b from-black/60 to-transparent z-20">
            <Link href="/" className="bg-white/10 backdrop-blur-md text-white p-3 rounded-full hover:bg-white hover:text-slate-900 transition border border-white/20">
                <ArrowLeft size={24} />
            </Link>
            <div className="flex gap-3">
                <button className="bg-white/10 backdrop-blur-md text-white p-3 rounded-full hover:bg-white hover:text-slate-900 transition border border-white/20">
                    <Share2 size={24} />
                </button>
            </div>
        </div>

        {/* Gallery Strip (Only if multiple images) */}
        {pet.images && pet.images.length > 1 && (
            <div className="absolute bottom-6 left-0 w-full flex justify-center gap-2 px-4 z-20 overflow-x-auto py-2">
                {pet.images.map((img, idx) => (
                    <button 
                        key={idx}
                        onClick={() => setActiveImage(img)}
                        className={`relative w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border-2 transition-all ${activeImage === img ? 'border-white scale-110 shadow-lg' : 'border-white/30 opacity-70 hover:opacity-100'}`}
                    >
                        <Image src={img} alt={`View ${idx}`} fill className="object-cover" />
                    </button>
                ))}
            </div>
        )}
      </div>

      {/* MAIN CONTENT */}
      <div className="max-w-4xl mx-auto px-6 relative -mt-12 z-10 pb-20">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-10">
            
            {/* Header: Name & Breed */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-2">{pet.name}</h1>
                    <div className="flex items-center gap-2 text-gray-500 font-bold text-lg">
                        <span className="text-orange-500">{pet.breed}</span>
                        <span>•</span>
                        <span>{pet.age}</span>
                        <span>•</span>
                        <span>{pet.sex}</span>
                    </div>
                </div>
                
                {/* AI Match Card */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-2xl border border-indigo-100 flex items-center gap-4 shadow-sm">
                    <div className="bg-white p-3 rounded-full text-indigo-600 shadow-sm">
                        <Sparkles size={24} />
                    </div>
                    <div>
                        <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider">AI Compatibility</div>
                        <div className="text-2xl font-black text-indigo-900">{matchScore}% Match</div>
                    </div>
                </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-3 mb-10">
                {pet.tags?.map(tag => (
                    <span key={tag} className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg text-sm border border-gray-200">
                        {tag}
                    </span>
                ))}
            </div>

            {/* Bio */}
            <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <ShieldCheck className="text-green-500" /> About {pet.name}
            </h3>
            <p className="text-lg text-slate-600 leading-relaxed mb-10 whitespace-pre-wrap">
                {pet.description}
            </p>

            {/* Location */}
            <div className="bg-gray-50 rounded-2xl p-6 flex items-start gap-4 border border-gray-200 mb-10">
                <MapPin className="text-gray-400 mt-1" />
                <div>
                    <h4 className="font-bold text-slate-900">{pet.location}</h4>
                    <p className="text-gray-500 text-sm">Adoption Center</p>
                    <div className="flex gap-4 mt-3 text-sm font-bold text-blue-600">
                        <button className="hover:underline">View on Map</button>
                        <button className="hover:underline">Shelter Hours</button>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col md:flex-row gap-4 pt-6 border-t border-gray-100">
                <button 
                    onClick={() => setShowForm(true)}
                    className="flex-1 bg-slate-900 text-white py-4 rounded-xl font-black text-lg hover:bg-slate-800 transition shadow-lg shadow-slate-200 flex items-center justify-center gap-2"
                >
                    <Heart fill="currentColor" className="text-red-500" />
                    Adopt {pet.name}
                </button>
                <button className="px-8 py-4 border-2 border-gray-200 text-slate-700 font-bold rounded-xl hover:border-slate-900 transition">
                    Ask a Question
                </button>
            </div>

        </div>
      </div>

      {/* RENDER MODAL */}
      {showForm && pet && <AdoptionFormModal pet={pet} onClose={() => setShowForm(false)} />}
      
    </div>
  );
}

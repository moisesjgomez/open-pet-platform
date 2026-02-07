'use client';

import { useState } from 'react';
import { Pet } from '@/lib/adapters/base';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, MapPin, Share2, Heart, ShieldCheck, Sparkles, ChevronLeft, ChevronRight, Copy, Check, X } from 'lucide-react';
import AdoptionFormModal from '@/components/AdoptionFormModal';

export default function PetProfileClient({ pet }: { pet: Pet }) {
  const [showForm, setShowForm] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // AI MATCH SCORE LOGIC
  const matchScore = pet.tags.includes('Chill') ? 94 : pet.tags.includes('High Energy') ? 88 : 91;
  
  // Gallery - use images array if available, otherwise fall back to single imageUrl
  const allImages = pet.images && pet.images.length > 0 ? pet.images : [pet.imageUrl];
  const [activeImage, setActiveImage] = useState(allImages[0]);
  const [activeIndex, setActiveIndex] = useState(0);

  const goToImage = (index: number) => {
    setActiveIndex(index);
    setActiveImage(allImages[index]);
  };

  const handleShare = async () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    const shareText = `Meet ${pet.name}, a ${pet.breed} looking for a forever home! 🐾`;
    
    // Try native Web Share API first (works great on mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Adopt ${pet.name}`,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err) {
        // User cancelled or error - fall through to modal
      }
    }
    
    // Fallback to modal on desktop
    setShowShareModal(true);
  };

  const copyToClipboard = () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareToSocial = (platform: string) => {
    const shareUrl = encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '');
    const shareText = encodeURIComponent(`Meet ${pet.name}, a ${pet.breed} looking for a forever home! 🐾`);
    
    const urls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`,
      email: `mailto:?subject=Meet ${pet.name}!&body=${shareText}%0A%0A${shareUrl}`,
    };
    
    window.open(urls[platform], '_blank', 'width=600,height=400');
    setShowShareModal(false);
  };

  return (
    <div className="min-h-screen bg-white">
      
      {/* HERO IMAGE & GALLERY */}
      <div className="relative h-[50vh] md:h-[65vh] w-full bg-gray-900 group overflow-hidden">
        {/* Blurred background image */}
        <Image 
            src={activeImage} 
            alt="" 
            fill 
            className="object-cover blur-2xl scale-110 opacity-60" 
            priority 
        />
        {/* Main sharp image */}
        <Image 
            src={activeImage} 
            alt={pet.name} 
            fill 
            className="object-contain transition-opacity duration-500 z-10" 
            priority 
        />
        
        {/* Navigation Overlay */}
        <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start bg-gradient-to-b from-black/60 to-transparent z-20">
            <Link href="/" className="bg-white/10 backdrop-blur-md text-white p-3 rounded-full hover:bg-white hover:text-slate-900 transition border border-white/20">
                <ArrowLeft size={24} />
            </Link>
            <div className="flex gap-3">
                {/* Image counter */}
                {allImages.length > 1 && (
                  <div className="bg-black/50 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-bold">
                    {activeIndex + 1} / {allImages.length}
                  </div>
                )}
                <button 
                  onClick={handleShare}
                  className="bg-white/10 backdrop-blur-md text-white p-3 rounded-full hover:bg-white hover:text-slate-900 transition border border-white/20"
                >
                    <Share2 size={24} />
                </button>
            </div>
        </div>

        {/* Left/Right Arrow Navigation */}
        {allImages.length > 1 && (
          <>
            <button 
              onClick={() => goToImage(activeIndex === 0 ? allImages.length - 1 : activeIndex - 1)}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 backdrop-blur-sm text-white p-3 rounded-full hover:bg-black/60 transition z-20 opacity-0 group-hover:opacity-100"
            >
              <ChevronLeft size={28} />
            </button>
            <button 
              onClick={() => goToImage(activeIndex === allImages.length - 1 ? 0 : activeIndex + 1)}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/40 backdrop-blur-sm text-white p-3 rounded-full hover:bg-black/60 transition z-20 opacity-0 group-hover:opacity-100"
            >
              <ChevronRight size={28} />
            </button>
          </>
        )}

        {/* Gallery Thumbnails */}
        {allImages.length > 1 && (
            <div className="absolute bottom-6 left-0 w-full flex justify-center gap-2 px-4 z-20 overflow-x-auto py-2">
                {allImages.map((img, idx) => (
                    <button 
                        key={idx}
                        onClick={() => goToImage(idx)}
                        className={`relative w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${activeIndex === idx ? 'border-white scale-110 shadow-lg' : 'border-white/30 opacity-70 hover:opacity-100'}`}
                    >
                        <Image src={img} alt={`Photo ${idx + 1}`} fill className="object-cover" />
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

      {/* ADOPTION FORM MODAL */}
      {showForm && pet && <AdoptionFormModal pet={pet} onClose={() => setShowForm(false)} />}

      {/* SHARE MODAL */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowShareModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900">Share {pet.name}</h3>
              <button onClick={() => setShowShareModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition">
                <X size={20} />
              </button>
            </div>
            
            {/* Social Buttons */}
            <div className="flex gap-3 mb-6">
              <button 
                onClick={() => shareToSocial('twitter')}
                className="flex-1 py-3 bg-sky-500 text-white rounded-xl font-bold hover:bg-sky-600 transition"
              >
                𝕏 Twitter
              </button>
              <button 
                onClick={() => shareToSocial('facebook')}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition"
              >
                Facebook
              </button>
              <button 
                onClick={() => shareToSocial('email')}
                className="flex-1 py-3 bg-gray-600 text-white rounded-xl font-bold hover:bg-gray-700 transition"
              >
                Email
              </button>
            </div>
            
            {/* Copy Link */}
            <div className="flex gap-2">
              <input 
                type="text" 
                readOnly 
                value={typeof window !== 'undefined' ? window.location.href : ''} 
                className="flex-1 px-4 py-3 bg-gray-100 rounded-xl text-sm text-gray-600 truncate"
              />
              <button 
                onClick={copyToClipboard}
                className={`px-4 py-3 rounded-xl font-bold transition flex items-center gap-2 ${copied ? 'bg-green-500 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
              >
                {copied ? <><Check size={18} /> Copied!</> : <><Copy size={18} /> Copy</>}
              </button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}

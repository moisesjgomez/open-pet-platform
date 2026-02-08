'use client';

import { useState, useEffect } from 'react';
import { Pet } from '@/lib/adapters/base';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ArrowLeft, MapPin, Share2, Heart, ShieldCheck, Sparkles, 
  ChevronLeft, ChevronRight, Copy, Check, X, 
  Ruler, Palette, Scissors, Zap, Baby, Dog, Cat, HelpCircle,
  Syringe, CircleCheck, CircleX, Phone, Mail, Globe, Clock,
  FileText, MessageCircle
} from 'lucide-react';
import AdoptionFormModal from '@/components/AdoptionFormModal';
import { loadProfile, updatePreferences, saveProfile, removeFromShortlist } from '@/lib/ai/learning-engine';

// Helper component for compatibility icons
function CompatibilityIcon({ value, label, icon: Icon }: { value: boolean | null | undefined, label: string, icon: React.ElementType }) {
  const getStatus = () => {
    if (value === true) return { color: 'text-green-600 bg-green-50 border-green-200', icon: CircleCheck, text: 'Yes' };
    if (value === false) return { color: 'text-red-500 bg-red-50 border-red-200', icon: CircleX, text: 'No' };
    return { color: 'text-gray-400 bg-gray-50 border-gray-200', icon: HelpCircle, text: 'Unknown' };
  };
  
  const status = getStatus();
  const StatusIcon = status.icon;
  
  return (
    <div className={`flex flex-col items-center p-4 rounded-xl border ${status.color}`}>
      <Icon size={24} className="mb-2" />
      <span className="text-xs font-bold uppercase tracking-wide mb-1">{label}</span>
      <div className="flex items-center gap-1">
        <StatusIcon size={16} />
        <span className="text-sm font-bold">{status.text}</span>
      </div>
    </div>
  );
}

// Helper component for health status
function HealthItem({ value, label }: { value: boolean | undefined, label: string }) {
  return (
    <div className="flex items-center gap-3">
      {value ? (
        <CircleCheck size={20} className="text-green-500" />
      ) : (
        <CircleX size={20} className="text-gray-300" />
      )}
      <span className={`font-medium ${value ? 'text-slate-700' : 'text-gray-400'}`}>{label}</span>
    </div>
  );
}

export default function PetProfileClient({ pet }: { pet: Pet }) {
  const [showForm, setShowForm] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // SHORTLIST STATE
  const [isInShortlist, setIsInShortlist] = useState(false);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  
  // Check if pet is in shortlist on mount
  useEffect(() => {
    const profile = loadProfile();
    setIsInShortlist(profile.likedPetIds.includes(pet.id));
  }, [pet.id]);

  // Toggle shortlist with animation
  const toggleShortlist = () => {
    const profile = loadProfile();
    
    if (isInShortlist) {
      // Remove from shortlist
      const updatedProfile = removeFromShortlist(profile, pet.id);
      saveProfile(updatedProfile);
      setIsInShortlist(false);
    } else {
      // Add to shortlist with animation
      const updatedProfile = updatePreferences(profile, pet, 'like');
      saveProfile(updatedProfile);
      setIsInShortlist(true);
      setShowHeartAnimation(true);
      setTimeout(() => setShowHeartAnimation(false), 1000);
    }
  };

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
                
                {/* SHORTLIST HEART BUTTON */}
                <button 
                  onClick={toggleShortlist}
                  className={`relative p-3 rounded-full transition border overflow-hidden ${
                    isInShortlist 
                      ? 'bg-red-500 text-white border-red-500 scale-110' 
                      : 'bg-white/10 backdrop-blur-md text-white border-white/20 hover:bg-white hover:text-red-500'
                  }`}
                >
                  <Heart size={24} fill={isInShortlist ? 'currentColor' : 'none'} className={isInShortlist ? 'animate-pulse' : ''} />
                  
                  {/* Floating Hearts Animation */}
                  {showHeartAnimation && (
                    <div className="absolute inset-0 pointer-events-none overflow-visible">
                      {[...Array(6)].map((_, i) => (
                        <span
                          key={i}
                          className="absolute animate-float-heart text-red-400"
                          style={{
                            left: `${10 + Math.random() * 80}%`,
                            animationDelay: `${i * 0.1}s`,
                            fontSize: `${12 + Math.random() * 8}px`,
                          }}
                        >
                          ❤️
                        </span>
                      ))}
                    </div>
                  )}
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

            {/* PHYSICAL TRAITS SECTION */}
            <div className="mb-10">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Physical Traits</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {pet.size && (
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <Ruler className="text-blue-500" size={20} />
                    <div>
                      <div className="text-xs text-gray-500 font-medium">Size</div>
                      <div className="font-bold text-slate-900">{pet.size}</div>
                    </div>
                  </div>
                )}
                {pet.color && (
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <Palette className="text-purple-500" size={20} />
                    <div>
                      <div className="text-xs text-gray-500 font-medium">Color</div>
                      <div className="font-bold text-slate-900">{pet.color}</div>
                    </div>
                  </div>
                )}
                {pet.coatLength && (
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <Scissors className="text-amber-500" size={20} />
                    <div>
                      <div className="text-xs text-gray-500 font-medium">Coat</div>
                      <div className="font-bold text-slate-900">{pet.coatLength}</div>
                    </div>
                  </div>
                )}
                {pet.energyLevel && (
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <Zap className={`${pet.energyLevel === 'High' ? 'text-orange-500' : pet.energyLevel === 'Moderate' ? 'text-yellow-500' : 'text-green-500'}`} size={20} />
                    <div>
                      <div className="text-xs text-gray-500 font-medium">Energy</div>
                      <div className="font-bold text-slate-900">{pet.energyLevel}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* COMPATIBILITY SECTION */}
            {pet.compatibility && (
              <div className="mb-10">
                <h3 className="text-lg font-bold text-slate-900 mb-4">{pet.name}&apos;s Compatibility</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <CompatibilityIcon value={pet.compatibility.kids} label="Kids" icon={Baby} />
                  <CompatibilityIcon value={pet.compatibility.dogs} label="Dogs" icon={Dog} />
                  <CompatibilityIcon value={pet.compatibility.cats} label="Cats" icon={Cat} />
                  <CompatibilityIcon value={pet.compatibility.otherAnimals} label="Other Animals" icon={HelpCircle} />
                </div>
              </div>
            )}

            {/* HEALTH INFO SECTION */}
            {pet.health && (
              <div className="mb-10">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Health</h3>
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                  <div className="grid grid-cols-2 gap-4">
                    <HealthItem value={pet.health.spayedNeutered} label="Spayed/Neutered" />
                    <HealthItem value={pet.health.vaccinated} label="Vaccinated" />
                    <HealthItem value={pet.health.microchipped} label="Microchipped" />
                    <HealthItem value={pet.houseTrained} label="House Trained" />
                  </div>
                  {pet.health.specialNeeds && pet.health.specialNeedsDescription && (
                    <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                      <div className="flex items-center gap-2 text-amber-700 font-bold mb-2">
                        <Syringe size={18} />
                        Special Needs
                      </div>
                      <p className="text-amber-600 text-sm">{pet.health.specialNeedsDescription}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bio */}
            <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <ShieldCheck className="text-green-500" /> {pet.name}&apos;s Story
            </h3>
            
            <p className="text-lg text-slate-600 leading-relaxed mb-6 whitespace-pre-wrap">
                {pet.aiBio || pet.description}
            </p>

            {/* Shelter Notes - Original description from shelter staff */}
            {pet.shelterNotes && pet.shelterNotes !== pet.aiBio && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-10">
                <h4 className="text-md font-bold text-amber-800 mb-3 flex items-center gap-2">
                  <FileText size={18} className="text-amber-600" />
                  Shelter Notes
                </h4>
                <p className="text-amber-900/80 leading-relaxed whitespace-pre-wrap">
                  {pet.shelterNotes}
                </p>
              </div>
            )}

            {/* Spacer if no shelter notes */}
            {(!pet.shelterNotes || pet.shelterNotes === pet.aiBio) && (
              <div className="mb-4" />
            )}

            {/* SHELTER/ORGANIZATION SECTION */}
            {pet.organization ? (
              <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl p-6 border border-gray-200 mb-10">
                <h3 className="text-lg font-bold text-slate-900 mb-4">{pet.name} is from {pet.organization.name}</h3>
                
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  {pet.organization.address && (
                    <div className="flex items-start gap-3">
                      <MapPin className="text-gray-400 mt-1" size={18} />
                      <div>
                        <div className="text-sm text-gray-500">Address</div>
                        <div className="font-medium text-slate-900">{pet.organization.address}</div>
                      </div>
                    </div>
                  )}
                  {pet.organization.phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="text-gray-400 mt-1" size={18} />
                      <div>
                        <div className="text-sm text-gray-500">Phone</div>
                        <a href={`tel:${pet.organization.phone}`} className="font-medium text-blue-600 hover:underline">{pet.organization.phone}</a>
                      </div>
                    </div>
                  )}
                  {pet.organization.email && (
                    <div className="flex items-start gap-3">
                      <Mail className="text-gray-400 mt-1" size={18} />
                      <div>
                        <div className="text-sm text-gray-500">Email</div>
                        <a href={`mailto:${pet.organization.email}`} className="font-medium text-blue-600 hover:underline">{pet.organization.email}</a>
                      </div>
                    </div>
                  )}
                  {pet.organization.hours && (
                    <div className="flex items-start gap-3">
                      <Clock className="text-gray-400 mt-1" size={18} />
                      <div>
                        <div className="text-sm text-gray-500">Hours</div>
                        <div className="font-medium text-slate-900">{pet.organization.hours}</div>
                      </div>
                    </div>
                  )}
                </div>

                {pet.organization.adoptionPolicy && (
                  <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center gap-2 text-slate-700 font-bold mb-2">
                      <FileText size={18} />
                      Adoption Policy
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed">{pet.organization.adoptionPolicy}</p>
                  </div>
                )}

                {pet.organization.website && (
                  <a 
                    href={pet.organization.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-4 text-blue-600 font-bold hover:underline"
                  >
                    <Globe size={18} />
                    Visit Website
                  </a>
                )}
              </div>
            ) : (
              /* Fallback location display */
              <div className="bg-gray-50 rounded-2xl p-6 flex items-start gap-4 border border-gray-200 mb-10">
                <MapPin className="text-gray-400 mt-1" />
                <div>
                    <h4 className="font-bold text-slate-900">{pet.location}</h4>
                    <p className="text-gray-500 text-sm">Adoption Center</p>
                </div>
              </div>
            )}

            {/* HOW TO ADOPT SECTION */}
            <div className="mb-10">
              <h3 className="text-lg font-bold text-slate-900 mb-4">How to Adopt {pet.name}</h3>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">1</div>
                  <div>
                    <h4 className="font-bold text-slate-900">Start Your Inquiry</h4>
                    <p className="text-gray-600 text-sm">Click the Adopt button below to share some preliminary details with the shelter.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">2</div>
                  <div>
                    <h4 className="font-bold text-slate-900">Application Review</h4>
                    <p className="text-gray-600 text-sm">The shelter will review your information and may ask for additional details or an official application.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">3</div>
                  <div>
                    <h4 className="font-bold text-slate-900">Meet & Greet</h4>
                    <p className="text-gray-600 text-sm">If you&apos;re a match, the shelter will reach out to schedule a meeting with {pet.name}!</p>
                  </div>
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
                <button className="px-8 py-4 border-2 border-gray-200 text-slate-700 font-bold rounded-xl hover:border-slate-900 transition flex items-center justify-center gap-2">
                    <MessageCircle size={20} />
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

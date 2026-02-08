'use client';

import { motion, PanInfo } from 'framer-motion';
import { Pet } from '@/lib/adapters/base';
import { 
  ChevronUp, 
  Sparkles, 
  Calendar, 
  Ruler, 
  Zap, 
  MapPin, 
  Baby, 
  Dog, 
  Cat, 
  Home,
  Syringe, 
  ShieldCheck, 
  Cpu, 
  Building,
  ExternalLink,
  X
} from 'lucide-react';
import Link from 'next/link';
import { useCallback } from 'react';

interface Props {
  pet: Pet;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export default function MobileDetailSheet({ pet, isOpen, onToggle, onClose }: Props) {
  
  const handleDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const shouldClose = info.velocity.y > 200 || (info.velocity.y >= 0 && info.offset.y > 100);
    if (shouldClose) {
      onClose();
    }
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Peek Bar (Always visible on mobile when sheet is closed) */}
      {!isOpen && (
        <div 
          className="absolute bottom-0 left-0 right-0 md:hidden z-30"
          onClick={onToggle}
        >
          <motion.div
            className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-t-2xl px-4 py-3 cursor-pointer shadow-lg"
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center justify-center gap-2 text-white">
              <Sparkles size={16} />
              <span className="font-bold text-sm">Great Match!</span>
              <ChevronUp size={18} className="ml-1" />
            </div>
            <p className="text-center text-white/80 text-xs mt-0.5">Tap for details</p>
          </motion.div>
        </div>
      )}

      {/* Full Sheet (Opens on tap/swipe) */}
      {isOpen && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-50 md:hidden max-h-[85vh] overflow-hidden flex flex-col"
        >
          {/* Drag Handle */}
          <div className="flex-shrink-0 pt-3 pb-2 cursor-grab active:cursor-grabbing">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto" />
          </div>
          
          {/* Header with Match Score */}
          <div className="flex-shrink-0 px-5 pb-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-full shadow-md">
                  <Sparkles size={16} />
                  <span className="font-bold text-sm">Great Match!</span>
                </div>
                {pet.daysInShelter && pet.daysInShelter > 30 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full border border-amber-200 text-xs font-semibold">
                    <Calendar size={12} />
                    {pet.daysInShelter}d waiting
                  </div>
                )}
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 transition"
              >
                <X size={20} />
              </button>
            </div>
          </div>
          
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {/* Pet Name & Breed */}
            <div className="mb-4">
              <h2 className="text-2xl font-black text-slate-800">{pet.name}</h2>
              <p className="text-slate-500 font-medium">{pet.breed}</p>
            </div>
            
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-4 gap-2 mb-5">
              <div className="text-center p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <Calendar size={16} className="mx-auto text-indigo-400 mb-1" />
                <div className="text-xs font-bold text-slate-700">{pet.age}</div>
              </div>
              <div className="text-center p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <Ruler size={16} className="mx-auto text-indigo-400 mb-1" />
                <div className="text-xs font-bold text-slate-700">{pet.size}</div>
              </div>
              <div className="text-center p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <Zap size={16} className={`mx-auto mb-1 ${pet.energyLevel === 'High' ? 'text-orange-400' : pet.energyLevel === 'Low' ? 'text-indigo-400' : 'text-yellow-400'}`} />
                <div className="text-xs font-bold text-slate-700">{pet.energyLevel}</div>
              </div>
              <div className="text-center p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <MapPin size={16} className="mx-auto text-indigo-400 mb-1" />
                <div className="text-xs font-bold text-slate-700 truncate">{pet.distance ? `${pet.distance}mi` : 'Local'}</div>
              </div>
            </div>
            
            {/* Compatibility Badges */}
            <div className="flex flex-wrap gap-2 mb-5">
              {pet.compatibility?.kids && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium border border-indigo-100">
                  <Baby size={14} /> Kids OK
                </span>
              )}
              {pet.compatibility?.dogs && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium border border-indigo-100">
                  <Dog size={14} /> Dogs OK
                </span>
              )}
              {pet.compatibility?.cats && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium border border-indigo-100">
                  <Cat size={14} /> Cats OK
                </span>
              )}
              {pet.houseTrained && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium border border-indigo-100">
                  <Home size={14} /> House Trained
                </span>
              )}
            </div>
            
            {/* About Section */}
            <div className="mb-5 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wide mb-2">About Me</h3>
              <p className="text-slate-700 leading-relaxed text-sm">
                {pet.aiSummary || pet.description || 'This adorable pet is looking for their forever home!'}
              </p>
            </div>
            
            {/* Health Quick Glance */}
            {pet.health && (pet.health.vaccinated || pet.health.spayedNeutered || pet.health.microchipped) && (
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100 mb-5">
                <span className="text-xs font-bold text-indigo-400 uppercase">Health</span>
                <div className="flex flex-wrap gap-3">
                  {pet.health.vaccinated && (
                    <div className="flex items-center gap-1 text-emerald-600" title="Vaccinated">
                      <Syringe size={14} />
                      <span className="text-xs font-medium">Vaxxed</span>
                    </div>
                  )}
                  {pet.health.spayedNeutered && (
                    <div className="flex items-center gap-1 text-emerald-600" title="Spayed/Neutered">
                      <ShieldCheck size={14} />
                      <span className="text-xs font-medium">Fixed</span>
                    </div>
                  )}
                  {pet.health.microchipped && (
                    <div className="flex items-center gap-1 text-emerald-600" title="Microchipped">
                      <Cpu size={14} />
                      <span className="text-xs font-medium">Chipped</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Personality Tags */}
            {[...(pet.aiTags || []), ...pet.tags].filter((t, i, arr) => arr.indexOf(t) === i).filter(t => !['Dog', 'Cat', 'High Energy', 'Low Energy', 'Chill', 'Senior', 'Small', 'Large', 'Medium', 'Good with Kids'].includes(t)).length > 0 && (
              <div className="mb-5">
                <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wide mb-2">Personality</h3>
                <div className="flex flex-wrap gap-2">
                  {[...(pet.aiTags || []), ...pet.tags]
                    .filter((t, i, arr) => arr.indexOf(t) === i)
                    .filter(t => !['Dog', 'Cat', 'High Energy', 'Low Energy', 'Chill', 'Senior', 'Small', 'Large', 'Medium', 'Good with Kids'].includes(t))
                    .slice(0, 6)
                    .map(tag => (
                      <span key={tag} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm font-medium">
                        {tag}
                      </span>
                    ))
                  }
                </div>
              </div>
            )}
            
            {/* Shelter Info */}
            {(pet.organization || pet.location) && (
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-5">
                <Building size={14} className="text-slate-400" />
                {pet.organization ? (
                  <span>From <strong className="text-slate-700">{pet.organization.name}</strong></span>
                ) : pet.location && (
                  <span>{pet.location}</span>
                )}
              </div>
            )}
          </div>
          
          {/* Fixed Footer with CTA */}
          <div className="flex-shrink-0 p-4 border-t border-slate-100 bg-white">
            <Link 
              href={`/pet/${pet.id}`}
              className="flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-indigo-600 text-white rounded-full font-bold hover:bg-indigo-700 transition shadow-lg"
            >
              View Full Profile <ExternalLink size={18} />
            </Link>
          </div>
        </motion.div>
      )}
    </>
  );
}

'use client'; // This tells Next.js this code runs in the browser (needed for animations)

import { motion, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Pet } from '@/lib/adapters/base';
import { X, Heart, Zap, Ruler, Users, PawPrint, Sparkles, Info, Dog, Cat, Baby, Clock } from 'lucide-react';
import { useRef, forwardRef, useImperativeHandle } from 'react';

interface Props {
  pet: Pet;
  onSwipe: (direction: 'left' | 'right') => void;
}

// Expose triggerSwipe method for keyboard navigation
export interface SwipeCardHandle {
  triggerSwipe: (direction: 'left' | 'right') => Promise<void>;
}

// Helper to parse age string to number
const parseAge = (ageString: string): number => {
  const match = ageString.match(/(\d+)/);
  if (!match) return 2;
  const num = parseInt(match[1]);
  if (ageString.toLowerCase().includes('month')) return num / 12;
  return num;
};

// Get age category based on parsed age
const getAgeCategory = (ageString: string, species?: string): { label: string; color: string; icon: 'baby' | 'clock' | 'senior' } => {
  const age = parseAge(ageString);
  const isCatOrDog = species === 'Dog' || species === 'Cat';
  
  if (age < 1) {
    return { 
      label: isCatOrDog ? (species === 'Dog' ? 'Puppy' : 'Kitten') : 'Baby', 
      color: 'bg-pink-100 text-pink-600', 
      icon: 'baby' 
    };
  } else if (age >= 7) {
    return { label: 'Senior', color: 'bg-amber-100 text-amber-600', icon: 'senior' };
  }
  return { label: 'Adult', color: 'bg-blue-100 text-blue-600', icon: 'clock' };
};

// Get species icon component
const getSpeciesIcon = (species?: string) => {
  if (species === 'Dog') return Dog;
  if (species === 'Cat') return Cat;
  return PawPrint;
};

const SwipeCard = forwardRef<SwipeCardHandle, Props>(({ pet, onSwipe }, ref) => {
  const router = useRouter();
  const controls = useAnimation();
  const x = useMotionValue(0); // Tracks how far left/right you dragged
  const dragStartX = useRef(0); // Track where drag started to detect clicks vs drags
  
  // PHYSICS:
  // 1. Rotation: As you drag X (left/right), rotate the card slightly (-25deg to 25deg)
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  
  // 2. Stamps: Show "NOPE" or "LIKE" opacity based on drag distance
  const opacityLike = useTransform(x, [50, 150], [0, 1]);
  const opacityNope = useTransform(x, [-50, -150], [0, 1]);

  // Expose triggerSwipe for keyboard navigation with snappy 200ms animation
  useImperativeHandle(ref, () => ({
    triggerSwipe: async (direction: 'left' | 'right') => {
      const targetX = direction === 'right' ? 500 : -500;
      await controls.start(
        { x: targetX, opacity: 0, rotate: direction === 'right' ? 25 : -25 },
        { duration: 0.2, ease: 'easeOut' }
      );
      onSwipe(direction);
    }
  }));

  const handleDragStart = () => {
    dragStartX.current = x.get();
  };

  const handleCardClick = () => {
    // Only navigate if the card wasn't dragged (click vs drag detection)
    const dragDistance = Math.abs(x.get() - dragStartX.current);
    if (dragDistance < 10) {
      router.push(`/pet/${pet.id}`);
    }
  };

  const handleDragEnd = async (event: any, info: any) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    // If dragged far enough (>100px) OR flicked fast enough (>500 speed)
    if (offset > 100 || velocity > 500) {
      await controls.start({ x: 500, opacity: 0 }); // Fly off screen Right
      onSwipe('right');
    } else if (offset < -100 || velocity < -500) {
      await controls.start({ x: -500, opacity: 0 }); // Fly off screen Left
      onSwipe('left');
    } else {
      controls.start({ x: 0 }); // Snap back to center if you didn't swipe hard enough
    }
  };

  return (
    <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center pt-14 md:pt-16 pb-2 md:pb-4 px-3">
      <motion.div
        drag="x" // Enable dragging ONLY on X axis
        dragConstraints={{ left: 0, right: 0 }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={handleCardClick}
        animate={controls}
        style={{ x, rotate }}
        className="relative w-full max-w-[380px] md:max-w-[420px] lg:max-w-[440px] flex-1 max-h-[75vh] md:max-h-[70vh] bg-white rounded-3xl shadow-2xl cursor-grab active:cursor-grabbing overflow-hidden border border-gray-200 touch-manipulation flex flex-col"
      >
        {/* The Pet Photo - use images array if available, fallback to imageUrl */}
        <div className="relative flex-1 min-h-0 w-full bg-gray-100">
           {/* We use a standard img tag here because 'fill' acts weird in draggables sometimes */}
           <img 
             src={pet.images?.[0] ?? pet.imageUrl} 
             alt={pet.name} 
             className="w-full h-full object-cover pointer-events-none" // pointer-events-none prevents dragging the image itself
           />
           
           {/* Image count indicator */}
           {pet.images && pet.images.length > 1 && (
             <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
               📷 {pet.images.length} photos
             </div>
           )}
           
           {/* Info button - tap to see profile */}
           <button
             onClick={(e) => {
               e.stopPropagation();
               router.push(`/pet/${pet.id}`);
             }}
             className="absolute bottom-4 right-4 p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:scale-110 transition text-gray-700"
             title="View full profile"
           >
             <Info size={24} />
           </button>
           
           {/* The "Like" Stamp (Hidden until dragged right) */}
           <motion.div style={{ opacity: opacityLike }} className="absolute top-8 left-8 border-4 border-green-500 text-green-500 font-bold text-4xl px-4 py-2 rounded-lg transform -rotate-12 bg-white/80">
             YES
           </motion.div>

           {/* The "Nope" Stamp (Hidden until dragged left) */}
           <motion.div style={{ opacity: opacityNope }} className="absolute top-8 right-8 border-4 border-red-500 text-red-500 font-bold text-4xl px-4 py-2 rounded-lg transform rotate-12 bg-white/80">
             NOPE
           </motion.div>
        </div>

        {/* The Text Info - compact but showing all content */}
        <div className="flex-shrink-0 p-4 md:p-5 bg-white flex flex-col justify-start gap-2">
          <div className="flex justify-between items-end">
             <div>
                <h2 className="text-2xl md:text-3xl font-black text-gray-800">{pet.name}</h2>
                <p className="text-gray-500 font-medium text-base">{pet.breed}</p>
             </div>
             <div className="text-xl md:text-2xl font-bold text-gray-300">{pet.age}</div>
          </div>
          
          {/* AI Summary - short 1-liner when available */}
          {pet.aiSummary && (
            <p className="text-sm text-indigo-600 font-medium italic line-clamp-2">
              &ldquo;{pet.aiSummary}&rdquo;
            </p>
          )}

          {/* NEW: Rich Data Badges */}
          <div className="flex flex-wrap gap-1.5">
            {/* Species Badge */}
            {pet.species && (() => {
              const SpeciesIcon = getSpeciesIcon(pet.species);
              return (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-xs font-bold">
                  <SpeciesIcon size={12} /> {pet.species}
                </div>
              );
            })()}

            {/* Age Category Badge */}
            {(() => {
              const ageCategory = getAgeCategory(pet.age, pet.species);
              return (
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold ${ageCategory.color}`}>
                  {ageCategory.icon === 'baby' ? <Baby size={12} /> : <Clock size={12} />} {ageCategory.label}
                </div>
              );
            })()}

            {/* Energy Badge */}
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold ${
              pet.energyLevel === 'High' ? 'bg-orange-100 text-orange-600' :
              pet.energyLevel === 'Low' ? 'bg-blue-100 text-blue-600' :
              'bg-yellow-100 text-yellow-600'
            }`}>
              <Zap size={12} /> {pet.energyLevel}
            </div>

            {/* Size Badge */}
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-xs font-bold">
              <Ruler size={12} /> {pet.size}
            </div>

            {/* Compatibility Icons */}
            {pet.compatibility?.kids && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-50 text-green-600 text-xs font-bold" title="Good with Kids">
                <Users size={12} /> Kids
              </div>
            )}
            
            {/* AI Generated Tags (Show up to 2 extra fun ones for space) */}
            {[...(pet.aiTags || []), ...pet.tags]
                .filter((t, i, arr) => arr.indexOf(t) === i) // Deduplicate
                .filter(t => !['Dog', 'Cat', 'High Energy', 'Low Energy', 'Chill', 'Senior', 'Small', 'Large', 'Good with Kids'].includes(t))
                .slice(0, 2)
                .map(tag => (
                    <div key={tag} className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-600 text-xs font-bold border border-purple-100">
                        <Sparkles size={10} /> {tag}
                    </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Manual Buttons (Below the card) */}
      <div className="flex-shrink-0 flex gap-5 md:gap-6 mt-3 md:mt-4 mb-1"> 
         <button 
           onClick={() => { controls.start({ x: -500 }); onSwipe('left'); }} 
           className="p-5 md:p-4 bg-white shadow-xl rounded-full text-red-500 hover:scale-110 active:scale-95 transition touch-manipulation"
         >
            <X size={36} className="md:hidden" />
            <X size={32} className="hidden md:block" />
         </button>
         <button 
           onClick={() => { controls.start({ x: 500 }); onSwipe('right'); }} 
           className="p-5 md:p-4 bg-white shadow-xl rounded-full text-green-500 hover:scale-110 active:scale-95 transition touch-manipulation"
         >
            <Heart size={36} fill="currentColor" className="md:hidden" />
            <Heart size={32} fill="currentColor" className="hidden md:block" />
         </button>
      </div>
    </div>
  );
});

SwipeCard.displayName = 'SwipeCard';

export default SwipeCard;
'use client';

import { useState, useEffect, useRef } from 'react';
import { Pet } from '@/lib/adapters/base';
import { PetRepository } from '@/lib/repository'; // Use Real Repo
import SwipeCard, { SwipeCardHandle } from '@/components/SwipeCard';
import SwipeFilterPanel from '@/components/SwipeFilterPanel';
import { UserPreferences } from '@/components/MatchProfileModal';
import { Heart, Filter, Home, ExternalLink, Keyboard } from 'lucide-react';
import Link from 'next/link';
import { loadProfile, updatePreferences, saveProfile, UserAIProfile } from '@/lib/ai/learning-engine';

// Helper to parse age from string (e.g., "3 years" -> 3)
const parseAge = (ageString: string): number => {
  const match = ageString.match(/(\d+)/);
  if (!match) return 2; // Default to adult
  const num = parseInt(match[1]);
  if (ageString.toLowerCase().includes('month')) return num / 12;
  return num;
};

// Helper to check if pet matches user filters
const matchesFilters = (pet: Pet, filters: UserPreferences): boolean => {
  // Species - only filter if user has selected a specific species (not 'Any')
  if (filters.species !== 'Any') {
    const isDog = pet.tags.includes('Dog');
    const isCat = pet.tags.includes('Cat');
    const petSpecies = isDog ? 'Dog' : isCat ? 'Cat' : 'Other';
    
    if (petSpecies !== filters.species) return false;
  }

  // Size - only filter if pet HAS a size and it doesn't match
  if (filters.size !== 'Any' && pet.size && pet.size !== filters.size) return false;

  // Energy - only filter if pet HAS an energy level and it doesn't match
  if (filters.energy !== 'Any' && pet.energyLevel && pet.energyLevel !== filters.energy) return false;

  // Compatibility
  if (filters.goodWithKids && !pet.compatibility?.kids) return false;
  if (filters.goodWithDogs && !pet.compatibility?.dogs) return false;
  if (filters.goodWithCats && !pet.compatibility?.cats) return false;

  return true;
};

export default function SwipePage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [aiProfile, setAiProfile] = useState<UserAIProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [filters, setFilters] = useState<UserPreferences>({
    species: 'Any',
    size: 'Any',
    energy: 'Any',
    goodWithKids: false,
    goodWithDogs: false,
    goodWithCats: false,
  });
  const [allPets, setAllPets] = useState<Pet[]>([]);
  const swipeCardRef = useRef<SwipeCardHandle>(null);

  // Load filters from localStorage
  useEffect(() => {
    const savedPrefs = localStorage.getItem('userPreferences');
    if (savedPrefs) {
      try {
        const prefs = JSON.parse(savedPrefs);
        setFilters(prefs);
      } catch (e) {
        console.error('Failed to load user preferences', e);
      }
    }
  }, []);

  // 1. Load AI Profile and Pets on startup
  useEffect(() => {
    const loadPets = async () => {
      // Use PetRepository for enriched pets with AI-generated first-person bios
      const { PetRepository } = await import('@/lib/repository');
      const repo = new PetRepository();
      const fetchedPets = await repo.getSmartPets();
      setAllPets(fetchedPets);
      
      // Load AI Profile
      const profile = loadProfile();
      setAiProfile(profile);
      
      // Apply filters, then filter out already-swiped pets
      const filteredPets = fetchedPets.filter(pet => matchesFilters(pet, filters));
      const unseenPets = filteredPets.filter(pet => 
        !profile.likedPetIds.includes(pet.id) && 
        !profile.dislikedPetIds.includes(pet.id)
      );
      
      setPets(unseenPets);
      setLoading(false);
    };
    loadPets();
  }, []);

  // 2. AI-POWERED SWIPE HANDLER
  const handleSwipe = (direction: 'left' | 'right') => {
    const currentPet = pets[0];
    
    if (aiProfile) {
      // Update AI Profile based on swipe
      const action = direction === 'right' ? 'like' : 'nope';
      const updatedProfile = updatePreferences(aiProfile, currentPet, action);
      
      // Save to localStorage
      saveProfile(updatedProfile);
      setAiProfile(updatedProfile);
    }

    // Remove the card from the screen
    setTimeout(() => {
      setPets((prev) => prev.slice(1));
    }, 200);
  };

  // 2b. KEYBOARD NAVIGATION - triggers visual swipe animation
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (pets.length === 0 || loading) return;
      if (e.key === 'ArrowLeft') {
        // Trigger the visual animation, which will call onSwipe when complete
        await swipeCardRef.current?.triggerSwipe('left');
      }
      if (e.key === 'ArrowRight') {
        await swipeCardRef.current?.triggerSwipe('right');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pets, loading]);

  // 3. Apply Filters Handler
  const handleApplyFilters = () => {
    // Save filters to localStorage
    localStorage.setItem('userPreferences', JSON.stringify(filters));
    
    // Reapply filters
    const filteredPets = allPets.filter(pet => matchesFilters(pet, filters));
    const unseenPets = filteredPets.filter(pet => 
      aiProfile && (
        !aiProfile.likedPetIds.includes(pet.id) && 
        !aiProfile.dislikedPetIds.includes(pet.id)
      )
    );
    
    setPets(unseenPets);
    setFilterPanelOpen(false);
  };

  // 4. Clear Filters Handler
  const handleClearFilters = () => {
    const defaultFilters: UserPreferences = {
      species: 'Any',
      size: 'Any',
      energy: 'Any',
      goodWithKids: false,
      goodWithDogs: false,
      goodWithCats: false,
    };
    setFilters(defaultFilters);
    localStorage.setItem('userPreferences', JSON.stringify(defaultFilters));
    
    // Reload all pets
    const unseenPets = allPets.filter(pet => 
      aiProfile && (
        !aiProfile.likedPetIds.includes(pet.id) && 
        !aiProfile.dislikedPetIds.includes(pet.id)
      )
    );
    setPets(unseenPets);
  };

  // Loading State
  if (loading) {
    return <div className="flex h-screen items-center justify-center text-slate-500 font-bold animate-pulse">Finding your perfect match...</div>;
  }

  // Check if filters are active
  const hasActiveFilters = filters.species !== 'Any' || filters.size !== 'Any' || filters.energy !== 'Any' || 
                          filters.goodWithKids || filters.goodWithDogs || filters.goodWithCats;

  // Empty State (No more pets or no matches)
  if (pets.length === 0 && !loading) {
    return (
        <div className="flex flex-col h-screen items-center justify-center bg-gradient-to-b from-pink-50 to-purple-50 text-center p-4">
            <div className="mb-6 text-8xl">{hasActiveFilters ? '🐾' : '🎉'}</div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              {hasActiveFilters ? "No pets match your paw-ferences!" : "You've seen them all!"}
            </h1>
            <p className="text-gray-600 mt-2 mb-8 max-w-md">
              {hasActiveFilters 
                ? "These filters might be a bit too picky. Try widening your search or clear filters to see all available pets!"
                : "Great job! You've swiped through all available pets. Try widening your filters to see more matches, or check your shortlist!"}
            </p>
            
            <div className="flex flex-col gap-4 w-full max-w-xs">
                {hasActiveFilters && (
                  <button 
                    onClick={handleClearFilters}
                    className="px-6 py-3 bg-slate-900 text-white rounded-full font-bold shadow-lg hover:bg-slate-800 transition"
                  >
                    Clear Filters
                  </button>
                )}
                <button 
                  onClick={() => setFilterPanelOpen(true)}
                  className="px-6 py-3 bg-purple-600 text-white rounded-full font-bold shadow-lg hover:bg-purple-700 transition flex items-center justify-center gap-2"
                >
                  <Filter size={20} />
                  {hasActiveFilters ? 'Adjust Filters' : 'Add Filters'}
                </button>
                <Link href="/" className="px-6 py-3 bg-white text-slate-900 border border-gray-200 rounded-full font-bold shadow-sm hover:bg-gray-50 transition">
                    Browse All Pets
                </Link>
                <Link href="/shortlist" className="px-6 py-3 bg-white text-slate-900 border border-gray-200 rounded-full font-bold shadow-sm hover:bg-gray-50 transition flex items-center justify-center gap-2">
                    <Heart size={20} />
                    View Shortlist
                </Link>
            </div>
        </div>
    );
  }

  return (
    <div className="h-screen w-full bg-slate-100 overflow-hidden relative">
      {/* Filter Panel */}
      <SwipeFilterPanel 
        isOpen={filterPanelOpen}
        onClose={() => setFilterPanelOpen(false)}
        filters={filters}
        onFiltersChange={setFilters}
        onApply={handleApplyFilters}
      />

      {/* Header */}
      <div className="absolute top-4 left-0 w-full flex justify-between items-center px-6 z-40">
         <Link href="/" className="p-2 bg-white/50 backdrop-blur rounded-full hover:bg-white transition">
            <Home size={20} className="text-slate-600" />
         </Link>
         <h1 className="text-xl font-bold text-slate-400 uppercase tracking-widest">Discover</h1>
         <button 
           onClick={() => setFilterPanelOpen(!filterPanelOpen)}
           className="p-2 bg-white/50 backdrop-blur rounded-full hover:bg-white transition relative"
         >
            <Filter size={20} className="text-slate-600" />
            {/* Badge indicator if filters are active */}
            {(filters.species !== 'Any' || filters.size !== 'Any' || filters.energy !== 'Any' || 
              filters.goodWithKids || filters.goodWithDogs || filters.goodWithCats) && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 rounded-full border-2 border-white" />
            )}
         </button>
      </div>

      {/* Desktop Split Layout Container */}
      <div className="h-full w-full flex flex-col md:flex-row">
        {/* Swipe Card Section - Full on mobile, 45% on desktop */}
        <div className="relative flex-1 md:flex-none md:w-[45%] h-full">
          <SwipeCard 
             ref={swipeCardRef}
             key={pets[0].id} 
             pet={pets[0]} 
             onSwipe={handleSwipe} 
          />
        </div>

        {/* Desktop Detail Panel - Hidden on mobile, 55% on desktop */}
        <div className="hidden md:flex md:w-[55%] h-full flex-col bg-white border-l border-gray-200 pt-20 overflow-y-auto">
          {/* Pet Photo */}
          <div className="w-full h-64 bg-gray-100 overflow-hidden">
            <img 
              src={pets[0].images?.[0] ?? pets[0].imageUrl} 
              alt={pets[0].name}
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* Pet Details */}
          <div className="flex-1 p-8 overflow-y-auto">
            <div className="flex items-baseline justify-between mb-2">
              <h2 className="text-4xl font-black text-gray-800">{pets[0].name}</h2>
              <span className="text-xl text-gray-400 font-medium">{pets[0].age}</span>
            </div>
            <p className="text-lg text-gray-500 font-medium mb-4">{pets[0].breed}</p>
            
            {/* Description */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-2">About Me</h3>
              <p className="text-gray-700 leading-relaxed">
                {pets[0].aiSummary || pets[0].description || 'This adorable pet is looking for their forever home!'}
              </p>
            </div>
            
            {/* Traits */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">Traits</h3>
              <div className="flex flex-wrap gap-2">
                {pets[0].species && (
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                    {pets[0].species}
                  </span>
                )}
                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                  {pets[0].size}
                </span>
                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                  {pets[0].energyLevel} Energy
                </span>
                {pets[0].compatibility?.kids && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    Good with Kids
                  </span>
                )}
                {pets[0].compatibility?.dogs && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    Good with Dogs
                  </span>
                )}
                {pets[0].compatibility?.cats && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    Good with Cats
                  </span>
                )}
                {[...(pets[0].aiTags || []), ...pets[0].tags]
                  .filter((t, i, arr) => arr.indexOf(t) === i)
                  .filter(t => !['Dog', 'Cat', 'High Energy', 'Low Energy', 'Chill', 'Senior', 'Small', 'Large', 'Medium', 'Good with Kids'].includes(t))
                  .slice(0, 5)
                  .map(tag => (
                    <span key={tag} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                      {tag}
                    </span>
                  ))
                }
              </div>
            </div>
            
            {/* View Full Profile Button */}
            <Link 
              href={`/pet/${pets[0].id}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-full font-bold hover:bg-indigo-700 transition shadow-lg"
            >
              View Full Profile <ExternalLink size={18} />
            </Link>
          </div>
        </div>
      </div>

      {/* Keyboard Hint - Desktop only */}
      <div className="hidden md:flex absolute bottom-6 left-1/2 -translate-x-1/2 items-center gap-3 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-md text-sm text-gray-500 z-30">
        <Keyboard size={16} />
        <span><kbd className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono">←</kbd> Nope</span>
        <span className="text-gray-300">|</span>
        <span>Like <kbd className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono">→</kbd></span>
      </div>
    </div>
  );
}
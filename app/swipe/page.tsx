'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Pet } from '@/lib/adapters/base';
import { PetRepository } from '@/lib/repository'; // Use Real Repo
import SwipeCard, { SwipeCardHandle } from '@/components/SwipeCard';
import SwipeFilterPanel from '@/components/SwipeFilterPanel';
import { UserPreferences } from '@/components/MatchProfileModal';
import { Heart, Filter, Home, ExternalLink, Keyboard, Undo2, ChevronLeft, ChevronRight, Sparkles, Calendar, Ruler, Zap, MapPin, Baby, Dog, Cat, Syringe, ShieldCheck, Cpu, Building } from 'lucide-react';
import Link from 'next/link';
import { loadProfile, updatePreferences, saveProfile, undoSwipe, UserAIProfile } from '@/lib/ai/learning-engine';
import OnboardingWizard, { OnboardingData } from '@/components/OnboardingWizard';
import MobileDetailSheet from '@/components/MobileDetailSheet';

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
  
  // UX Enhancement State
  const [showToast, setShowToast] = useState(false);
  const [lastSwipedPet, setLastSwipedPet] = useState<Pet | null>(null);
  const [lastSwipeWasLike, setLastSwipeWasLike] = useState(false);
  const [showUndoButton, setShowUndoButton] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showOnboardingPrompt, setShowOnboardingPrompt] = useState(false);
  const [showOnboardingWizard, setShowOnboardingWizard] = useState(false);
  const [showMobileSheet, setShowMobileSheet] = useState(false);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const swipeCountRef = useRef(0);
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
      
      // Check if first-time user for tutorial
      const hasSeenTutorial = localStorage.getItem('hasSeenSwipeTutorial');
      if (!hasSeenTutorial && unseenPets.length > 0) {
        setShowTutorial(true);
      }
    };
    loadPets();
  }, []);

  // Dismiss tutorial on first interaction
  const dismissTutorial = useCallback(() => {
    setShowTutorial(false);
    localStorage.setItem('hasSeenSwipeTutorial', 'true');
  }, []);

  // 2. AI-POWERED SWIPE HANDLER
  const handleSwipe = (direction: 'left' | 'right') => {
    const currentPet = pets[0];
    const isLike = direction === 'right';
    
    // Dismiss tutorial on first swipe
    if (showTutorial) {
      dismissTutorial();
    }
    
    if (aiProfile) {
      // Update AI Profile based on swipe
      const action = isLike ? 'like' : 'nope';
      const updatedProfile = updatePreferences(aiProfile, currentPet, action);
      
      // Save to localStorage
      saveProfile(updatedProfile);
      setAiProfile(updatedProfile);
      
      // Store for undo
      setLastSwipedPet(currentPet);
      setLastSwipeWasLike(isLike);
      
      // Show toast for likes
      if (isLike) {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
      }
      
      // Show undo button
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
      setShowUndoButton(true);
      undoTimeoutRef.current = setTimeout(() => {
        setShowUndoButton(false);
        setLastSwipedPet(null);
      }, 5000);
      
      // Track swipe count for onboarding prompt
      swipeCountRef.current += 1;
      const hasCompletedOnboarding = localStorage.getItem('hasCompletedOnboarding');
      const hasDismissedOnboardingPrompt = localStorage.getItem('hasDismissedOnboardingPrompt');
      
      // Show onboarding prompt after 4 swipes if not completed
      if (swipeCountRef.current === 4 && !hasCompletedOnboarding && !hasDismissedOnboardingPrompt) {
        setShowOnboardingPrompt(true);
      }
    }

    // Remove the card from the screen
    setShowMobileSheet(false); // Close mobile sheet when swiping
    setTimeout(() => {
      setPets((prev) => prev.slice(1));
    }, 200);
  };
  
  // ONBOARDING HANDLERS
  const handleOnboardingComplete = useCallback(async (data: OnboardingData) => {
    setShowOnboardingWizard(false);
    localStorage.setItem('hasCompletedOnboarding', 'true');
    
    // Also store in localStorage for anonymous users
    localStorage.setItem('onboardingData', JSON.stringify(data));
    
    // Try to save to database if logged in
    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        console.log('Profile saved to localStorage only (not logged in)');
      }
    } catch (error) {
      console.log('Profile saved to localStorage only');
    }
  }, []);

  const handleOnboardingSkip = useCallback(() => {
    setShowOnboardingWizard(false);
    setShowOnboardingPrompt(false);
    localStorage.setItem('hasDismissedOnboardingPrompt', 'true');
  }, []);
  
  // UNDO HANDLER
  const handleUndo = useCallback(() => {
    if (!lastSwipedPet || !aiProfile) return;
    
    // Reverse the swipe in AI profile
    const updatedProfile = undoSwipe(aiProfile, lastSwipedPet, lastSwipeWasLike);
    saveProfile(updatedProfile);
    setAiProfile(updatedProfile);
    
    // Add the pet back to the front of the deck
    setPets((prev) => [lastSwipedPet, ...prev]);
    
    // Clear undo state
    setShowUndoButton(false);
    setLastSwipedPet(null);
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }
  }, [lastSwipedPet, lastSwipeWasLike, aiProfile]);

  // 2b. KEYBOARD NAVIGATION - triggers visual swipe animation
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (pets.length === 0 || loading) return;
      
      // Dismiss tutorial on any key
      if (showTutorial) {
        dismissTutorial();
      }
      
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
        {/* Swipe Card Section - Full on mobile, 50% on desktop */}
        <div className="relative flex-1 md:flex-none md:w-[50%] lg:w-[55%] h-full flex flex-col">
          <div className="flex-1 relative">
            <SwipeCard 
               ref={swipeCardRef}
               key={pets[0].id} 
               pet={pets[0]} 
               onSwipe={handleSwipe} 
            />
            
            {/* Mobile Detail Sheet */}
            <MobileDetailSheet
              pet={pets[0]}
              isOpen={showMobileSheet}
              onToggle={() => setShowMobileSheet(!showMobileSheet)}
              onClose={() => setShowMobileSheet(false)}
            />
          </div>
          
          {/* Keyboard Hint - Below buttons on desktop */}
          <div className="hidden md:flex justify-center pb-4">
            <div className="flex items-center gap-4 bg-white/90 backdrop-blur-sm px-5 py-2.5 rounded-full shadow-lg text-sm text-gray-600">
              <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">←</kbd>
              <span className="font-medium">Nope</span>
              <Keyboard size={16} className="text-gray-400 mx-2" />
              <span className="font-medium">Like</span>
              <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">→</kbd>
            </div>
          </div>
        </div>

        {/* Desktop Detail Panel - Hidden on mobile, 50% on desktop */}
        <div className="hidden md:flex md:w-[50%] lg:w-[45%] h-full flex-col bg-gradient-to-b from-slate-50 to-white border-l border-slate-200 pt-20 overflow-y-auto">
          <div className="flex-1 p-6 lg:p-8">
            
            {/* Match Score & Urgency Banner */}
            <div className="flex flex-wrap gap-2 mb-5">
              {aiProfile && (
                <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-full shadow-md">
                  <Sparkles size={16} />
                  <span className="font-bold text-sm">Great Match!</span>
                </div>
              )}
              {pets[0].daysInShelter && pets[0].daysInShelter > 30 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-full border border-amber-200">
                  <Calendar size={14} />
                  <span className="font-semibold text-sm">{pets[0].daysInShelter} days waiting</span>
                </div>
              )}
            </div>
            
            {/* Name & Breed Header */}
            <div className="mb-5">
              <h2 className="text-3xl lg:text-4xl font-black text-slate-800">{pets[0].name}</h2>
              <p className="text-lg text-slate-500 font-medium">{pets[0].breed}</p>
            </div>
            
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-4 gap-2 lg:gap-3 mb-6">
              <div className="text-center p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                <Calendar size={18} className="mx-auto text-indigo-400 mb-1" />
                <div className="text-xs lg:text-sm font-bold text-slate-700">{pets[0].age}</div>
              </div>
              <div className="text-center p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                <Ruler size={18} className="mx-auto text-indigo-400 mb-1" />
                <div className="text-xs lg:text-sm font-bold text-slate-700">{pets[0].size}</div>
              </div>
              <div className="text-center p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                <Zap size={18} className={`mx-auto mb-1 ${pets[0].energyLevel === 'High' ? 'text-orange-400' : pets[0].energyLevel === 'Low' ? 'text-indigo-400' : 'text-yellow-400'}`} />
                <div className="text-xs lg:text-sm font-bold text-slate-700">{pets[0].energyLevel}</div>
              </div>
              <div className="text-center p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                <MapPin size={18} className="mx-auto text-indigo-400 mb-1" />
                <div className="text-xs lg:text-sm font-bold text-slate-700 truncate">{pets[0].distance ? `${pets[0].distance}mi` : 'Local'}</div>
              </div>
            </div>
            
            {/* Compatibility Badges */}
            <div className="flex flex-wrap gap-2 mb-6">
              {pets[0].compatibility?.kids && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium border border-indigo-100">
                  <Baby size={14} /> Kids OK
                </span>
              )}
              {pets[0].compatibility?.dogs && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium border border-indigo-100">
                  <Dog size={14} /> Dogs OK
                </span>
              )}
              {pets[0].compatibility?.cats && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium border border-indigo-100">
                  <Cat size={14} /> Cats OK
                </span>
              )}
              {pets[0].houseTrained && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium border border-indigo-100">
                  <Home size={14} /> House Trained
                </span>
              )}
            </div>
            
            {/* About Section */}
            <div className="mb-6 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
              <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wide mb-2">About Me</h3>
              <p className="text-slate-700 leading-relaxed text-sm lg:text-base">
                {pets[0].aiSummary || pets[0].description || 'This adorable pet is looking for their forever home!'}
              </p>
            </div>
            
            {/* Health Quick Glance */}
            {pets[0].health && (pets[0].health.vaccinated || pets[0].health.spayedNeutered || pets[0].health.microchipped) && (
              <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-100 shadow-sm mb-6">
                <span className="text-xs font-bold text-indigo-400 uppercase">Health</span>
                <div className="flex flex-wrap gap-3">
                  {pets[0].health.vaccinated && (
                    <div className="flex items-center gap-1 text-emerald-600" title="Vaccinated">
                      <Syringe size={14} />
                      <span className="text-xs font-medium">Vaxxed</span>
                    </div>
                  )}
                  {pets[0].health.spayedNeutered && (
                    <div className="flex items-center gap-1 text-emerald-600" title="Spayed/Neutered">
                      <ShieldCheck size={14} />
                      <span className="text-xs font-medium">Fixed</span>
                    </div>
                  )}
                  {pets[0].health.microchipped && (
                    <div className="flex items-center gap-1 text-emerald-600" title="Microchipped">
                      <Cpu size={14} />
                      <span className="text-xs font-medium">Chipped</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Personality Tags */}
            {[...(pets[0].aiTags || []), ...pets[0].tags].filter((t, i, arr) => arr.indexOf(t) === i).filter(t => !['Dog', 'Cat', 'High Energy', 'Low Energy', 'Chill', 'Senior', 'Small', 'Large', 'Medium', 'Good with Kids'].includes(t)).length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wide mb-2">Personality</h3>
                <div className="flex flex-wrap gap-2">
                  {[...(pets[0].aiTags || []), ...pets[0].tags]
                    .filter((t, i, arr) => arr.indexOf(t) === i)
                    .filter(t => !['Dog', 'Cat', 'High Energy', 'Low Energy', 'Chill', 'Senior', 'Small', 'Large', 'Medium', 'Good with Kids'].includes(t))
                    .slice(0, 5)
                    .map(tag => (
                      <span key={tag} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm font-medium">
                        {tag}
                      </span>
                    ))
                  }
                </div>
              </div>
            )}
            
            {/* View Full Profile Button */}
            <Link 
              href={`/pet/${pets[0].id}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-full font-bold hover:bg-indigo-700 transition shadow-lg hover:shadow-xl"
            >
              View Full Profile <ExternalLink size={18} />
            </Link>
            
            {/* Shelter Info Footer */}
            {(pets[0].organization || pets[0].location) && (
              <div className="mt-8 pt-6 border-t border-slate-100">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Building size={14} className="text-slate-400" />
                  {pets[0].organization ? (
                    <span>From <strong className="text-slate-700">{pets[0].organization.name}</strong></span>
                  ) : pets[0].location && (
                    <span>{pets[0].location}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Toast Notification - Added to Shortlist */}
      <div 
        className={`fixed bottom-24 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-full font-bold shadow-lg z-50 transition-all duration-300 flex items-center gap-2 ${
          showToast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <Heart size={20} fill="white" />
        Added to Shortlist!
      </div>
      
      {/* Undo Button */}
      <button
        onClick={handleUndo}
        className={`fixed bottom-24 right-6 bg-white text-slate-700 px-4 py-3 rounded-full font-bold shadow-lg z-50 transition-all duration-300 flex items-center gap-2 hover:bg-slate-100 border border-slate-200 ${
          showUndoButton ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'
        }`}
      >
        <Undo2 size={18} />
        Undo
      </button>
      
      {/* First-Time Tutorial Overlay */}
      {showTutorial && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
          onClick={dismissTutorial}
        >
          <div className="text-center text-white px-8">
            <p className="text-lg mb-8 opacity-80">Tap anywhere to dismiss</p>
            <div className="flex items-center justify-center gap-12 mb-8">
              <div className="flex flex-col items-center gap-3">
                <div className="w-20 h-20 rounded-full bg-red-500/80 flex items-center justify-center animate-pulse">
                  <ChevronLeft size={48} className="text-white" />
                </div>
                <span className="text-xl font-bold">Nope</span>
              </div>
              <div className="flex flex-col items-center gap-3">
                <div className="w-20 h-20 rounded-full bg-green-500/80 flex items-center justify-center animate-pulse">
                  <ChevronRight size={48} className="text-white" />
                </div>
                <span className="text-xl font-bold">Love</span>
              </div>
            </div>
            <p className="text-2xl font-bold">Swipe to find your perfect pet!</p>
          </div>
        </div>
      )}
      
      {/* Onboarding Prompt - Shows after a few swipes */}
      {showOnboardingPrompt && !showOnboardingWizard && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-2xl p-4 z-50 max-w-sm w-full mx-4 border border-orange-200">
          <div className="flex items-start gap-3">
            <div className="bg-orange-100 p-2 rounded-xl">
              <Sparkles className="text-orange-500" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900">Want better matches?</h3>
              <p className="text-sm text-slate-500 mt-1">Take a quick 30-second quiz to help us find your perfect pet!</p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => {
                    setShowOnboardingPrompt(false);
                    setShowOnboardingWizard(true);
                  }}
                  className="px-4 py-2 bg-orange-500 text-white rounded-full text-sm font-bold hover:bg-orange-600 transition"
                >
                  Let's go! 🐾
                </button>
                <button
                  onClick={() => {
                    setShowOnboardingPrompt(false);
                    localStorage.setItem('hasDismissedOnboardingPrompt', 'true');
                  }}
                  className="px-4 py-2 text-slate-500 text-sm font-medium hover:text-slate-700 transition"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Onboarding Wizard Modal */}
      {showOnboardingWizard && (
        <OnboardingWizard 
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      )}
    </div>
  );
}
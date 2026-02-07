'use client';

import { Pet } from '@/lib/adapters/base';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Dog, Cat, LayoutGrid, List, Grid3x3, SlidersHorizontal, X, Check, UserCircle, Sparkles, MapPin, Navigation, Loader2, RotateCcw, Baby, Users, Zap } from 'lucide-react';
import MatchProfileModal, { UserPreferences } from './MatchProfileModal'; // Import the new modal
import { loadProfile, getRecommendedPets } from '@/lib/ai/learning-engine';
import { 
  getCachedLocation, 
  getUserLocation, 
  getLocationString, 
  createLocationFromZip,
  clearCachedLocation,
  isGeolocationSupported,
  type UserLocation 
} from '@/lib/location';

// Filter state interface for persistence
interface FilterState {
  ageFilter: string;
  sizeFilter: string;
  genderFilter: string;
  coatFilter: string;
  energyFilter: string;
  goodWithKids: boolean | null;
  goodWithDogs: boolean | null;
  goodWithCats: boolean | null;
  houseTrained: boolean | null;
  breedSearch: string;
}

const DEFAULT_FILTERS: FilterState = {
  ageFilter: 'All',
  sizeFilter: 'All',
  genderFilter: 'All',
  coatFilter: 'All',
  energyFilter: 'All',
  goodWithKids: null,
  goodWithDogs: null,
  goodWithCats: null,
  houseTrained: null,
  breedSearch: '',
};

const FILTER_STORAGE_KEY = 'pet_explorer_filters';

// Helper for age (reused)
const getAgeCategory = (ageString: string): string => {
  const age = ageString.toLowerCase();
  if (age.includes('month') || age.includes('week')) return 'Baby';
  const match = age.match(/\d+/);
  if (!match) return 'Adult';
  const years = parseInt(match[0]);
  if (years < 2) return 'Young';
  if (years >= 8) return 'Senior';
  return 'Adult';
};

export default function PetExplorer({ initialPets, locationSearchEnabled = false }: { initialPets: Pet[], locationSearchEnabled?: boolean }) {
  // VIEW & UI STATE
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'panorama'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // LOCATION STATE
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [distance, setDistance] = useState(25);
  const [zipInput, setZipInput] = useState('');
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [pets, setPets] = useState<Pet[]>(initialPets);
  const [petsLoading, setPetsLoading] = useState(false);

  // FILTER STATE
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'All' | 'Dogs' | 'Cats' | 'Recommended'>('All');
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  
  // USER PREFERENCES (Loaded from local storage)
  const [userPrefs, setUserPrefs] = useState<UserPreferences | null>(null);

  // Calculate unique breeds from pets for the breed filter dropdown
  const uniqueBreeds = useMemo(() => {
    const breeds = new Set<string>();
    pets.forEach(pet => {
      if (pet.breed) breeds.add(pet.breed);
    });
    return Array.from(breeds).sort();
  }, [pets]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return filters.ageFilter !== 'All' ||
      filters.sizeFilter !== 'All' ||
      filters.genderFilter !== 'All' ||
      filters.coatFilter !== 'All' ||
      filters.energyFilter !== 'All' ||
      filters.goodWithKids !== null ||
      filters.goodWithDogs !== null ||
      filters.goodWithCats !== null ||
      filters.houseTrained !== null ||
      filters.breedSearch !== '';
  }, [filters]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.ageFilter !== 'All') count++;
    if (filters.sizeFilter !== 'All') count++;
    if (filters.genderFilter !== 'All') count++;
    if (filters.coatFilter !== 'All') count++;
    if (filters.energyFilter !== 'All') count++;
    if (filters.goodWithKids !== null) count++;
    if (filters.goodWithDogs !== null) count++;
    if (filters.goodWithCats !== null) count++;
    if (filters.houseTrained !== null) count++;
    if (filters.breedSearch !== '') count++;
    return count;
  }, [filters]);

  // Load prefs on startup
  useEffect(() => {
    const saved = localStorage.getItem('userPreferences');
    if (saved) {
        setUserPrefs(JSON.parse(saved));
    }
    
    // Load cached location
    const cachedLocation = getCachedLocation();
    if (cachedLocation) {
      setUserLocation(cachedLocation);
    }

    // Load saved filters
    const savedFilters = localStorage.getItem(FILTER_STORAGE_KEY);
    if (savedFilters) {
      try {
        setFilters({ ...DEFAULT_FILTERS, ...JSON.parse(savedFilters) });
      } catch (e) {
        console.error('Failed to load saved filters:', e);
      }
    }
  }, []);

  // Save filters when they change
  useEffect(() => {
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters));
  }, [filters]);

  // Update a single filter
  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Clear all filters
  const clearAllFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  // Fetch pets when location changes
  useEffect(() => {
    if (userLocation && locationSearchEnabled) {
      fetchPetsByLocation();
    }
  }, [userLocation, distance, locationSearchEnabled]);

  // Fetch pets from API with location
  const fetchPetsByLocation = async () => {
    if (!userLocation) return;
    
    setPetsLoading(true);
    try {
      const locationStr = getLocationString(userLocation);
      const response = await fetch(`/api/pets?location=${encodeURIComponent(locationStr)}&distance=${distance}`);
      const data = await response.json();
      if (data.pets) {
        setPets(data.pets);
      }
    } catch (error) {
      console.error('Failed to fetch pets:', error);
    } finally {
      setPetsLoading(false);
    }
  };

  // Request browser location
  const requestLocation = async () => {
    setLocationLoading(true);
    try {
      const location = await getUserLocation(true);
      if (location) {
        setUserLocation(location);
        setShowLocationPrompt(false);
      }
    } catch (error) {
      console.error('Location error:', error);
    } finally {
      setLocationLoading(false);
    }
  };

  // Set location from ZIP
  const setLocationFromZip = () => {
    if (zipInput.length === 5) {
      const location = createLocationFromZip(zipInput);
      setUserLocation(location);
      setShowLocationPrompt(false);
    }
  };

  // Clear location
  const clearLocation = () => {
    clearCachedLocation();
    setUserLocation(null);
    setPets(initialPets);
  };

  // Save prefs
  const handleSaveProfile = (prefs: UserPreferences) => {
    setUserPrefs(prefs);
    localStorage.setItem('userPreferences', JSON.stringify(prefs));
    setFilterMode('Recommended'); // Switch to recommended view automatically
  };

  // --- THE FILTERING ENGINE ---
  let filteredPets = pets.filter((pet) => {
    if (pet.status === 'Adopted') return false;

    // 1. Search
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      pet.name.toLowerCase().includes(searchLower) || 
      pet.breed.toLowerCase().includes(searchLower) ||
      pet.tags.some(t => t.toLowerCase().includes(searchLower));

    // 2. Main Filter Modes (Fixed Logic using Tags)
    let matchesMode = true;
    if (filterMode === 'Dogs') matchesMode = pet.tags.includes('Dog');
    if (filterMode === 'Cats') matchesMode = pet.tags.includes('Cat');
    
    // Skip AI filtering here - we'll do it after
    if (filterMode === 'Recommended') matchesMode = true;
    
    // 3. Basic Filters
    if (filters.ageFilter !== 'All') {
        const ageCat = getAgeCategory(pet.age);
        if (ageCat !== filters.ageFilter) return false;
    }
    if (filters.sizeFilter !== 'All' && pet.size !== filters.sizeFilter) return false;
    if (filters.genderFilter !== 'All' && pet.sex !== filters.genderFilter) return false;

    // 4. Advanced Filters
    if (filters.coatFilter !== 'All' && pet.coatLength !== filters.coatFilter) return false;
    if (filters.energyFilter !== 'All' && pet.energyLevel !== filters.energyFilter) return false;

    // 5. Breed search
    if (filters.breedSearch && !pet.breed.toLowerCase().includes(filters.breedSearch.toLowerCase())) return false;

    // 6. Compatibility filters
    if (filters.goodWithKids !== null && pet.compatibility?.kids !== filters.goodWithKids) return false;
    if (filters.goodWithDogs !== null && pet.compatibility?.dogs !== filters.goodWithDogs) return false;
    if (filters.goodWithCats !== null && pet.compatibility?.cats !== filters.goodWithCats) return false;

    // 7. Care filters
    if (filters.houseTrained !== null && pet.houseTrained !== filters.houseTrained) return false;

    return matchesSearch && matchesMode;
  });

  // 4. AI-POWERED RECOMMENDATION SORTING
  if (filterMode === 'Recommended') {
    const aiProfile = loadProfile();
    filteredPets = getRecommendedPets(filteredPets, aiProfile);
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      
      {/* LOCATION BAR */}
      {locationSearchEnabled && (
        <div className="mb-6">
          {userLocation ? (
            <div className="flex flex-wrap items-center gap-3 p-4 bg-gradient-to-r from-teal-50 to-blue-50 rounded-2xl border border-teal-100">
              <div className="flex items-center gap-2 text-teal-700">
                <MapPin size={18} className="text-teal-600" />
                <span className="font-bold">
                  {userLocation.city && userLocation.state 
                    ? `${userLocation.city}, ${userLocation.state}` 
                    : userLocation.zipCode || 'Your location'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <select 
                  value={distance} 
                  onChange={(e) => setDistance(parseInt(e.target.value))}
                  className="px-3 py-1.5 rounded-lg border border-teal-200 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value={10}>10 miles</option>
                  <option value={25}>25 miles</option>
                  <option value={50}>50 miles</option>
                  <option value={100}>100 miles</option>
                </select>
              </div>

              <button 
                onClick={clearLocation}
                className="ml-auto text-sm text-gray-500 hover:text-red-600 font-medium transition"
              >
                Clear Location
              </button>

              {petsLoading && (
                <Loader2 size={18} className="animate-spin text-teal-600" />
              )}
            </div>
          ) : showLocationPrompt ? (
            <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
              <h3 className="font-bold text-lg text-slate-900 mb-4 flex items-center gap-2">
                <MapPin className="text-teal-600" size={20} />
                Find Pets Near You
              </h3>
              
              <div className="flex flex-col sm:flex-row gap-4">
                {isGeolocationSupported() && (
                  <button
                    onClick={requestLocation}
                    disabled={locationLoading}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition disabled:opacity-50"
                  >
                    {locationLoading ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Navigation size={18} />
                    )}
                    Use My Location
                  </button>
                )}
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter ZIP code"
                    value={zipInput}
                    onChange={(e) => setZipInput(e.target.value.replace(/\D/g, '').slice(0, 5))}
                    className="px-4 py-3 rounded-xl border border-gray-300 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 w-36"
                    maxLength={5}
                  />
                  <button
                    onClick={setLocationFromZip}
                    disabled={zipInput.length !== 5}
                    className="px-4 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition disabled:opacity-50"
                  >
                    Search
                  </button>
                </div>
              </div>
              
              <button 
                onClick={() => setShowLocationPrompt(false)}
                className="mt-4 text-sm text-gray-500 hover:text-gray-700"
              >
                Skip for now
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLocationPrompt(true)}
              className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-teal-50 to-blue-50 text-teal-700 font-bold rounded-xl border border-teal-100 hover:from-teal-100 hover:to-blue-100 transition w-full sm:w-auto"
            >
              <MapPin size={18} />
              Find pets near me
            </button>
          )}
        </div>
      )}

      {/* CONTROLS HEADER */}
      <div className="flex flex-col gap-6 mb-8">
        
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-3.5 text-slate-500" size={20} />
                <input 
                    type="text" 
                    placeholder="Search pets..." 
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Main Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
                <button onClick={() => setFilterMode('All')} className={`px-4 py-3 rounded-xl font-bold transition whitespace-nowrap ${filterMode === 'All' ? 'bg-slate-900 text-white' : 'bg-white border border-gray-200 hover:bg-gray-50'}`}>All Pets</button>
                <button onClick={() => setFilterMode('Dogs')} className={`px-4 py-3 rounded-xl font-bold transition flex items-center gap-2 ${filterMode === 'Dogs' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 hover:bg-gray-50'}`}><Dog size={18} /> Dogs</button>
                <button onClick={() => setFilterMode('Cats')} className={`px-4 py-3 rounded-xl font-bold transition flex items-center gap-2 ${filterMode === 'Cats' ? 'bg-amber-500 text-white' : 'bg-white border border-gray-200 hover:bg-gray-50'}`}><Cat size={18} /> Cats</button>
                
                {/* THE NEW "FOR YOU" TAB */}
                <button 
                    onClick={() => {
                        if (userPrefs) setFilterMode('Recommended');
                        else setShowProfileModal(true); // Open modal if no profile exists yet
                    }} 
                    className={`px-4 py-3 rounded-xl font-bold transition flex items-center gap-2 border ${filterMode === 'Recommended' ? 'bg-purple-600 text-white border-purple-600' : 'bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100'}`}
                >
                    <Sparkles size={18} /> For You
                </button>
            </div>
        </div>

        {/* Secondary Toolbar: Profile & View Options */}
        <div className="flex flex-col gap-4 border-t border-gray-100 pt-4">
            <div className="flex justify-between items-center">
                <div className="flex gap-4">
                    {/* Edit Profile Button */}
                    <button 
                        onClick={() => setShowProfileModal(true)}
                        className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition"
                    >
                        <UserCircle size={20} />
                        {userPrefs ? 'Edit My Profile' : 'Create Match Profile'}
                    </button>

                    {/* Filter Toggle */}
                    <button 
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 text-sm font-bold transition ${showFilters ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        <SlidersHorizontal size={20} />
                        Filters
                        {activeFilterCount > 0 && (
                          <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">{activeFilterCount}</span>
                        )}
                    </button>

                    {/* Clear Filters */}
                    {hasActiveFilters && (
                      <button 
                        onClick={clearAllFilters}
                        className="flex items-center gap-1 text-sm font-bold text-red-500 hover:text-red-600 transition"
                      >
                        <RotateCcw size={16} />
                        Clear All
                      </button>
                    )}
                </div>

                {/* Layout Toggle */}
                <div className="flex bg-white border border-gray-300 rounded-xl p-1">
                    <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition ${viewMode === 'grid' ? 'bg-slate-100 text-slate-900' : 'text-gray-400 hover:text-slate-600'}`}><LayoutGrid size={20} /></button>
                    <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition ${viewMode === 'list' ? 'bg-slate-100 text-slate-900' : 'text-gray-400 hover:text-slate-600'}`}><List size={20} /></button>
                    <button onClick={() => setViewMode('panorama')} className={`p-2 rounded-lg transition ${viewMode === 'panorama' ? 'bg-slate-100 text-slate-900' : 'text-gray-400 hover:text-slate-600'}`}><Grid3x3 size={20} /></button>
                </div>
            </div>

            {/* EXPANDABLE FILTERS */}
            {showFilters && (
                <div className="bg-gray-50 p-6 rounded-2xl animate-in fade-in slide-in-from-top-2 space-y-6">
                    
                    {/* ACTIVE FILTER BADGES */}
                    {hasActiveFilters && (
                      <div className="flex flex-wrap gap-2 pb-4 border-b border-gray-200">
                        {filters.ageFilter !== 'All' && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                            Age: {filters.ageFilter}
                            <button onClick={() => updateFilter('ageFilter', 'All')} className="hover:text-blue-900"><X size={14} /></button>
                          </span>
                        )}
                        {filters.sizeFilter !== 'All' && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                            Size: {filters.sizeFilter}
                            <button onClick={() => updateFilter('sizeFilter', 'All')} className="hover:text-purple-900"><X size={14} /></button>
                          </span>
                        )}
                        {filters.genderFilter !== 'All' && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm font-medium">
                            {filters.genderFilter}
                            <button onClick={() => updateFilter('genderFilter', 'All')} className="hover:text-pink-900"><X size={14} /></button>
                          </span>
                        )}
                        {filters.coatFilter !== 'All' && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                            Coat: {filters.coatFilter}
                            <button onClick={() => updateFilter('coatFilter', 'All')} className="hover:text-amber-900"><X size={14} /></button>
                          </span>
                        )}
                        {filters.energyFilter !== 'All' && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                            Energy: {filters.energyFilter}
                            <button onClick={() => updateFilter('energyFilter', 'All')} className="hover:text-orange-900"><X size={14} /></button>
                          </span>
                        )}
                        {filters.breedSearch && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm font-medium">
                            Breed: {filters.breedSearch}
                            <button onClick={() => updateFilter('breedSearch', '')} className="hover:text-teal-900"><X size={14} /></button>
                          </span>
                        )}
                        {filters.goodWithKids !== null && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                            {filters.goodWithKids ? 'Good with Kids' : 'Not with Kids'}
                            <button onClick={() => updateFilter('goodWithKids', null)} className="hover:text-green-900"><X size={14} /></button>
                          </span>
                        )}
                        {filters.goodWithDogs !== null && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                            {filters.goodWithDogs ? 'Good with Dogs' : 'Not with Dogs'}
                            <button onClick={() => updateFilter('goodWithDogs', null)} className="hover:text-blue-900"><X size={14} /></button>
                          </span>
                        )}
                        {filters.goodWithCats !== null && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                            {filters.goodWithCats ? 'Good with Cats' : 'Not with Cats'}
                            <button onClick={() => updateFilter('goodWithCats', null)} className="hover:text-amber-900"><X size={14} /></button>
                          </span>
                        )}
                        {filters.houseTrained !== null && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                            {filters.houseTrained ? 'House Trained' : 'Not House Trained'}
                            <button onClick={() => updateFilter('houseTrained', null)} className="hover:text-indigo-900"><X size={14} /></button>
                          </span>
                        )}
                      </div>
                    )}

                    {/* ROW 1: Basic Filters */}
                    <div>
                      <h4 className="text-sm font-bold text-gray-700 mb-3">Basic Filters</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {/* Age Filter */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Age</label>
                            <select 
                                value={filters.ageFilter} 
                                onChange={(e) => updateFilter('ageFilter', e.target.value)}
                                className="w-full p-2 rounded-lg border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            >
                                <option value="All">Any Age</option>
                                <option value="Baby">Baby (Puppy/Kitten)</option>
                                <option value="Young">Young</option>
                                <option value="Adult">Adult</option>
                                <option value="Senior">Senior</option>
                            </select>
                        </div>

                        {/* Size Filter */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Size</label>
                            <select 
                                value={filters.sizeFilter} 
                                onChange={(e) => updateFilter('sizeFilter', e.target.value)}
                                className="w-full p-2 rounded-lg border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            >
                                <option value="All">Any Size</option>
                                <option value="Small">Small</option>
                                <option value="Medium">Medium</option>
                                <option value="Large">Large</option>
                                <option value="Extra Large">Extra Large</option>
                            </select>
                        </div>

                        {/* Gender Filter */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Gender</label>
                            <select 
                                value={filters.genderFilter} 
                                onChange={(e) => updateFilter('genderFilter', e.target.value)}
                                className="w-full p-2 rounded-lg border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            >
                                <option value="All">Any Gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                            </select>
                        </div>

                        {/* Breed Search */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Breed</label>
                            <input 
                                type="text"
                                placeholder="Search breed..."
                                value={filters.breedSearch}
                                onChange={(e) => updateFilter('breedSearch', e.target.value)}
                                list="breed-options"
                                className="w-full p-2 rounded-lg border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            />
                            <datalist id="breed-options">
                              {uniqueBreeds.map(breed => (
                                <option key={breed} value={breed} />
                              ))}
                            </datalist>
                        </div>
                      </div>
                    </div>

                    {/* ROW 2: Physical Traits */}
                    <div>
                      <h4 className="text-sm font-bold text-gray-700 mb-3">Physical Traits</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {/* Coat Length */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Coat Length</label>
                            <select 
                                value={filters.coatFilter} 
                                onChange={(e) => updateFilter('coatFilter', e.target.value)}
                                className="w-full p-2 rounded-lg border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            >
                                <option value="All">Any Coat</option>
                                <option value="Hairless">Hairless</option>
                                <option value="Short">Short</option>
                                <option value="Medium">Medium</option>
                                <option value="Long">Long</option>
                            </select>
                        </div>

                        {/* Energy Level */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Energy Level</label>
                            <select 
                                value={filters.energyFilter} 
                                onChange={(e) => updateFilter('energyFilter', e.target.value)}
                                className="w-full p-2 rounded-lg border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            >
                                <option value="All">Any Energy</option>
                                <option value="Low">Low (Couch Potato)</option>
                                <option value="Moderate">Moderate</option>
                                <option value="High">High (Active)</option>
                            </select>
                        </div>
                      </div>
                    </div>

                    {/* ROW 3: Compatibility & Care */}
                    <div>
                      <h4 className="text-sm font-bold text-gray-700 mb-3">Compatibility & Care</h4>
                      <div className="flex flex-wrap gap-3">
                        {/* Good With Kids */}
                        <button
                          onClick={() => updateFilter('goodWithKids', filters.goodWithKids === true ? null : true)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition ${
                            filters.goodWithKids === true 
                              ? 'bg-green-100 border-green-300 text-green-700' 
                              : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
                          }`}
                        >
                          <Baby size={16} />
                          Good with Kids
                          {filters.goodWithKids === true && <Check size={16} />}
                        </button>

                        {/* Good With Dogs */}
                        <button
                          onClick={() => updateFilter('goodWithDogs', filters.goodWithDogs === true ? null : true)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition ${
                            filters.goodWithDogs === true 
                              ? 'bg-blue-100 border-blue-300 text-blue-700' 
                              : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
                          }`}
                        >
                          <Dog size={16} />
                          Good with Dogs
                          {filters.goodWithDogs === true && <Check size={16} />}
                        </button>

                        {/* Good With Cats */}
                        <button
                          onClick={() => updateFilter('goodWithCats', filters.goodWithCats === true ? null : true)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition ${
                            filters.goodWithCats === true 
                              ? 'bg-amber-100 border-amber-300 text-amber-700' 
                              : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
                          }`}
                        >
                          <Cat size={16} />
                          Good with Cats
                          {filters.goodWithCats === true && <Check size={16} />}
                        </button>

                        {/* House Trained */}
                        <button
                          onClick={() => updateFilter('houseTrained', filters.houseTrained === true ? null : true)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition ${
                            filters.houseTrained === true 
                              ? 'bg-indigo-100 border-indigo-300 text-indigo-700' 
                              : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
                          }`}
                        >
                          <Users size={16} />
                          House Trained
                          {filters.houseTrained === true && <Check size={16} />}
                        </button>
                      </div>
                    </div>
                </div>
            )}
        </div>

      </div>

      {/* RESULTS */}
      {filteredPets.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-3xl border border-gray-100">
            <div className="inline-block p-4 rounded-full bg-white mb-4 shadow-sm text-gray-400">
                <Search size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-900">No pets match your criteria.</h3>
            <p className="text-gray-500 mt-2">Try adjusting your profile or filters to be less strict.</p>
            <div className="flex gap-4 justify-center mt-6">
                 <button onClick={() => setFilterMode('All')} className="text-blue-600 font-bold hover:underline">View All Pets</button>
                 <button onClick={() => setShowProfileModal(true)} className="text-slate-900 font-bold hover:underline">Edit Profile</button>
            </div>
        </div>
      ) : (
        <div className={
            viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" : 
            viewMode === 'list' ? "flex flex-col gap-4" :
            "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1"
        }>
          
          {filteredPets.map((pet) => {
            // GRID CARD
            if (viewMode === 'grid') return (
                <div key={pet.id} className="group bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300">
                    <Link href={`/pet/${pet.id}`} className="relative h-72 w-full bg-gray-200 block cursor-pointer overflow-hidden">
                        {/* Blurred background */}
                        <Image src={pet.imageUrl} alt="" fill className="object-cover blur-xl scale-110 opacity-50" />
                        {/* Sharp image */}
                        <Image src={pet.imageUrl} alt={pet.name} fill className="object-contain transition-transform duration-500 group-hover:scale-105 z-10" />
                        <div className="absolute top-4 left-4 flex flex-col gap-2 z-20">
                            {pet.daysInShelter > 30 && <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">Long Stay</span>}
                        </div>
                    </Link>
                    <div className="p-6">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="text-2xl font-black text-slate-900">{pet.name}</h3>
                            <span className="text-slate-500 font-bold text-sm">{pet.sex}</span>
                        </div>
                        <p className="text-blue-600 font-bold text-sm mb-3 uppercase tracking-wide">{pet.breed}</p>
                        
                        <div className="flex flex-wrap gap-2 mb-6">
                             {[...(pet.aiTags || []), ...(pet.tags || [])]
                               .filter((t, i, arr) => arr.indexOf(t) === i) // Deduplicate
                               .slice(0, 4)
                               .map(tag => {
                                let style = 'bg-slate-100 text-slate-700 border-slate-200';
                                if (['High Energy', 'Playful'].includes(tag)) style = 'bg-orange-50 text-orange-700 border-orange-100';
                                else if (['Low Energy', 'Chill', 'Couch Potato'].includes(tag)) style = 'bg-blue-50 text-blue-700 border-blue-100';
                                else if (tag.includes('Good with')) style = 'bg-green-50 text-green-700 border-green-100';
                                else if (['Senior', 'Baby'].includes(tag)) style = 'bg-yellow-50 text-yellow-700 border-yellow-100';
                                else if (!['Dog', 'Cat', 'Small', 'Medium', 'Large'].includes(tag)) style = 'bg-purple-50 text-purple-700 border-purple-100';
                                
                                return (
                                 <span key={tag} className={`border px-2 py-1 rounded-md text-xs font-bold ${style}`}>
                                    {style.includes('purple') && <Sparkles size={10} className="inline mr-1" />}
                                    {tag}
                                 </span>
                                );
                             })}
                        </div>

                        <Link href={`/pet/${pet.id}`} className="block w-full text-center py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors">
                            View Profile
                        </Link>
                    </div>
                </div>
            );

            // LIST ROW
            if (viewMode === 'list') return (
                <div key={pet.id} className="group bg-white rounded-2xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all flex gap-6 items-center">
                    <Link href={`/pet/${pet.id}`} className="relative h-24 w-24 flex-shrink-0 cursor-pointer bg-gray-200 rounded-xl overflow-hidden">
                        <Image src={pet.imageUrl} alt="" fill className="object-cover blur-md scale-110 opacity-50" />
                        <Image src={pet.imageUrl} alt={pet.name} fill className="object-contain hover:scale-105 transition z-10" />
                    </Link>
                    
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">{pet.name}</h3>
                            <p className="text-blue-600 text-sm font-medium">{pet.breed}</p>
                        </div>
                        
                        <div className="hidden md:block">
                            <span className="text-xs font-bold text-gray-400 uppercase block">Age / Sex</span>
                            <span className="text-slate-700 font-medium">{pet.age} • {pet.sex}</span>
                        </div>

                        <div className="hidden md:block">
                             <div className="flex gap-2">
                                {[...(pet.aiTags || []), ...(pet.tags || [])]
                                  .filter((t, i, arr) => arr.indexOf(t) === i)
                                  .slice(0, 3)
                                  .map(tag => {
                                    let style = 'bg-slate-100 text-slate-700 border-slate-200';
                                    if (['High Energy', 'Playful'].includes(tag)) style = 'bg-orange-50 text-orange-700 border-orange-100';
                                    else if (['Low Energy', 'Chill', 'Couch Potato'].includes(tag)) style = 'bg-blue-50 text-blue-700 border-blue-100';
                                    else if (tag.includes('Good with')) style = 'bg-green-50 text-green-700 border-green-100';
                                    else if (['Senior', 'Baby'].includes(tag)) style = 'bg-yellow-50 text-yellow-700 border-yellow-100';
                                    else if (!['Dog', 'Cat', 'Small', 'Medium', 'Large'].includes(tag)) style = 'bg-purple-50 text-purple-700 border-purple-100';
                                    
                                    return (
                                        <span key={tag} className={`border px-2 py-1 rounded-md text-xs font-bold ${style}`}>
                                            {style.includes('purple') && <Sparkles size={10} className="inline mr-1" />}
                                            {tag}
                                        </span>
                                    );
                                })}
                             </div>
                        </div>

                        <div className="text-right">
                             <Link href={`/pet/${pet.id}`} className="inline-block px-6 py-2 bg-slate-100 text-slate-900 rounded-lg font-bold hover:bg-slate-200 transition text-sm">
                                View
                             </Link>
                        </div>
                    </div>
                </div>
            );

            // PANORAMA
            if (viewMode === 'panorama') return (
                <Link key={pet.id} href={`/pet/${pet.id}`} className="relative aspect-square overflow-hidden bg-gray-200 cursor-pointer group">
                   <Image src={pet.imageUrl} alt={pet.name} fill className="object-cover transition-transform duration-300 group-hover:scale-110" />
                   <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 text-center">
                      <span className="text-white font-bold text-sm">{pet.name}</span>
                   </div>
                </Link>
            );
          })}
        </div>
      )}

      {/* MATCH PROFILE MODAL */}
      {showProfileModal && (
        <MatchProfileModal 
            initialPrefs={userPrefs || undefined}
            onClose={() => setShowProfileModal(false)}
            onSave={handleSaveProfile}
        />
      )}
    </div>
  );
}
'use client';

import { Pet } from '@/lib/adapters/base';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Dog, Cat, LayoutGrid, List, Grid3x3, SlidersHorizontal, X, Check, UserCircle, Sparkles } from 'lucide-react';
import MatchProfileModal, { UserPreferences } from './MatchProfileModal'; // Import the new modal
import { loadProfile, getRecommendedPets } from '@/lib/ai/learning-engine';

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

export default function PetExplorer({ initialPets }: { initialPets: Pet[] }) {
  // VIEW & UI STATE
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'panorama'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // FILTER STATE
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'All' | 'Dogs' | 'Cats' | 'Recommended'>('All');
  const [ageFilter, setAgeFilter] = useState<'All' | 'Baby' | 'Young' | 'Adult' | 'Senior'>('All');
  const [sizeFilter, setSizeFilter] = useState<'All' | 'Small' | 'Medium' | 'Large'>('All');
  const [genderFilter, setGenderFilter] = useState<'All' | 'Male' | 'Female'>('All');
  
  // USER PREFERENCES (Loaded from local storage)
  const [userPrefs, setUserPrefs] = useState<UserPreferences | null>(null);

  // Load prefs on startup
  useEffect(() => {
    const saved = localStorage.getItem('userPreferences');
    if (saved) {
        setUserPrefs(JSON.parse(saved));
    }
  }, []);

  // Save prefs
  const handleSaveProfile = (prefs: UserPreferences) => {
    setUserPrefs(prefs);
    localStorage.setItem('userPreferences', JSON.stringify(prefs));
    setFilterMode('Recommended'); // Switch to recommended view automatically
  };

  // --- THE FILTERING ENGINE ---
  let filteredPets = initialPets.filter((pet) => {
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
    
    // 3. Additional Filters
    if (ageFilter !== 'All') {
        const ageCat = getAgeCategory(pet.age);
        if (ageCat !== ageFilter) return false;
    }
    if (sizeFilter !== 'All' && pet.size !== sizeFilter) return false;
    if (genderFilter !== 'All' && pet.sex !== genderFilter) return false;

    return matchesSearch && matchesMode;
  });

  // 4. AI-POWERED RECOMMENDATION SORTING
  if (filterMode === 'Recommended') {
    const aiProfile = loadProfile();
    filteredPets = getRecommendedPets(filteredPets, aiProfile);
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      
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
                    </button>
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-2xl animate-in fade-in slide-in-from-top-2">
                    {/* Age Filter */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Age</label>
                        <select 
                            value={ageFilter} 
                            onChange={(e) => setAgeFilter(e.target.value as any)}
                            className="w-full p-2 rounded-lg border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                            value={sizeFilter} 
                            onChange={(e) => setSizeFilter(e.target.value as any)}
                            className="w-full p-2 rounded-lg border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="All">Any Size</option>
                            <option value="Small">Small</option>
                            <option value="Medium">Medium</option>
                            <option value="Large">Large</option>
                        </select>
                    </div>

                    {/* Gender Filter */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Gender</label>
                        <select 
                            value={genderFilter} 
                            onChange={(e) => setGenderFilter(e.target.value as any)}
                            className="w-full p-2 rounded-lg border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="All">Any Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>
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
                             {pet.tags?.slice(0,4).map(tag => {
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
                                {pet.tags?.slice(0, 3).map(tag => {
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
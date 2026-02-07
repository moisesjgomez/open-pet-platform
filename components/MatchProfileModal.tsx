'use client';

import { useState } from 'react';
import { X, Check, Home, User, Activity, Cat, Dog } from 'lucide-react';

// Define what a User Profile looks like
export interface UserPreferences {
  species: 'Dog' | 'Cat' | 'Other' | 'Any';
  energy: 'Low' | 'Moderate' | 'High' | 'Any';
  size: 'Small' | 'Medium' | 'Large' | 'Any';
  goodWithKids: boolean;
  goodWithDogs: boolean;
  goodWithCats: boolean;
}

interface Props {
  onClose: () => void;
  onSave: (prefs: UserPreferences) => void;
  initialPrefs?: UserPreferences;
}

export default function MatchProfileModal({ onClose, onSave, initialPrefs }: Props) {
  const [prefs, setPrefs] = useState<UserPreferences>(initialPrefs || {
    species: 'Any',
    energy: 'Any',
    size: 'Any',
    goodWithKids: false,
    goodWithDogs: false,
    goodWithCats: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(prefs);
    onClose();
  };

  // Helper for selection buttons
  const SelectButton = ({ active, label, onClick }: { active: boolean, label: string, onClick: () => void }) => (
    <button 
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-xl border font-bold text-sm transition-all ${
        active 
          ? 'bg-slate-900 text-white border-slate-900 shadow-md transform scale-105' 
          : 'bg-white text-slate-600 border-gray-200 hover:border-gray-300'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-50 p-6 border-b border-gray-100 flex justify-between items-center">
          <div>
             <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <User size={24} className="text-orange-500" /> My Match Profile
             </h2>
             <p className="text-sm text-gray-500 font-medium">Tell us what you're looking for.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition"><X size={20} /></button>
        </div>

        {/* Form Body */}
        <div className="p-8 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* 1. Species */}
            <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider">I am looking for...</label>
                <div className="flex flex-wrap gap-3">
                    <SelectButton active={prefs.species === 'Dog'} label="🐶 Dogs" onClick={() => setPrefs({...prefs, species: 'Dog'})} />
                    <SelectButton active={prefs.species === 'Cat'} label="🐱 Cats" onClick={() => setPrefs({...prefs, species: 'Cat'})} />
                    <SelectButton active={prefs.species === 'Other'} label="🐾 Other" onClick={() => setPrefs({...prefs, species: 'Other'})} />
                    <SelectButton active={prefs.species === 'Any'} label="Any" onClick={() => setPrefs({...prefs, species: 'Any'})} />
                </div>
            </div>

            {/* 2. Energy Level */}
            <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider">Energy Level</label>
                <div className="flex flex-wrap gap-3">
                    <SelectButton active={prefs.energy === 'Low'} label="🛋️ Low / Senior" onClick={() => setPrefs({...prefs, energy: 'Low'})} />
                    <SelectButton active={prefs.energy === 'Moderate'} label="🚶 Moderate" onClick={() => setPrefs({...prefs, energy: 'Moderate'})} />
                    <SelectButton active={prefs.energy === 'High'} label="⚡ High / Active" onClick={() => setPrefs({...prefs, energy: 'High'})} />
                    <SelectButton active={prefs.energy === 'Any'} label="Any Energy" onClick={() => setPrefs({...prefs, energy: 'Any'})} />
                </div>
            </div>

            {/* 3. Size */}
            <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider">Size Preference</label>
                <div className="flex flex-wrap gap-3">
                    <SelectButton active={prefs.size === 'Small'} label="Small" onClick={() => setPrefs({...prefs, size: 'Small'})} />
                    <SelectButton active={prefs.size === 'Medium'} label="Medium" onClick={() => setPrefs({...prefs, size: 'Medium'})} />
                    <SelectButton active={prefs.size === 'Large'} label="Large" onClick={() => setPrefs({...prefs, size: 'Large'})} />
                    <SelectButton active={prefs.size === 'Any'} label="No Preference" onClick={() => setPrefs({...prefs, size: 'Any'})} />
                </div>
            </div>

            {/* 4. Household Must-Haves */}
            <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider">Must be good with...</label>
                <div className="space-y-3">
                    <label className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition ${prefs.goodWithKids ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <span className="font-bold text-slate-700">👶 Children</span>
                        <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${prefs.goodWithKids ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                            {prefs.goodWithKids && <Check size={14} className="text-white" />}
                        </div>
                        <input type="checkbox" className="hidden" checked={prefs.goodWithKids} onChange={(e) => setPrefs({...prefs, goodWithKids: e.target.checked})} />
                    </label>

                    <label className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition ${prefs.goodWithDogs ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <span className="font-bold text-slate-700">🐕 Other Dogs</span>
                        <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${prefs.goodWithDogs ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                            {prefs.goodWithDogs && <Check size={14} className="text-white" />}
                        </div>
                        <input type="checkbox" className="hidden" checked={prefs.goodWithDogs} onChange={(e) => setPrefs({...prefs, goodWithDogs: e.target.checked})} />
                    </label>

                    <label className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition ${prefs.goodWithCats ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <span className="font-bold text-slate-700">🐈 Cats</span>
                        <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${prefs.goodWithCats ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                            {prefs.goodWithCats && <Check size={14} className="text-white" />}
                        </div>
                        <input type="checkbox" className="hidden" checked={prefs.goodWithCats} onChange={(e) => setPrefs({...prefs, goodWithCats: e.target.checked})} />
                    </label>
                </div>
            </div>

            <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-slate-800 transition shadow-lg">
                Save & Find Matches
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}
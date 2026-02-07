'use client';

import { Dog, Cat, Zap, Home, Baby, X, Check, Filter } from 'lucide-react';
import { UserPreferences } from './MatchProfileModal';

interface SwipeFilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filters: UserPreferences;
  onFiltersChange: (filters: UserPreferences) => void;
  onApply: () => void;
}

export default function SwipeFilterPanel({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  onApply,
}: SwipeFilterPanelProps) {
  if (!isOpen) return null;

  const handleSpeciesChange = (species: 'Dog' | 'Cat' | 'Other' | 'Any') => {
    onFiltersChange({ ...filters, species });
  };

  const handleSizeChange = (size: 'Small' | 'Medium' | 'Large' | 'Any') => {
    onFiltersChange({ ...filters, size });
  };

  const handleEnergyChange = (energy: 'Low' | 'Moderate' | 'High' | 'Any') => {
    onFiltersChange({ ...filters, energy });
  };

  const handleCompatibilityToggle = (field: 'goodWithKids' | 'goodWithDogs' | 'goodWithCats') => {
    onFiltersChange({ ...filters, [field]: !filters[field] });
  };

  const handleClearAll = () => {
    onFiltersChange({
      species: 'Any',
      size: 'Any',
      energy: 'Any',
      goodWithKids: false,
      goodWithDogs: false,
      goodWithCats: false,
    });
  };

  return (
    <div className="fixed top-16 left-0 right-0 bg-white border-b shadow-lg z-40 animate-in slide-in-from-top duration-200">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-900" />
            <h2 className="text-lg font-semibold text-slate-900">Filter Pets</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close filters"
          >
            <X className="w-5 h-5 text-slate-700" />
          </button>
        </div>

        {/* Species Filter */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Species
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleSpeciesChange('Dog')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${
                filters.species === 'Dog'
                  ? 'bg-slate-900 text-white'
                  : 'bg-gray-100 text-slate-700 hover:bg-gray-200'
              }`}
            >
              <Dog className="w-4 h-4" />
              Dogs
            </button>
            <button
              onClick={() => handleSpeciesChange('Cat')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${
                filters.species === 'Cat'
                  ? 'bg-slate-900 text-white'
                  : 'bg-gray-100 text-slate-700 hover:bg-gray-200'
              }`}
            >
              <Cat className="w-4 h-4" />
              Cats
            </button>
            <button
              onClick={() => handleSpeciesChange('Other')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${
                filters.species === 'Other'
                  ? 'bg-slate-900 text-white'
                  : 'bg-gray-100 text-slate-700 hover:bg-gray-200'
              }`}
            >
              <Home className="w-4 h-4" />
              Other
            </button>
            <button
              onClick={() => handleSpeciesChange('Any')}
              className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                filters.species === 'Any'
                  ? 'bg-slate-900 text-white'
                  : 'bg-gray-100 text-slate-700 hover:bg-gray-200'
              }`}
            >
              Any
            </button>
          </div>
        </div>

        {/* Size Filter */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Size
          </label>
          <div className="flex gap-2">
            {(['Small', 'Medium', 'Large', 'Any'] as const).map((size) => (
              <button
                key={size}
                onClick={() => handleSizeChange(size)}
                className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                  filters.size === size
                    ? 'bg-slate-900 text-white'
                    : 'bg-gray-100 text-slate-700 hover:bg-gray-200'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Energy Filter */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            <Zap className="w-4 h-4 inline mr-1" />
            Energy Level
          </label>
          <div className="flex gap-2">
            {(['Low', 'Moderate', 'High', 'Any'] as const).map((energy) => (
              <button
                key={energy}
                onClick={() => handleEnergyChange(energy)}
                className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                  filters.energy === energy
                    ? 'bg-slate-900 text-white'
                    : 'bg-gray-100 text-slate-700 hover:bg-gray-200'
                }`}
              >
                {energy}
              </button>
            ))}
          </div>
        </div>

        {/* Compatibility Filter */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Compatibility
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => handleCompatibilityToggle('goodWithKids')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${
                filters.goodWithKids
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-slate-700 hover:bg-gray-200'
              }`}
            >
              {filters.goodWithKids ? (
                <Check className="w-4 h-4" />
              ) : (
                <Baby className="w-4 h-4" />
              )}
              Good with Kids
            </button>
            <button
              onClick={() => handleCompatibilityToggle('goodWithDogs')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${
                filters.goodWithDogs
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-slate-700 hover:bg-gray-200'
              }`}
            >
              {filters.goodWithDogs ? (
                <Check className="w-4 h-4" />
              ) : (
                <Dog className="w-4 h-4" />
              )}
              Good with Dogs
            </button>
            <button
              onClick={() => handleCompatibilityToggle('goodWithCats')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${
                filters.goodWithCats
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-slate-700 hover:bg-gray-200'
              }`}
            >
              {filters.goodWithCats ? (
                <Check className="w-4 h-4" />
              ) : (
                <Cat className="w-4 h-4" />
              )}
              Good with Cats
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <button
            onClick={handleClearAll}
            className="flex-1 px-6 py-3 rounded-xl font-medium border-2 border-slate-900 text-slate-900 hover:bg-gray-50 transition-colors"
          >
            Clear All
          </button>
          <button
            onClick={onApply}
            className="flex-1 px-6 py-3 rounded-xl font-medium bg-slate-900 text-white hover:bg-slate-800 transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}

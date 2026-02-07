'use client';

import { useState } from 'react';
import { Pet } from '@/lib/adapters/base';
import { X, Sparkles, Loader2, Check } from 'lucide-react';
import { generatePetBio } from '@/lib/services/ai';

interface Props {
  onSave: (pet: Pet) => void;
  onCancel: () => void;
}

const PREDEFINED_TAGS = [
  'Good with Kids', 'Good with Cats', 'Good with Dogs',
  'House Trained', 'Leash Trained', 'Crate Trained',
  'High Energy', 'Couch Potato', 'Special Needs'
];

export default function PetIntakeForm({ onSave, onCancel }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    breed: '',
    age: '',
    sex: 'Male' as 'Male' | 'Female',
    size: 'Medium', // New field for Size
    imageUrl: '',
    description: '',
    arrivalDate: new Date().toISOString().split('T')[0], // Default to today
  });

  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleGenerateBio = async () => {
    if (!formData.name || !formData.breed) {
      alert("Please enter a Name and Breed first!");
      return;
    }

    setIsGenerating(true);
    // Pass structured data to AI for better results
    const contextTags = [...selectedTags, formData.size, formData.sex];
    const bio = await generatePetBio(formData.name, formData.breed, contextTags);
    
    setFormData(prev => ({ ...prev, description: bio }));
    setIsGenerating(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Calculate days in shelter
    const arrival = new Date(formData.arrivalDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - arrival.getTime());
    const daysInShelter = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

    // Combine Size into tags for the filter engine
    const finalTags = [...selectedTags, formData.size];

    const newPet: Pet = {
      id: Math.random().toString(),
      name: formData.name,
      breed: formData.breed,
      age: formData.age,
      imageUrl: formData.imageUrl || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800',
      status: 'Available',
      sex: formData.sex,
      description: formData.description,
      tags: finalTags,
      daysInShelter: daysInShelter,
      location: 'User Submitted'
    };

    onSave(newPet);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex justify-between items-center z-10">
          <h2 className="text-2xl font-black text-slate-900">Intake New Pet</h2>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full transition">
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Row 1: Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Name</label>
              <input required type="text" className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Breed</label>
              <input required type="text" className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.breed} onChange={e => setFormData({...formData, breed: e.target.value})} />
            </div>
          </div>

          {/* Row 2: Demographics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Age</label>
              <input required placeholder="e.g. 2 years" type="text" className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Sex</label>
              <select className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                value={formData.sex} onChange={e => setFormData({...formData, sex: e.target.value as 'Male' | 'Female'})}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Size</label>
              <select className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                value={formData.size} onChange={e => setFormData({...formData, size: e.target.value})}>
                <option value="Small">Small</option>
                <option value="Medium">Medium</option>
                <option value="Large">Large</option>
                <option value="Giant">Giant</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Arrival Date</label>
              <input type="date" className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.arrivalDate} onChange={e => setFormData({...formData, arrivalDate: e.target.value})} />
            </div>
          </div>

          {/* Row 3: Image */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Photo URL</label>
            <input type="url" placeholder="https://..." className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} />
          </div>

          {/* Row 4: Tags (Checkboxes) */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Characteristics</label>
            <div className="flex flex-wrap gap-2">
              {PREDEFINED_TAGS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition ${
                    selectedTags.includes(tag) 
                      ? 'bg-slate-900 text-white border-slate-900' 
                      : 'bg-white text-slate-600 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {tag} {selectedTags.includes(tag) && <Check size={12} className="inline ml-1" />}
                </button>
              ))}
            </div>
          </div>

          {/* Row 5: AI Description */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-bold text-gray-700">Bio / Description</label>
              <button 
                type="button"
                onClick={handleGenerateBio}
                disabled={isGenerating}
                className="flex items-center gap-2 text-xs font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-full hover:bg-purple-100 transition disabled:opacity-50"
              >
                {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Generate with AI
              </button>
            </div>
            <textarea 
              rows={4} 
              className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.description} 
              onChange={e => setFormData({...formData, description: e.target.value})} 
            />
          </div>

          {/* Footer Actions */}
          <div className="flex gap-4 pt-4 border-t border-gray-100">
            <button type="button" onClick={onCancel} className="flex-1 py-3 font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition">
              Cancel
            </button>
            <button type="submit" className="flex-1 py-3 font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition shadow-lg shadow-slate-200">
              Save Pet
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
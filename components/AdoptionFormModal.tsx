'use client';

import { useState } from 'react';
import { X, CheckCircle, Home, User, Heart } from 'lucide-react';
import { Pet } from '@/lib/adapters/base';

interface Props {
  pet: Pet;
  onClose: () => void;
}

export default function AdoptionFormModal({ pet, onClose }: Props) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setStep(3); // Go to success screen
    }, 1500);
  };

  if (step === 3) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in">
        <div className="bg-white rounded-3xl w-full max-w-md p-8 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-green-500"></div>
          <div className="mx-auto w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
            <CheckCircle size={40} />
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-2">Request Sent!</h2>
          <p className="text-gray-500 mb-8">
            The shelter has received your inquiry for <strong>{pet.name}</strong>. Check your email for next steps.
          </p>
          <button onClick={onClose} className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition">
            Back to Browsing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-50 p-6 border-b border-gray-100 flex justify-between items-center">
          <div>
             <h2 className="text-xl font-black text-slate-900">Adopt {pet.name}</h2>
             <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Step {step} of 2</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition"><X size={20} /></button>
        </div>

        {/* Form Body */}
        <div className="p-8 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {step === 1 && (
              <div className="space-y-4 animate-in slide-in-from-right duration-300">
                <div className="flex items-center gap-3 mb-6 p-4 bg-blue-50 text-blue-800 rounded-xl border border-blue-100">
                    <User size={24} />
                    <p className="text-sm font-bold">First, tell us who you are.</p>
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
                    <input required className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none font-medium" placeholder="Jane Doe" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Email Address</label>
                    <input required type="email" className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none font-medium" placeholder="jane@example.com" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Phone Number</label>
                    <input required type="tel" className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none font-medium" placeholder="(555) 123-4567" />
                </div>
                <button type="button" onClick={() => setStep(2)} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold mt-4 hover:bg-slate-800 transition">
                  Next Step
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-in slide-in-from-right duration-300">
                 <div className="flex items-center gap-3 mb-6 p-4 bg-purple-50 text-purple-800 rounded-xl border border-purple-100">
                    <Home size={24} />
                    <p className="text-sm font-bold">A bit about your home.</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                     <label className="border border-gray-200 p-4 rounded-xl cursor-pointer hover:border-slate-900 transition has-[:checked]:border-slate-900 has-[:checked]:bg-slate-50">
                        <input type="radio" name="home" className="hidden" />
                        <span className="block font-bold text-slate-900">House</span>
                        <span className="text-xs text-gray-500">I have a yard</span>
                     </label>
                     <label className="border border-gray-200 p-4 rounded-xl cursor-pointer hover:border-slate-900 transition has-[:checked]:border-slate-900 has-[:checked]:bg-slate-50">
                        <input type="radio" name="home" className="hidden" />
                        <span className="block font-bold text-slate-900">Apartment</span>
                        <span className="text-xs text-gray-500">No yard / Balcony</span>
                     </label>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Do you have other pets?</label>
                    <select className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none font-medium bg-white">
                        <option>No, none</option>
                        <option>Yes, Dogs</option>
                        <option>Yes, Cats</option>
                        <option>Yes, Both</option>
                    </select>
                </div>

                <div className="pt-4 flex gap-3">
                    <button type="button" onClick={() => setStep(1)} className="px-6 py-4 border border-gray-300 text-slate-700 rounded-xl font-bold hover:bg-gray-50 transition">
                        Back
                    </button>
                    <button type="submit" disabled={isSubmitting} className="flex-1 bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition flex items-center justify-center gap-2">
                        {isSubmitting ? 'Sending...' : 'Submit Application'}
                    </button>
                </div>
              </div>
            )}

          </form>
        </div>

      </div>
    </div>
  );
}
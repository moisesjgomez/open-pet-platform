'use client'; // Client side because it has user interaction (clicks/typing)

import { X } from 'lucide-react';
import { useState } from 'react';

interface Props {
  petName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function AdoptionModal({ petName, isOpen, onClose }: Props) {
  // If the modal is closed, don't render anything
  if (!isOpen) return null;

  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // Stop page from refreshing
    // In a real app, you would send this data to Azure/Email here
    setSubmitted(true);
  };

  return (
    // The dark background overlay
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      
      {/* The Modal Box */}
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-slate-900 p-6 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Adopt {petName}</h2>
          <button onClick={onClose} className="text-white/70 hover:text-white transition">
            <X size={24} />
          </button>
        </div>

        {/* The Content */}
        <div className="p-6">
          {submitted ? (
            // Success Message
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                🎉
              </div>
              <h3 className="text-xl font-bold text-gray-900">Request Sent!</h3>
              <p className="text-gray-500 mt-2">
                The shelter will contact you shortly about meeting {petName}.
              </p>
              <button onClick={onClose} className="mt-6 w-full bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200">
                Close
              </button>
            </div>
          ) : (
            // The Form
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-gray-600 text-sm mb-4">
                Fill this out to schedule a meet-and-greet with {petName}.
              </p>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Your Name</label>
                <input required type="text" className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-slate-900 outline-none transition" placeholder="John Doe" />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Email Address</label>
                <input required type="email" className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-slate-900 outline-none transition" placeholder="john@example.com" />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Message (Optional)</label>
                <textarea className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-slate-900 outline-none transition" rows={3} placeholder="I have a fenced yard and..." />
              </div>

              <button type="submit" className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition shadow-lg mt-2">
                Send Request
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
'use client'; // <--- Allows interactivity

import { useState } from 'react';
import AdoptionModal from './AdoptionModal';

export default function PetActionButtons({ petName }: { petName: string }) {
  const [isModalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-3">
        <button 
          onClick={() => setModalOpen(true)}
          className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-slate-800 transition shadow-lg shadow-slate-900/20"
        >
          Adopt {petName}
        </button>
        <button className="w-full bg-white border-2 border-slate-900 text-slate-900 py-4 rounded-xl font-bold text-lg hover:bg-gray-50 transition">
          Sponsor This Pet
        </button>
      </div>

      {/* The Modal lives here, hidden until 'isModalOpen' is true */}
      <AdoptionModal 
        petName={petName} 
        isOpen={isModalOpen} 
        onClose={() => setModalOpen(false)} 
      />
    </>
  );
}
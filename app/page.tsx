import { PetRepository } from '@/lib/repository'; // <--- The Fix: Use the Central Brain
import Link from 'next/link';
import { PawPrint } from 'lucide-react';
import PetExplorer from '@/components/PetExplorer';
import UrgentBanner from '@/components/UrgentBanner';

export default async function Home() {
  
  // 1. Instantiate the Repository (The Single Source of Truth)
  const repo = new PetRepository();
  
  // 2. Fetch the "Smart" pets (includes AI tags automatically)
  const pets = await repo.getSmartPets();

  return (
    <main className="min-h-screen bg-gray-50">
      
      {/* HERO SECTION */}
      <div className="bg-slate-900 text-white py-20 px-6 text-center relative overflow-hidden pb-32">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-10 left-10 w-64 h-64 bg-teal-500 rounded-full blur-3xl"></div>
            <div className="absolute bottom-10 right-10 w-64 h-64 bg-blue-500 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6">
            Find Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500">New Best Friend</span>
          </h1>
          <p className="text-xl text-gray-400 mb-10 leading-relaxed">
            Search, filter, or swipe to find the perfect pet.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/swipe" 
              className="px-8 py-4 bg-white text-slate-900 rounded-full font-bold text-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 shadow-xl"
            >
              <PawPrint size={20} className="text-teal-600" />
              Start Swiping
            </Link>
            <Link 
              href="/#explore" 
              className="px-8 py-4 bg-white/10 text-white border border-white/20 rounded-full font-bold text-lg hover:bg-white/20 transition-colors flex items-center justify-center gap-2 backdrop-blur-sm"
            >
              Browse All Pets
            </Link>
          </div>
        </div>
      </div>

      {/* 2. THE HERO CAROUSEL */}
      <UrgentBanner pets={pets} />

      {/* 3. THE EXPLORER */}
      <PetExplorer initialPets={pets} />

    </main>
  );
}
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, Dog, Cat, Heart } from 'lucide-react';
import UserMenu from './UserMenu';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          
          {/* NEW LOGO SECTION */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 group">
              {/* The Icon: A Dog and Cat sitting together */}
              <div className="bg-orange-100 p-2 rounded-xl group-hover:bg-orange-200 transition-colors flex items-center -space-x-1">
                <Dog size={24} className="text-orange-600 z-10" />
                <Cat size={20} className="text-amber-500" />
              </div>
              
              <span className="text-2xl font-black text-slate-800 tracking-tight group-hover:text-orange-600 transition-colors">
                OpenRescue
              </span>
            </Link>
          </div>

          {/* DESKTOP MENU */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-slate-600 hover:text-orange-600 font-bold text-lg transition">Find a Pet</Link>
            <Link href="/swipe" className="text-slate-600 hover:text-orange-600 font-bold text-lg transition">Play Match</Link>
            <Link href="/shortlist" className="flex items-center gap-2 text-slate-600 hover:text-red-500 font-bold text-lg transition">
              <Heart size={20} />
              Shortlist
            </Link>
            <UserMenu />
          </div>

          {/* MOBILE MENU BUTTON */}
          <div className="flex items-center gap-4 md:hidden">
            <UserMenu />
            <button onClick={() => setIsOpen(!isOpen)} className="text-slate-600 hover:text-slate-900 p-2">
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE DROPDOWN */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 p-4 space-y-4 shadow-xl">
          <Link href="/" onClick={() => setIsOpen(false)} className="block px-4 py-3 rounded-xl bg-gray-50 text-slate-900 font-bold">Find a Pet</Link>
          <Link href="/swipe" onClick={() => setIsOpen(false)} className="block px-4 py-3 rounded-xl hover:bg-gray-50 text-slate-600 font-bold">Play Match</Link>
          <Link href="/shortlist" onClick={() => setIsOpen(false)} className="flex items-center gap-2 px-4 py-3 rounded-xl hover:bg-gray-50 text-slate-600 font-bold">
            <Heart size={20} />
            Shortlist
          </Link>
        </div>
      )}
    </nav>
  );
}
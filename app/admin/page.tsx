'use client';

import { useState, useEffect } from 'react';
import { Pet } from '@/lib/adapters/base';
import { MockAdapter } from '@/lib/adapters/mock';
import { Plus, CheckCircle, Trash2, Archive, TrendingUp, AlertCircle, Home } from 'lucide-react';
import Image from 'next/image';
import PetIntakeForm from '@/components/PetIntakeForm'; // <--- Import the new component

export default function AdminPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [isAdding, setIsAdding] = useState(false); // Controls if the modal is open
  
  // STATS STATE
  const [stats, setStats] = useState({
    total: 0,
    adopted: 0,
    urgent: 0,
    adoptionRate: 0
  });

  useEffect(() => {
    const load = async () => {
      const adapter = new MockAdapter();
      const data = await adapter.getAllPets();
      setPets(data);
      calculateStats(data);
    };
    load();
  }, []);

  const calculateStats = (data: Pet[]) => {
    const total = data.length;
    const adopted = data.filter(p => p.status === 'Adopted').length;
    const urgent = data.filter(p => p.status === 'Available' && p.daysInShelter > 30).length;
    const rate = total > 0 ? Math.round((adopted / total) * 100) : 0;
    setStats({ total, adopted, urgent, adoptionRate: rate });
  };

  const handleMarkAdopted = (id: string) => {
    if (confirm('Mark this pet as successfully adopted?')) {
      const updatedList = pets.map(pet => 
        pet.id === id ? { ...pet, status: 'Adopted' as const } : pet
      );
      setPets(updatedList);
      calculateStats(updatedList);
    }
  };

  // Logic to handle the new pet coming from the Form Component
  const handlePetSave = (newPet: Pet) => {
    const updatedList = [newPet, ...pets];
    setPets(updatedList);
    calculateStats(updatedList);
    setIsAdding(false); // Close the modal
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900">Shelter Overview</h1>
            <p className="text-gray-500">Real-time shelter performance metrics.</p>
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition flex items-center gap-2 shadow-lg shadow-slate-200"
          >
            <Plus size={20} /> Intake New Pet
          </button>
        </div>

        {/* ANALYTICS HUD */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-4">
            <div className="p-4 bg-blue-50 text-blue-600 rounded-xl"><Home size={28} /></div>
            <div>
              <p className="text-gray-400 font-bold text-xs uppercase tracking-wider">Total Inventory</p>
              <h3 className="text-3xl font-black text-slate-900">{stats.total} <span className="text-sm text-gray-400 font-normal">pets</span></h3>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-4">
            <div className="p-4 bg-green-50 text-green-600 rounded-xl"><TrendingUp size={28} /></div>
            <div>
              <p className="text-gray-400 font-bold text-xs uppercase tracking-wider">Adoption Rate</p>
              <h3 className="text-3xl font-black text-slate-900">{stats.adoptionRate}% <span className="text-sm text-gray-400 font-normal">success</span></h3>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-4">
            <div className="p-4 bg-red-50 text-red-600 rounded-xl"><AlertCircle size={28} /></div>
            <div>
              <p className="text-gray-400 font-bold text-xs uppercase tracking-wider">Urgent Action</p>
              <h3 className="text-3xl font-black text-slate-900">{stats.urgent} <span className="text-sm text-gray-400 font-normal">need homes</span></h3>
            </div>
          </div>
        </div>

        {/* INVENTORY TABLE */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-4 text-sm font-bold text-gray-500 uppercase">Pet</th>
                <th className="p-4 text-sm font-bold text-gray-500 uppercase">Status</th>
                <th className="p-4 text-sm font-bold text-gray-500 uppercase">Time in Care</th>
                <th className="p-4 text-sm font-bold text-gray-500 uppercase text-right">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pets.map(pet => (
                <tr key={pet.id} className={`transition ${pet.status === 'Adopted' ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'}`}>
                  <td className="p-4 flex items-center gap-4">
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-200">
                      <Image src={pet.imageUrl} alt={pet.name} fill className="object-cover" />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">{pet.name}</div>
                      <div className="text-xs text-gray-500">{pet.breed}</div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold 
                      ${pet.status === 'Available' ? 'bg-green-100 text-green-700' : 
                        pet.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 
                        'bg-gray-200 text-gray-600'}`}>
                      {pet.status}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-600">
                    <span className={pet.daysInShelter > 30 ? 'text-red-600 font-bold' : ''}>
                      {pet.daysInShelter} Days
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {pet.status !== 'Adopted' ? (
                        <button onClick={() => handleMarkAdopted(pet.id)} className="px-4 py-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition font-bold text-xs flex items-center gap-2 ml-auto">
                           <CheckCircle size={16} /> Mark Adopted
                        </button>
                    ) : (
                        <span className="text-xs font-bold text-gray-400 flex items-center justify-end gap-1"><Archive size={14} /> Archived</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RENDER THE NEW FORM COMPONENT HERE */}
      {isAdding && (
        <PetIntakeForm 
            onSave={handlePetSave} 
            onCancel={() => setIsAdding(false)} 
        />
      )}
    </div>
  );
}
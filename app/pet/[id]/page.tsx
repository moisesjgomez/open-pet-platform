import { PetRepository } from '@/lib/repository';
import PetProfileClient from '@/components/PetProfileClient';
import Link from 'next/link';

export default async function PetProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = new PetRepository();
  const pet = await repo.getPetById(id);

  if (!pet) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center p-6">
        <h1 className="text-4xl font-black text-slate-900 mb-2">Uh oh!</h1>
        <p className="text-gray-500 mb-8">We couldn't find that pet. They may have been adopted!</p>
        <Link href="/" className="px-8 py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition">
          Back to Shelter
        </Link>
      </div>
    );
  }

  return <PetProfileClient pet={pet} />;
}

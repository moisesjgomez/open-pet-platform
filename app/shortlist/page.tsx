import { PetRepository } from '@/lib/repository';
import Link from 'next/link';
import ShortlistClient from '@/components/ShortlistClient';

export default async function ShortlistPage() {
  const repo = new PetRepository();
  const allPets = await repo.getSmartPets();

  return <ShortlistClient allPets={allPets} />;
}

// app/api/pets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PetRepository } from '@/lib/repository';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const location = searchParams.get('location');
  const distance = searchParams.get('distance');
  const type = searchParams.get('type') as 'Dog' | 'Cat' | null;

  const repo = new PetRepository();

  try {
    let pets;

    if (location && repo.isLocationSearchEnabled()) {
      // Location-based search (Petfinder)
      pets = await repo.searchByLocation({
        location,
        distance: distance ? parseInt(distance) : 50,
        type: type || undefined,
      });
    } else {
      // Default: get all pets
      pets = await repo.getSmartPets();
    }

    return NextResponse.json({
      pets,
      locationSearchEnabled: repo.isLocationSearchEnabled(),
    });
  } catch (error) {
    console.error('Error fetching pets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pets', pets: [], locationSearchEnabled: false },
      { status: 500 }
    );
  }
}

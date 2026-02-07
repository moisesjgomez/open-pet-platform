// lib/adapters/base.ts

// 1. The "Interface" (The Shape of the Data)
// We are saying: "Every single pet MUST have these fields."
export interface Pet {
  id: string;
  name: string;
  breed: string;
  status: 'Available' | 'Pending' | 'Adopted'; // It can ONLY be one of these 3 words
  sex: 'Male' | 'Female';
  age: string;
  imageUrl: string;
  description: string;
  tags: string[];
  daysInShelter: number;
  location: string; // NEW: Location field
  
  // NEW: Gallery Support
  images?: string[];

  // NEW: Structured Data for Filters
  energyLevel?: 'Low' | 'Moderate' | 'High';
  size?: 'Small' | 'Medium' | 'Large' | 'Extra Large';
  compatibility?: {
    kids: boolean;
    dogs: boolean;
    cats: boolean;
  };
}

// 2. The "Contract" (The Rule for Data Sources)
// We are saying: "Any data source (Mock or Real) MUST have a function called getAllPets."
export interface PetDataSource {
  getAllPets(): Promise<Pet[]>;
  getPet(id: string): Promise<Pet | null>;
}
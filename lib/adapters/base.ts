// lib/adapters/base.ts

// Organization/Shelter Information
export interface Organization {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  website?: string;
  adoptionPolicy?: string;
  hours?: string;
}

// Health Information
export interface HealthInfo {
  spayedNeutered: boolean;
  vaccinated: boolean;
  microchipped: boolean;
  specialNeeds: boolean;
  specialNeedsDescription?: string;
}

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
  location: string;
  
  // Gallery Support
  images?: string[];
  
  // Distance from user (for location-based search)
  distance?: number;

  // Physical Traits
  energyLevel?: 'Low' | 'Moderate' | 'High';
  size?: 'Small' | 'Medium' | 'Large' | 'Extra Large';
  color?: string;
  coatLength?: 'Hairless' | 'Short' | 'Medium' | 'Long';
  
  // Compatibility
  compatibility?: {
    kids: boolean | null;
    dogs: boolean | null;
    cats: boolean | null;
    otherAnimals?: boolean | null;
  };
  
  // Health Information
  health?: HealthInfo;
  
  // Care & Behavior
  houseTrained?: boolean;
  declawed?: boolean; // For cats
  goodOnLeash?: boolean; // For dogs
  crateTrainer?: boolean;
  specialDiet?: boolean;
  
  // Organization/Shelter
  organization?: Organization;
}

// 2. The "Contract" (The Rule for Data Sources)
// We are saying: "Any data source (Mock or Real) MUST have a function called getAllPets."
export interface PetDataSource {
  getAllPets(): Promise<Pet[]>;
  getPet(id: string): Promise<Pet | null>;
}
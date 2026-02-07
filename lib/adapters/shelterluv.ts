import { Pet, PetDataSource } from './base';

// 1. THE MESSY SHELTERLUV DATA (What their API actually looks like)
interface ShelterluvResponse {
  animals: {
    ID: string;
    Name: string;
    Breed: string;
    Sex: string;
    Age: number; // They store age in months usually
    Description: string;
    Photos: string[]; // Array of URLs
    Attributes: {
      AttributeName: string; // e.g., "Good with Cats"
    }[];
    Status: string; // "Available For Adoption"
    LastUpdated: string;
  }[];
}

export class ShelterluvAdapter implements PetDataSource {
  private apiUrl: string;
  private shelterId: string;

  constructor(shelterId: string) {
    this.shelterId = shelterId;
    this.apiUrl = `https://www.shelterluv.com/api/v1/animals`;
  }

  // 2. THE TRANSLATOR (Mapping their messy data to our clean App)
  private mapToAppPet(slAnimal: any): Pet {
    // Logic to calculate readable age from months
    const years = Math.floor(slAnimal.Age / 12);
    const months = slAnimal.Age % 12;
    const ageString = years > 0 ? `${years} years` : `${months} months`;

    // 1. Get raw tags from Shelterluv attributes
    let tags = slAnimal.Attributes.map((attr: any) => attr.AttributeName);

    // 2. "AI ENRICHMENT" (The Headless Cleaner)
    // We scan the description to auto-generate tags missing from the raw data
    const desc = (slAnimal.Description || "").toLowerCase();
    
    // Heuristics to add smart tags
    if (desc.includes('run') || desc.includes('hike') || desc.includes('active') || desc.includes('play')) {
      tags.push('High Energy');
    }
    if (desc.includes('couch') || desc.includes('relax') || desc.includes('calm') || desc.includes('nap')) {
      tags.push('Chill');
    }
    if (desc.includes('kid') || desc.includes('family') || desc.includes('child')) {
      tags.push('Good with Kids');
    }
    if (desc.includes('senior') || years >= 8) {
      tags.push('Senior');
    }
    if (desc.includes('smart') || desc.includes('train')) {
      tags.push('Smart');
    }

    // Deduplicate tags (remove if "High Energy" appears twice)
    tags = Array.from(new Set(tags));

    // Fix Name Capitalization (e.g., "BRUNO" -> "Bruno")
    const fixedName = slAnimal.Name.charAt(0).toUpperCase() + slAnimal.Name.slice(1).toLowerCase();

    // --- NEW: AI ENRICHMENT FOR STRUCTURED DATA ---
    
    // 1. Energy Level Heuristics
    let energy: 'Low' | 'Moderate' | 'High' = 'Moderate';
    if (desc.includes('run') || desc.includes('hike') || desc.includes('active') || desc.includes('play')) energy = 'High';
    if (desc.includes('couch') || desc.includes('relax') || desc.includes('calm') || desc.includes('nap') || years >= 8) energy = 'Low';

    // 2. Size Heuristics
    let size: 'Small' | 'Medium' | 'Large' | 'Extra Large' = 'Medium';
    if (desc.includes('small') || desc.includes('tiny') || desc.includes('lap') || slAnimal.Breed.includes('Chihuahua') || slAnimal.Breed.includes('Terrier')) size = 'Small';
    if (desc.includes('large') || desc.includes('big') || desc.includes('giant') || slAnimal.Breed.includes('Shepherd') || slAnimal.Breed.includes('Retriever')) size = 'Large';
    
    // 3. Compatibility Heuristics (Check Attributes AND Description)
    const attrNames = slAnimal.Attributes.map((a: any) => a.AttributeName.toLowerCase());
    const kids = attrNames.some((a: string) => a.includes('kid') || a.includes('child')) || desc.includes('kid') || desc.includes('family');
    const dogs = attrNames.some((a: string) => a.includes('dog')) || desc.includes('dog') || desc.includes('playgroup');
    const cats = attrNames.some((a: string) => a.includes('cat')) || desc.includes('cat') || desc.includes('kitten');

    return {
      id: slAnimal.ID,
      name: fixedName,
      breed: slAnimal.Breed,
      sex: slAnimal.Sex === 'Male' ? 'Male' : 'Female',
      age: ageString,
      // Map their status string to our simple 'Available' | 'Pending' | 'Adopted'
      status: slAnimal.Status === 'Available For Adoption' ? 'Available' : 'Pending',
      // Fallback if they have no photos
      imageUrl: slAnimal.Photos[0] || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800', 
      images: slAnimal.Photos && slAnimal.Photos.length > 0 ? slAnimal.Photos : ['https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800'],
      // Clean HTML tags from description if present
      description: slAnimal.Description.replace(/<[^>]*>?/gm, '') || 'No description provided.',
      tags: tags,
      // Calculate days based on LastUpdated timestamp
      daysInShelter: Math.floor((Date.now() - new Date(slAnimal.LastUpdated).getTime()) / (1000 * 60 * 60 * 24)),
      location: 'Partner Shelter',
      
      // NEW FIELDS
      energyLevel: energy,
      size: size,
      compatibility: { kids, dogs, cats }
    };
  }

  // 3. THE FETCH (Real API + Fallback)
  async getAllPets(): Promise<Pet[]> {
    // A. TRY REAL API
    if (process.env.SHELTERLUV_API_KEY) {
      try {
        const response = await fetch(`${this.apiUrl}?status_type=publishable`, {
          headers: { 'X-API-Key': process.env.SHELTERLUV_API_KEY },
          next: { revalidate: 3600 } // Cache for 1 hour
        });

        if (response.ok) {
          const data: ShelterluvResponse = await response.json();
          return data.animals.map(animal => this.mapToAppPet(animal));
        }
      } catch (error) {
        console.error("Shelterluv API failed, falling back to mock data.", error);
      }
    }

    // B. FALLBACK MOCK DATA (If no key or API fails)
    // Simulate network delay (500ms)
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock Raw Data that mimics Shelterluv's actual structure
    const mockRawData = [
      {
        ID: 'SL-101',
        Name: 'BRUNO', // Bad data: All caps
        Breed: 'Mix / Terrier',
        Sex: 'Male',
        Age: 36, // 36 months = 3 years
        Description: '<b>Bruno</b> is a good boy who loves to run and hike all day.', // HTML + Keywords for AI
        Photos: ['https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=800'],
        Attributes: [{ AttributeName: 'Good with Dogs' }], // Missing 'High Energy' in attributes
        Status: 'Available For Adoption',
        LastUpdated: '2024-11-01'
      },
      {
        ID: 'SL-102',
        Name: 'princess', // Bad data: Lowercase
        Breed: 'Domestic Short Hair',
        Sex: 'Female',
        Age: 4, 
        Description: 'Loves tuna and napping on the couch.', // Keyword: couch -> Chill
        Photos: ['https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=800'],
        Attributes: [{ AttributeName: 'Indoor Only' }],
        Status: 'Available For Adoption',
        LastUpdated: '2024-12-05'
      }
    ];

    // Run the mapper on every animal found
    return mockRawData.map(animal => this.mapToAppPet(animal));
  }

  // Fetch single pet by ID
  async getPet(id: string): Promise<Pet | null> {
    const all = await this.getAllPets();
    return all.find(p => p.id === id) || null;
  }
}
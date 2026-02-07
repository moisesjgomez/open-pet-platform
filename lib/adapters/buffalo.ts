import { Pet, PetDataSource } from './base';

// 1. THE RAW DATA (Montgomery County Open Data Structure)
// Endpoint: https://data.montgomerycountymd.gov/resource/e54u-qx42.json
interface MontgomeryAnimal {
  animalid: string;
  petname: string; // "LEO"
  animaltype: string; // "CAT", "DOG"
  breed: string; // "DOMESTIC SH"
  petage: string; // "1 YEAR 9 MONTHS"
  petsize: string; // "SMALL"
  sex: string; // "N" (Neutered?), "M", "F"
  color: string;
  indate: string; // "2025-12-08T00:00:00.000"
  url?: {
    url: string; // "http://www.petharbor.com/..."
  };
}

export class BuffaloAdapter implements PetDataSource {
  private apiUrl: string;

  constructor() {
    // Switched to Montgomery County, MD because they provide NAMES and IMAGES
    // We keep the class name 'BuffaloAdapter' to avoid breaking the Repository import
    this.apiUrl = `https://data.montgomerycountymd.gov/resource/e54u-qx42.json`;
  }

  private mapToAppPet(animal: MontgomeryAnimal): Pet {
    // 1. Clean Name
    let name = animal.petname || "";
    name = name.replace('*', ''); // Remove leading asterisks often found in shelter data
    // Capitalize nicely
    name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();

    // 2. Synthesize Description (MARKED AS SYNTHETIC - no real personality data)
    let syntheticDesc = `Meet ${name}, a ${animal.petage.toLowerCase()} ${animal.breed.toLowerCase()}. `;
    syntheticDesc += `This ${animal.petsize.toLowerCase()} ${animal.animaltype.toLowerCase()} has a beautiful ${animal.color.toLowerCase()} coat. `;
    syntheticDesc += `Currently waiting for a forever home at the adoption center.`;

    // 3. Basic Tags ONLY - no fake personality traits from breed stereotypes
    let tags: string[] = [];

    // Basic Type Tags
    if (animal.animaltype === 'DOG') tags.push('Dog');
    if (animal.animaltype === 'CAT') tags.push('Cat');

    // Size tag
    if (animal.petsize === 'SMALL') tags.push('Small');
    if (animal.petsize === 'MEDIUM') tags.push('Medium');
    if (animal.petsize === 'LARGE') tags.push('Large');
    if (animal.petsize === 'X-LARGE') tags.push('Extra Large');

    // Age-Based Traits (factual, not personality)
    const ageNum = parseInt(animal.petage);
    if (animal.petage.includes('MONTH') || (ageNum < 1 && animal.petage.includes('YEAR') === false)) {
        tags.push('Puppy/Kitten');
    } else if (ageNum >= 8) {
        tags.push('Senior');
    } else if (ageNum >= 2 && ageNum < 8) {
        tags.push('Adult');
    } else {
        tags.push('Young');
    }

    // Color/Pattern (visual facts, not personality)
    if (animal.color.includes('TABBY')) tags.push('Tabby');
    if (animal.color.includes('CALICO')) tags.push('Calico');
    if (animal.color.includes('TORTIE')) tags.push('Tortoiseshell');
    if (animal.color.includes('TUXEDO')) tags.push('Tuxedo');

    tags = Array.from(new Set(tags));

    // 4. Structured Fields (factual only)
    let energy: 'Low' | 'Moderate' | 'High' = 'Moderate'; // Default, unknown
    // Seniors tend to be calmer
    if (ageNum >= 8) energy = 'Low';
    // Puppies/kittens tend to be more energetic
    if (animal.petage.includes('MONTH')) energy = 'High';

    let size: 'Small' | 'Medium' | 'Large' | 'Extra Large' = 'Medium';
    if (animal.petsize === 'SMALL') size = 'Small';
    if (animal.petsize === 'LARGE') size = 'Large';
    if (animal.petsize === 'X-LARGE') size = 'Extra Large';

    // 5. Image Handling
    // Use real image if available, otherwise fallback
    let imageUrl = animal.url?.url;
    if (imageUrl) {
        // Upgrade to HTTPS and remove www to avoid redirects/issues
        imageUrl = imageUrl.replace('http://', 'https://').replace('www.petharbor.com', 'petharbor.com');
    } else {
       const dogImages = [
        'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800',
        'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=800'
      ];
      const catImages = [
        'https://images.unsplash.com/photo-1529778873920-4da4926a7071?auto=format&fit=crop&w=800',
        'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800'
      ];
      const imgArray = animal.animaltype === 'CAT' ? catImages : dogImages;
      imageUrl = imgArray[animal.animalid.charCodeAt(animal.animalid.length - 1) % imgArray.length];
    }

    return {
      id: animal.animalid,
      name: name,
      breed: animal.breed,
      sex: animal.sex === 'F' ? 'Female' : 'Male',
      age: animal.petage,
      status: 'Available',
      imageUrl: imageUrl,
      images: [imageUrl], // Single image from API - AI can analyze for personality
      description: syntheticDesc,
      shelterNotes: undefined, // No real shelter notes available from this API
      isSyntheticDescription: true, // Mark as synthetic - don't extract fake personality traits
      tags: tags,
      daysInShelter: Math.floor((Date.now() - new Date(animal.indate).getTime()) / (1000 * 60 * 60 * 24)),
      location: 'Montgomery County Animal Services, MD',
      energyLevel: energy,
      size: size,
      compatibility: { kids: null, dogs: null, cats: null } // Unknown - don't assume
    };
  }

  async getAllPets(): Promise<Pet[]> {
    try {
      const response = await fetch(`${this.apiUrl}?$limit=50`, {
        next: { revalidate: 3600 }
      });

      if (!response.ok) throw new Error("Failed to fetch Montgomery data");

      const data: MontgomeryAnimal[] = await response.json();
      
      // FILTER: Only return pets that have a name
      // "if there are some with names and some without, delete all those without names"
      const validPets = data.filter(p => p.petname && p.petname.trim().length > 0);

      return validPets.map(animal => this.mapToAppPet(animal));
    } catch (error) {
      console.error("Open Data API failed", error);
      return [];
    }
  }

  async getPet(id: string): Promise<Pet | null> {
    try {
      const response = await fetch(`${this.apiUrl}?animalid=${id}`, {
        next: { revalidate: 3600 }
      });

      if (!response.ok) return null;
      const data: MontgomeryAnimal[] = await response.json();
      if (data.length === 0) return null;

      return this.mapToAppPet(data[0]);
    } catch (error) {
      return null;
    }
  }
}

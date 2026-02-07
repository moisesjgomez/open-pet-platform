// lib/adapters/petfinder.ts
import { Client } from '@petfinder/petfinder-js';
import { Pet, PetDataSource, Organization, HealthInfo } from './base';

// Petfinder API response types
interface PetfinderAnimal {
  id: number;
  name: string;
  species: string;
  breeds: {
    primary: string | null;
    secondary: string | null;
    mixed: boolean;
  };
  age: string;
  gender: string;
  size: string;
  status: string;
  description: string | null;
  photos: Array<{
    small: string;
    medium: string;
    large: string;
    full: string;
  }>;
  tags: string[];
  environment: {
    children: boolean | null;
    dogs: boolean | null;
    cats: boolean | null;
  };
  attributes: {
    spayed_neutered: boolean | null;
    house_trained: boolean | null;
    declawed: boolean | null;
    special_needs: boolean | null;
    shots_current: boolean | null;
  };
  colors: {
    primary: string | null;
    secondary: string | null;
    tertiary: string | null;
  };
  coat: string | null;
  contact: {
    email: string | null;
    phone: string | null;
    address: {
      address1: string | null;
      address2: string | null;
      city: string;
      state: string;
      postcode: string;
      country: string;
    };
  };
  organization_id: string;
  distance?: number;
  published_at: string;
}

interface PetfinderOrganization {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: {
    address1: string | null;
    city: string;
    state: string;
    postcode: string;
  };
  hours: {
    monday: string | null;
    tuesday: string | null;
    wednesday: string | null;
    thursday: string | null;
    friday: string | null;
    saturday: string | null;
    sunday: string | null;
  };
  url: string | null;
  website: string | null;
  mission_statement: string | null;
  adoption: {
    policy: string | null;
    url: string | null;
  };
}

export class PetfinderAdapter implements PetDataSource {
  private client: Client;
  private cache: Map<string, { data: Pet[]; timestamp: number }> = new Map();
  private orgCache: Map<string, Organization> = new Map();
  private cacheDuration = 5 * 60 * 1000; // 5 minutes

  constructor() {
    const apiKey = process.env.PETFINDER_API_KEY || '';
    const secret = process.env.PETFINDER_SECRET || '';
    
    if (!apiKey || !secret) {
      console.warn('Petfinder API credentials not configured. Set PETFINDER_API_KEY and PETFINDER_SECRET.');
    }
    
    this.client = new Client({ apiKey, secret });
  }

  private mapCoatLength(coat: string | null): Pet['coatLength'] {
    if (!coat) return undefined;
    const coatLower = coat.toLowerCase();
    if (coatLower === 'hairless') return 'Hairless';
    if (coatLower === 'short') return 'Short';
    if (coatLower === 'medium') return 'Medium';
    if (coatLower === 'long') return 'Long';
    return undefined;
  }

  private mapColors(colors: PetfinderAnimal['colors']): string | undefined {
    const colorParts = [colors.primary, colors.secondary, colors.tertiary].filter(Boolean);
    return colorParts.length > 0 ? colorParts.join(' / ') : undefined;
  }

  private mapToPet(animal: PetfinderAnimal, org?: Organization): Pet {
    // Map Petfinder size to our size
    const sizeMap: Record<string, Pet['size']> = {
      'Small': 'Small',
      'Medium': 'Medium',
      'Large': 'Large',
      'Extra Large': 'Extra Large',
    };

    // Estimate energy level from age/species
    const getEnergyLevel = (): Pet['energyLevel'] => {
      if (animal.age === 'Senior') return 'Low';
      if (animal.age === 'Baby' || animal.age === 'Young') return 'High';
      return 'Moderate';
    };

    // Calculate days since published
    const publishedDate = new Date(animal.published_at);
    const daysInShelter = Math.floor((Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24));

    // Build tags
    const tags: string[] = [
      animal.species === 'Dog' ? 'Dog' : animal.species === 'Cat' ? 'Cat' : animal.species,
      ...animal.tags,
    ];
    
    if (animal.age === 'Senior') tags.push('Senior');
    if (animal.age === 'Baby') tags.push('Baby');
    if (animal.environment?.children) tags.push('Good with Kids');
    if (animal.environment?.dogs) tags.push('Good with Dogs');
    if (animal.environment?.cats) tags.push('Good with Cats');
    if (daysInShelter > 30) tags.push('Long Stay');

    // Get images
    const images = animal.photos.map(p => p.large || p.medium || p.full);
    const primaryImage = images[0] || 'https://via.placeholder.com/400x400?text=No+Photo';

    // Store original shelter description for "Shelter Notes" section
    const originalDescription = animal.description;
    const hasRealDescription = !!originalDescription && originalDescription.length > 10;

    return {
      id: String(animal.id),
      name: animal.name,
      breed: [animal.breeds.primary, animal.breeds.secondary].filter(Boolean).join(' / ') || 'Mixed',
      status: animal.status === 'adoptable' ? 'Available' : 'Pending',
      sex: animal.gender as 'Male' | 'Female',
      age: animal.age,
      imageUrl: primaryImage,
      images: images.length > 0 ? images : undefined,
      description: animal.description || `${animal.name} is looking for a forever home!`,
      shelterNotes: hasRealDescription ? originalDescription : undefined,
      isSyntheticDescription: !hasRealDescription,
      tags,
      daysInShelter,
      location: `${animal.contact.address.city}, ${animal.contact.address.state}`,
      distance: animal.distance,
      energyLevel: getEnergyLevel(),
      size: sizeMap[animal.size] || 'Medium',
      color: this.mapColors(animal.colors),
      coatLength: this.mapCoatLength(animal.coat),
      compatibility: {
        kids: animal.environment?.children,
        dogs: animal.environment?.dogs,
        cats: animal.environment?.cats,
        otherAnimals: null, // Petfinder doesn't provide this
      },
      health: {
        spayedNeutered: animal.attributes?.spayed_neutered ?? false,
        vaccinated: animal.attributes?.shots_current ?? false,
        microchipped: false, // Petfinder doesn't provide this separately
        specialNeeds: animal.attributes?.special_needs ?? false,
      },
      houseTrained: animal.attributes?.house_trained ?? undefined,
      declawed: animal.attributes?.declawed ?? undefined,
      organization: org,
    };
  }

  async getOrganization(orgId: string): Promise<Organization | undefined> {
    // Check cache first
    if (this.orgCache.has(orgId)) {
      return this.orgCache.get(orgId);
    }

    try {
      const response = await this.client.organization.show(orgId);
      const orgData = response.data.organization as PetfinderOrganization;
      
      const org: Organization = {
        id: orgData.id,
        name: orgData.name,
        email: orgData.email || undefined,
        phone: orgData.phone || undefined,
        address: [orgData.address.address1, orgData.address.city, orgData.address.state, orgData.address.postcode]
          .filter(Boolean).join(', '),
        city: orgData.address.city,
        state: orgData.address.state,
        website: orgData.website || orgData.url || undefined,
        adoptionPolicy: orgData.adoption?.policy || orgData.mission_statement || undefined,
        hours: this.formatHours(orgData.hours),
      };

      this.orgCache.set(orgId, org);
      return org;
    } catch (error) {
      console.error('Error fetching organization:', error);
      return undefined;
    }
  }

  private formatHours(hours: PetfinderOrganization['hours']): string | undefined {
    if (!hours) return undefined;
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
    const formatted = days
      .map(day => hours[day] ? `${day.charAt(0).toUpperCase() + day.slice(1)}: ${hours[day]}` : null)
      .filter(Boolean);
    return formatted.length > 0 ? formatted.join('\n') : undefined;
  }

  async getAllPets(): Promise<Pet[]> {
    return this.searchPets({});
  }

  async getPet(id: string): Promise<Pet | null> {
    try {
      const response = await this.client.animal.show(parseInt(id));
      const animal = response.data.animal as PetfinderAnimal;
      
      // Fetch organization details
      const org = await this.getOrganization(animal.organization_id);
      
      return this.mapToPet(animal, org);
    } catch (error) {
      console.error('Error fetching pet from Petfinder:', error);
      return null;
    }
  }

  async searchPets(options: {
    location?: string;
    distance?: number;
    type?: 'Dog' | 'Cat';
    limit?: number;
  }): Promise<Pet[]> {
    const cacheKey = JSON.stringify(options);
    
    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      return cached.data;
    }

    try {
      const searchParams: Record<string, unknown> = {
        limit: options.limit || 50,
        status: 'adoptable',
      };

      if (options.location) {
        searchParams.location = options.location;
        searchParams.distance = options.distance || 50;
        searchParams.sort = 'distance';
      }

      if (options.type) {
        searchParams.type = options.type;
      }

      const response = await this.client.animal.search(searchParams);
      const pets = (response.data.animals as PetfinderAnimal[]).map(a => this.mapToPet(a));

      // Cache results
      this.cache.set(cacheKey, { data: pets, timestamp: Date.now() });

      return pets;
    } catch (error) {
      console.error('Error searching Petfinder:', error);
      return [];
    }
  }

  async getPetsByOrganization(orgId: string, limit = 10): Promise<Pet[]> {
    try {
      const response = await this.client.animal.search({
        organization: orgId,
        limit,
        status: 'adoptable',
      });
      
      const org = await this.getOrganization(orgId);
      return (response.data.animals as PetfinderAnimal[]).map(a => this.mapToPet(a, org));
    } catch (error) {
      console.error('Error fetching pets by organization:', error);
      return [];
    }
  }
}

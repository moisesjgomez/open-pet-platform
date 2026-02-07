import { Pet, PetDataSource } from './adapters/base';
import { MockAdapter } from './adapters/mock';
import { ShelterluvAdapter } from './adapters/shelterluv';
import { BuffaloAdapter } from './adapters/buffalo';
import { PetfinderAdapter } from './adapters/petfinder';
import { extractTagsFromBio } from './services/ai'; // Uses your AI logic

// --- CONFIGURATION ---
// Priority: Petfinder > Shelterluv > Buffalo/Open Data
const USE_PETFINDER = !!process.env.PETFINDER_API_KEY && !!process.env.PETFINDER_SECRET;
const USE_SHELTERLUV = !!process.env.SHELTERLUV_API_KEY; 

// --- THE CENTRAL REPOSITORY ---
export class PetRepository {
  private adapter: PetDataSource;
  private petfinderAdapter: PetfinderAdapter | null = null;

  constructor() {
    // This switch controls the data source for the ENTIRE app
    if (USE_PETFINDER) {
      this.petfinderAdapter = new PetfinderAdapter();
      this.adapter = this.petfinderAdapter;
    } else if (USE_SHELTERLUV) {
      this.adapter = new ShelterluvAdapter("12345");
    } else {
      // Fallback to Open Data (Buffalo/Dallas) if no private key is available
      this.adapter = new BuffaloAdapter();
    }
  }

  /**
   * Check if location-based search is available
   */
  isLocationSearchEnabled(): boolean {
    return USE_PETFINDER && this.petfinderAdapter !== null;
  }

  // 1. GET ALL PETS (With AI Enrichment)
  // This function fetches raw data and makes it "Smart"
  async getSmartPets(): Promise<Pet[]> {
    const rawPets = await this.adapter.getAllPets();

    // We map over every pet to "fix" missing tags using AI logic
    const enrichedPets = await Promise.all(rawPets.map(async (pet) => {
      
      // If a pet has very few tags, we try to extract more from the bio
      // (We check if tags are missing or < 2 to avoid overwriting good data)
      if (!pet.tags || pet.tags.length < 2) {
        
        // Call the AI extraction logic
        const aiTags = await extractTagsFromBio(pet.description);
        
        // Merge existing tags with new AI tags (removing duplicates)
        pet.tags = Array.from(new Set([...(pet.tags || []), ...aiTags]));
      }

      return pet;
    }));

    return enrichedPets;
  }

  // 2. GET SINGLE PET
  async getPetById(id: string): Promise<Pet | null> {
    // We fetch all smart pets and find the specific one.
    // (In a real database, we would query by ID directly, but this works for now)
    const all = await this.getSmartPets();
    return all.find(p => p.id === id) || null;
  }

  /**
   * Search pets by location (Petfinder only)
   * Falls back to getSmartPets if Petfinder is not configured
   */
  async searchByLocation(options: {
    location: string;
    distance?: number;
    type?: 'Dog' | 'Cat';
    limit?: number;
  }): Promise<Pet[]> {
    if (this.petfinderAdapter) {
      const pets = await this.petfinderAdapter.searchPets(options);
      return this.enrichPets(pets);
    }
    
    // Fallback: return all pets (no location filtering for other adapters)
    return this.getSmartPets();
  }

  /**
   * Enrich pets with AI tags (shared logic)
   */
  private async enrichPets(pets: Pet[]): Promise<Pet[]> {
    return Promise.all(pets.map(async (pet) => {
      if (!pet.tags || pet.tags.length < 2) {
        const aiTags = await extractTagsFromBio(pet.description);
        pet.tags = Array.from(new Set([...(pet.tags || []), ...aiTags]));
      }
      return pet;
    }));
  }
}
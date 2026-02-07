import { Pet, PetDataSource } from './adapters/base';
import { MockAdapter } from './adapters/mock';
import { ShelterluvAdapter } from './adapters/shelterluv';
import { BuffaloAdapter } from './adapters/buffalo';
import { PetfinderAdapter } from './adapters/petfinder';
import { extractTagsFromBio, generatePetBio } from './services/ai'; // Uses your AI logic
import { 
  enrichPet, 
  mergePetWithEnrichment, 
  getCachedEnrichment,
  generateContentHash,
  runHeuristicAnalysis,
  saveEnrichment,
  type EnrichedPetContent 
} from './ai/enrichment';

// --- CONFIGURATION ---
// Priority: Petfinder > Shelterluv > Buffalo/Open Data
const USE_PETFINDER = !!process.env.PETFINDER_API_KEY && !!process.env.PETFINDER_SECRET;
const USE_SHELTERLUV = !!process.env.SHELTERLUV_API_KEY;
const USE_MOCK = process.env.USE_MOCK_DATA === 'true' || (!USE_PETFINDER && !USE_SHELTERLUV && !process.env.BUFFALO_API_ENABLED); 

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

  /**
   * Get the data source name for tracking
   */
  getSourceName(): string {
    if (USE_PETFINDER) return 'petfinder';
    if (USE_SHELTERLUV) return 'shelterluv';
    if (USE_MOCK) return 'mock';
    return 'buffalo';
  }

  // 1. GET ALL PETS (With AI Enrichment)
  // This function fetches raw data and makes it "Smart"
  // Now uses the tiered enrichment system for cost efficiency
  async getSmartPets(): Promise<Pet[]> {
    const rawPets = await this.adapter.getAllPets();
    const source = this.getSourceName();

    // Enrich each pet with Tier 0 (heuristics) + Tier 1 (cache)
    // Tier 2 (AI) is only triggered on-demand via API
    const enrichedPets = await Promise.all(rawPets.map(async (pet) => {
      return this.enrichPetWithTier0And1(pet, source);
    }));

    return enrichedPets;
  }

  /**
   * Fast enrichment: Tier 0 (heuristics) + Tier 1 (cache lookup)
   * No API calls, always fast and free
   */
  private async enrichPetWithTier0And1(pet: Pet, source: string): Promise<Pet> {
    const contentHash = generateContentHash(pet);

    // Tier 1: Check cache first
    const cached = await getCachedEnrichment(pet.id, contentHash);
    if (cached) {
      return mergePetWithEnrichment(pet, cached);
    }

    // Tier 0: Run heuristics (FREE)
    // Pass isSyntheticDescription flag so we don't extract fake traits
    const heuristics = runHeuristicAnalysis(pet);
    
    // Generate first-person bio using templates (FREE - no API call)
    // Pass isSyntheticDescription so we generate honest bios for pets without real descriptions
    const firstPersonBio = await generatePetBio(pet.name, pet.breed, heuristics.tags, {
      isSyntheticDescription: pet.isSyntheticDescription ?? false,
      originalDescription: pet.description,
    });
    
    // Create a short summary from the first sentence
    const aiSummary = firstPersonBio.split('.')[0] + '.';
    
    // Build enrichment result with first-person bio
    const enrichment: EnrichedPetContent = {
      heuristicTags: heuristics.tags,
      energyLevel: heuristics.energyLevel,
      size: heuristics.size,
      ageCategory: heuristics.ageCategory,
      aiBio: firstPersonBio,
      aiSummary: aiSummary,
      enrichmentTier: 'basic', // We have generated content now
      tokensUsed: 0, // Template-based, no API cost
      contentHash,
    };

    // Save to cache (async, don't wait)
    saveEnrichment(pet.id, source, enrichment).catch(() => {});

    // Also apply legacy AI tag extraction for backwards compatibility
    if (!pet.tags || pet.tags.length < 2) {
      const aiTags = await extractTagsFromBio(pet.description);
      pet.tags = Array.from(new Set([...(pet.tags || []), ...aiTags]));
    }

    return mergePetWithEnrichment(pet, enrichment);
  }

  // Legacy method for backwards compatibility
  async getAllPets(): Promise<Pet[]> {
    return this.getSmartPets();
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
   * Now uses tiered enrichment for cost efficiency
   */
  private async enrichPets(pets: Pet[]): Promise<Pet[]> {
    const source = this.getSourceName();
    return Promise.all(pets.map(async (pet) => {
      return this.enrichPetWithTier0And1(pet, source);
    }));
  }

  /**
   * Get a single pet by ID with enrichment
   */
  async getPet(id: string): Promise<Pet | null> {
    return this.getPetById(id);
  }
}

// Singleton instance
let repositoryInstance: PetRepository | null = null;

/**
 * Get the repository singleton
 * Use this instead of creating new instances
 */
export async function getRepository(): Promise<PetRepository> {
  if (!repositoryInstance) {
    repositoryInstance = new PetRepository();
  }
  return repositoryInstance;
}
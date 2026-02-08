/**
 * AI Pet Enrichment Service
 * 
 * Cost-Efficient Two-Tier System:
 * - Tier 0 (FREE): Heuristic analysis via text-analysis.ts - always runs
 * - Tier 1 (FREE): Cache lookup - check if we already have AI content
 * - Tier 2 (PAID): Gemini API calls - only on-demand or batch jobs
 * 
 * Key Cost Controls:
 * - Smart deduplication via contentHash (same pet data = reuse content)
 * - Budget checks before any API call
 * - Lazy image analysis (only when explicitly requested)
 * - Batch processing with delays and limits
 */

import { createHash } from 'crypto';
import { prisma, isDatabaseAvailable } from '@/lib/db';
import { generateSmartTags } from './text-analysis';
import { generatePetBioAI, analyzePetImage, isGeminiAvailable } from './gemini';
import type { Pet } from '@/lib/adapters/base';

// Types for enrichment results
export type EnrichmentTier = 'heuristic' | 'basic' | 'full';

export interface EnrichedPetContent {
  // Tier 0: Heuristics (always present)
  heuristicTags: string[];
  energyLevel: 'Low' | 'Moderate' | 'High';
  size: 'Small' | 'Medium' | 'Large' | 'Extra Large';
  ageCategory: 'Baby' | 'Young' | 'Adult' | 'Senior';
  
  // Tier 2: AI-generated (optional)
  aiBio?: string;
  aiSummary?: string;
  aiTags?: string[];
  aiTemperament?: string[];
  
  // Image analysis (optional, expensive)
  imageAnalysis?: {
    breed?: string;
    color?: string;
    temperament?: string[];
    description?: string;
  };
  
  // Metadata
  enrichmentTier: EnrichmentTier;
  tokensUsed: number;
  contentHash: string;
}

/**
 * Generate a content hash for deduplication
 * Same pet data = same hash = reuse existing AI content
 */
export function generateContentHash(pet: Pet): string {
  const hashInput = JSON.stringify({
    breed: pet.breed?.toLowerCase().trim(),
    age: pet.age?.toLowerCase().trim(),
    description: pet.description?.substring(0, 500)?.toLowerCase().trim(),
    imageUrl: pet.imageUrl,
    color: pet.color?.toLowerCase().trim(),
  });
  return createHash('sha256').update(hashInput).digest('hex').substring(0, 16);
}

/**
 * Tier 0: Run heuristic analysis (FREE, always runs)
 * Only extracts traits from REAL descriptions, not synthetic ones
 */
export function runHeuristicAnalysis(pet: Pet): {
  tags: string[];
  energyLevel: 'Low' | 'Moderate' | 'High';
  size: 'Small' | 'Medium' | 'Large' | 'Extra Large';
  ageCategory: 'Baby' | 'Young' | 'Adult' | 'Senior';
} {
  // Use the pet's species field if available, otherwise detect from tags/breed
  let animalType = 'OTHER';
  
  if (pet.species) {
    // Map species to animalType for generateSmartTags
    if (pet.species === 'Dog') animalType = 'DOG';
    else if (pet.species === 'Cat') animalType = 'CAT';
    else if (pet.species === 'Bird') animalType = 'BIRD';
    else if (pet.species === 'Rabbit') animalType = 'RABBIT';
    else if (pet.species === 'Small & Furry') animalType = 'SMALL_FURRY';
    else if (pet.species === 'Reptile') animalType = 'REPTILE';
    else animalType = pet.species.toUpperCase();
  } else {
    // Fallback: detect from tags or breed
    if (pet.tags?.some(t => t.toLowerCase() === 'dog')) {
      animalType = 'DOG';
    } else if (pet.tags?.some(t => t.toLowerCase() === 'cat') || 
        pet.breed?.toLowerCase().includes('domestic') ||
        pet.breed?.toLowerCase().includes('siamese') ||
        pet.breed?.toLowerCase().includes('persian')) {
      animalType = 'CAT';
    } else if (pet.breed?.toLowerCase().includes('lizard') ||
        pet.breed?.toLowerCase().includes('gecko') ||
        pet.breed?.toLowerCase().includes('turtle') ||
        pet.breed?.toLowerCase().includes('snake')) {
      animalType = 'REPTILE';
    } else if (pet.breed?.toLowerCase().includes('guinea pig') ||
        pet.breed?.toLowerCase().includes('hamster') ||
        pet.breed?.toLowerCase().includes('gerbil')) {
      animalType = 'SMALL_FURRY';
    } else if (pet.breed?.toLowerCase().includes('bird') ||
        pet.breed?.toLowerCase().includes('parrot') ||
        pet.breed?.toLowerCase().includes('parakeet')) {
      animalType = 'BIRD';
    }
    // Otherwise stays 'OTHER'
  }

  return generateSmartTags({
    breed: pet.breed || '',
    color: pet.color,
    description: pet.description || '',
    age: pet.age || '',
    animalType,
    petSize: pet.size?.toUpperCase(),
    isSyntheticDescription: pet.isSyntheticDescription ?? false,
  });
}

/**
 * Tier 1: Check cache for existing AI content
 * Returns cached content if fresh, null if stale or missing
 */
export async function getCachedEnrichment(
  petId: string,
  contentHash: string
): Promise<EnrichedPetContent | null> {
  const dbAvailable = await isDatabaseAvailable();
  if (!dbAvailable) return null;

  try {
    const cached = await prisma.aIPetContent.findUnique({
      where: { petId },
    });

    if (!cached) return null;

    // Check if content hash matches (pet data hasn't changed)
    if (cached.contentHash !== contentHash) {
      // Pet data changed, need to re-enrich
      return null;
    }

    return {
      heuristicTags: cached.heuristicTags as string[],
      energyLevel: cached.energyLevel as 'Low' | 'Moderate' | 'High',
      size: cached.size as 'Small' | 'Medium' | 'Large' | 'Extra Large',
      ageCategory: cached.ageCategory as 'Baby' | 'Young' | 'Adult' | 'Senior',
      aiBio: cached.aiBio || undefined,
      aiSummary: cached.aiSummary || undefined,
      aiTags: (cached.aiTags as string[]) || undefined,
      aiTemperament: (cached.aiTemperament as string[]) || undefined,
      imageAnalysis: cached.imageAnalysis as EnrichedPetContent['imageAnalysis'],
      enrichmentTier: cached.enrichmentTier as EnrichmentTier,
      tokensUsed: cached.tokensUsed,
      contentHash: cached.contentHash,
    };
  } catch (error) {
    console.error('Cache lookup error:', error);
    return null;
  }
}

/**
 * Check for duplicate content by hash
 * If another pet with same data exists, copy its AI content (FREE!)
 */
export async function findDuplicateContent(
  contentHash: string,
  excludePetId?: string
): Promise<EnrichedPetContent | null> {
  const dbAvailable = await isDatabaseAvailable();
  if (!dbAvailable) return null;

  try {
    const duplicate = await prisma.aIPetContent.findFirst({
      where: {
        contentHash,
        petId: excludePetId ? { not: excludePetId } : undefined,
        enrichmentTier: { in: ['basic', 'full'] }, // Only copy if has AI content
      },
    });

    if (!duplicate) return null;

    return {
      heuristicTags: duplicate.heuristicTags as string[],
      energyLevel: duplicate.energyLevel as 'Low' | 'Moderate' | 'High',
      size: duplicate.size as 'Small' | 'Medium' | 'Large' | 'Extra Large',
      ageCategory: duplicate.ageCategory as 'Baby' | 'Young' | 'Adult' | 'Senior',
      aiBio: duplicate.aiBio || undefined,
      aiSummary: duplicate.aiSummary || undefined,
      aiTags: (duplicate.aiTags as string[]) || undefined,
      aiTemperament: (duplicate.aiTemperament as string[]) || undefined,
      imageAnalysis: duplicate.imageAnalysis as EnrichedPetContent['imageAnalysis'],
      enrichmentTier: duplicate.enrichmentTier as EnrichmentTier,
      tokensUsed: 0, // Don't count duplicate's tokens
      contentHash: duplicate.contentHash,
    };
  } catch (error) {
    console.error('Duplicate lookup error:', error);
    return null;
  }
}

/**
 * Save enrichment content to database
 */
export async function saveEnrichment(
  petId: string,
  source: string,
  content: EnrichedPetContent
): Promise<void> {
  const dbAvailable = await isDatabaseAvailable();
  if (!dbAvailable) return;

  try {
    await prisma.aIPetContent.upsert({
      where: { petId },
      update: {
        source,
        contentHash: content.contentHash,
        enrichmentTier: content.enrichmentTier,
        heuristicTags: content.heuristicTags,
        energyLevel: content.energyLevel,
        size: content.size,
        ageCategory: content.ageCategory,
        aiBio: content.aiBio,
        aiSummary: content.aiSummary,
        aiTags: content.aiTags || [],
        aiTemperament: content.aiTemperament || [],
        imageAnalysis: content.imageAnalysis,
        tokensUsed: content.tokensUsed,
        modelVersion: 'gemini-1.5-flash',
      },
      create: {
        petId,
        source,
        contentHash: content.contentHash,
        enrichmentTier: content.enrichmentTier,
        heuristicTags: content.heuristicTags,
        energyLevel: content.energyLevel,
        size: content.size,
        ageCategory: content.ageCategory,
        aiBio: content.aiBio,
        aiSummary: content.aiSummary,
        aiTags: content.aiTags || [],
        aiTemperament: content.aiTemperament || [],
        imageAnalysis: content.imageAnalysis,
        tokensUsed: content.tokensUsed,
        modelVersion: 'gemini-1.5-flash',
      },
    });
  } catch (error) {
    console.error('Save enrichment error:', error);
  }
}

/**
 * Tier 2: Generate AI content (PAID - use sparingly)
 * Only call when:
 * - User explicitly views pet detail page
 * - Batch job during off-peak hours with budget available
 */
export async function generateAIContent(
  pet: Pet,
  heuristicResult: ReturnType<typeof runHeuristicAnalysis>
): Promise<{
  aiBio?: string;
  aiSummary?: string;
  aiTags?: string[];
  tokensUsed: number;
} | null> {
  // Check if Gemini is available and within budget
  if (!(await isGeminiAvailable())) {
    return null;
  }

  let totalTokens = 0;

  try {
    // Generate AI bio
    const bioResult = await generatePetBioAI(
      pet.name,
      pet.breed,
      heuristicResult.tags,
      pet.description
    );

    if (!bioResult.fromAI) {
      // Fallback was used, no tokens spent
      return null;
    }

    totalTokens += bioResult.tokensUsed;

    // Extract a 1-line summary from the bio
    const aiSummary = bioResult.bio.split('.')[0] + '.';

    // Extract additional AI tags from the bio
    const aiTags = extractTagsFromAIBio(bioResult.bio, heuristicResult.tags);

    return {
      aiBio: bioResult.bio,
      aiSummary,
      aiTags,
      tokensUsed: totalTokens,
    };
  } catch (error) {
    console.error('AI content generation error:', error);
    return null;
  }
}

/**
 * Extract additional tags from AI-generated bio
 * Finds personality keywords not already in heuristic tags
 */
function extractTagsFromAIBio(bio: string, existingTags: string[]): string[] {
  const keywordMap: Record<string, string> = {
    'loving': 'Affectionate',
    'affectionate': 'Affectionate',
    'playful': 'Playful',
    'energetic': 'High Energy',
    'calm': 'Chill',
    'gentle': 'Gentle',
    'loyal': 'Loyal',
    'smart': 'Smart',
    'clever': 'Smart',
    'intelligent': 'Smart',
    'friendly': 'Friendly',
    'curious': 'Curious',
    'adventurous': 'Adventurous',
    'cuddly': 'Cuddly',
    'sweet': 'Sweet',
    'goofy': 'Goofy',
    'protective': 'Protective',
    'independent': 'Independent',
  };

  const lowerBio = bio.toLowerCase();
  const newTags: string[] = [];
  const existingLower = existingTags.map(t => t.toLowerCase());

  for (const [keyword, tag] of Object.entries(keywordMap)) {
    if (lowerBio.includes(keyword) && !existingLower.includes(tag.toLowerCase())) {
      newTags.push(tag);
    }
  }

  return [...new Set(newTags)].slice(0, 3); // Max 3 additional tags
}

/**
 * Analyze pet images (EXPENSIVE - only when explicitly requested)
 * Analyzes all available images (up to 5) for comprehensive personality assessment
 */
export async function runImageAnalysis(
  pet: Pet
): Promise<{
  imageAnalysis: EnrichedPetContent['imageAnalysis'];
  tokensUsed: number;
} | null> {
  // Get all images, fallback to single imageUrl
  const images = pet.images?.length ? pet.images : (pet.imageUrl ? [pet.imageUrl] : []);
  if (images.length === 0) return null;

  // Check if Gemini is available
  if (!(await isGeminiAvailable())) {
    return null;
  }

  try {
    // Pass all images (up to 5) for comprehensive analysis
    const result = await analyzePetImage(images);
    if (!result || !result.fromAI) {
      return null;
    }

    return {
      imageAnalysis: {
        breed: result.breed,
        color: result.color,
        temperament: result.temperament,
        description: result.description,
      },
      tokensUsed: result.tokensUsed,
    };
  } catch (error) {
    console.error('Image analysis error:', error);
    return null;
  }
}

/**
 * Main enrichment function - orchestrates all tiers
 * 
 * @param pet - The pet to enrich
 * @param source - Data source identifier (e.g., "mock", "petfinder")
 * @param options - Control which tiers to run
 */
export async function enrichPet(
  pet: Pet,
  source: string = 'unknown',
  options: {
    runAI?: boolean;        // Run Tier 2 AI generation (default: false)
    runImageAnalysis?: boolean;  // Run image analysis (default: false)
    forceRefresh?: boolean; // Ignore cache (default: false)
  } = {}
): Promise<EnrichedPetContent> {
  const { runAI = false, runImageAnalysis: runImage = false, forceRefresh = false } = options;

  // Generate content hash for this pet
  const contentHash = generateContentHash(pet);

  // Tier 1: Check cache (unless forced refresh)
  if (!forceRefresh) {
    const cached = await getCachedEnrichment(pet.id, contentHash);
    if (cached) {
      // If we have cached content at the requested tier, return it
      if (!runAI || cached.enrichmentTier === 'full') {
        return cached;
      }
      // Otherwise, we need to upgrade the tier
    }

    // Check for duplicate content (same pet data, different ID)
    const duplicate = await findDuplicateContent(contentHash, pet.id);
    if (duplicate) {
      // Copy duplicate's content to this pet
      await saveEnrichment(pet.id, source, { ...duplicate, contentHash });
      
      if (!runAI || duplicate.enrichmentTier === 'full') {
        return duplicate;
      }
    }
  }

  // Tier 0: Always run heuristics (FREE)
  const heuristics = runHeuristicAnalysis(pet);

  // Build base result
  let result: EnrichedPetContent = {
    heuristicTags: heuristics.tags,
    energyLevel: heuristics.energyLevel,
    size: heuristics.size,
    ageCategory: heuristics.ageCategory,
    enrichmentTier: 'heuristic',
    tokensUsed: 0,
    contentHash,
  };

  // Tier 2: Run AI if requested and available
  if (runAI) {
    const aiContent = await generateAIContent(pet, heuristics);
    if (aiContent) {
      result = {
        ...result,
        aiBio: aiContent.aiBio,
        aiSummary: aiContent.aiSummary,
        aiTags: aiContent.aiTags,
        enrichmentTier: 'basic',
        tokensUsed: aiContent.tokensUsed,
      };
    }
  }

  // Image analysis if requested
  if (runImage) {
    const imageResult = await runImageAnalysis(pet);
    if (imageResult) {
      result = {
        ...result,
        imageAnalysis: imageResult.imageAnalysis,
        enrichmentTier: 'full',
        tokensUsed: result.tokensUsed + imageResult.tokensUsed,
      };
    }
  }

  // Save to cache
  await saveEnrichment(pet.id, source, result);

  return result;
}

/**
 * Batch enrich multiple pets with rate limiting
 * 
 * Cost Controls:
 * - Processes in chunks with delays
 * - Skips already-enriched pets
 * - Stops if budget threshold reached
 * - Only runs heuristics by default (AI opt-in)
 */
export async function batchEnrichPets(
  pets: Pet[],
  source: string,
  options: {
    chunkSize?: number;      // Pets per batch (default: 10)
    delayMs?: number;        // Delay between batches (default: 1000)
    runAI?: boolean;         // Run AI for new pets (default: false)
    budgetThreshold?: number; // Stop if budget % exceeded (default: 0.5 = 50%)
    onProgress?: (completed: number, total: number) => void;
  } = {}
): Promise<{
  enriched: number;
  skipped: number;
  aiGenerated: number;
  tokensUsed: number;
  stoppedEarly: boolean;
}> {
  const {
    chunkSize = 10,
    delayMs = 1000,
    runAI = false,
    budgetThreshold = 0.5,
    onProgress,
  } = options;

  let enriched = 0;
  let skipped = 0;
  let aiGenerated = 0;
  let totalTokens = 0;
  let stoppedEarly = false;

  // Process in chunks
  for (let i = 0; i < pets.length; i += chunkSize) {
    const chunk = pets.slice(i, i + chunkSize);

    for (const pet of chunk) {
      // Check if already enriched with current data
      const contentHash = generateContentHash(pet);
      const cached = await getCachedEnrichment(pet.id, contentHash);
      
      if (cached && (!runAI || cached.enrichmentTier !== 'heuristic')) {
        skipped++;
        continue;
      }

      // Check budget before AI calls
      if (runAI) {
        const budgetOk = await checkBudgetThreshold(budgetThreshold);
        if (!budgetOk) {
          stoppedEarly = true;
          break;
        }
      }

      // Enrich the pet
      const result = await enrichPet(pet, source, { runAI });
      enriched++;
      totalTokens += result.tokensUsed;

      if (result.enrichmentTier !== 'heuristic') {
        aiGenerated++;
      }
    }

    if (stoppedEarly) break;

    // Report progress
    onProgress?.(enriched + skipped, pets.length);

    // Delay between batches (except for last batch)
    if (i + chunkSize < pets.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return {
    enriched,
    skipped,
    aiGenerated,
    tokensUsed: totalTokens,
    stoppedEarly,
  };
}

/**
 * Check if we're under the budget threshold
 */
async function checkBudgetThreshold(threshold: number): Promise<boolean> {
  const dbAvailable = await isDatabaseAvailable();
  if (!dbAvailable) return true; // Allow if can't check

  const dailyBudget = parseFloat(process.env.AI_DAILY_BUDGET_USD || '1.00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const usage = await prisma.aIUsage.aggregate({
      where: { date: today },
      _sum: { estimatedCost: true },
    });

    const todayCost = usage._sum.estimatedCost || 0;
    return todayCost < dailyBudget * threshold;
  } catch {
    return true;
  }
}

/**
 * Merge enriched content into a Pet object
 * Returns a new Pet with AI-enhanced fields
 */
export function mergePetWithEnrichment(
  pet: Pet,
  enrichment: EnrichedPetContent
): Pet & {
  enrichmentLevel: EnrichmentTier;
  aiBio?: string;
  aiSummary?: string;
  aiTags?: string[];
} {
  // Combine heuristic and AI tags, deduplicate
  const allTags = [
    ...(pet.tags || []),
    ...enrichment.heuristicTags,
    ...(enrichment.aiTags || []),
  ];
  const uniqueTags = [...new Set(allTags)];

  return {
    ...pet,
    // Override with enriched values
    tags: uniqueTags,
    energyLevel: enrichment.energyLevel || pet.energyLevel,
    size: enrichment.size || pet.size,
    // Add AI-specific fields
    enrichmentLevel: enrichment.enrichmentTier,
    aiBio: enrichment.aiBio,
    aiSummary: enrichment.aiSummary,
    aiTags: enrichment.aiTags,
  };
}

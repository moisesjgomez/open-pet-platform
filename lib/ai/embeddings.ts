/**
 * Pet Embeddings System
 * 
 * Uses Google Gemini's text-embedding-004 model
 * to generate semantic vectors for pet profiles.
 * 
 * Embeddings are cached indefinitely in the database since pet
 * profiles rarely change significantly.
 */

import { prisma, isDatabaseAvailable } from '@/lib/db';
import { Pet } from '@/lib/adapters/base';
import { generateEmbedding as geminiGenerateEmbedding, isGeminiAvailable } from './gemini';
import { generateCacheKey, getCached, setCache } from './cache';
import { createHash } from 'crypto';

const EMBEDDING_MODEL = 'text-embedding-004';
const EMBEDDING_DIMENSIONS = 768; // Gemini embedding dimensions

/**
 * Generate a content hash for a pet to detect changes
 */
function generatePetHash(pet: Pet): string {
  const content = [
    pet.name,
    pet.breed,
    pet.description,
    pet.tags.sort().join(','),
    pet.size,
    pet.energyLevel,
    pet.age,
  ].join('::');
  
  return createHash('md5').update(content).digest('hex');
}

/**
 * Create embedding text from a pet profile
 */
function petToEmbeddingText(pet: Pet): string {
  const parts = [
    `${pet.name} is a ${pet.age} ${pet.breed}.`,
    pet.description,
    `Size: ${pet.size || 'unknown'}.`,
    `Energy level: ${pet.energyLevel || 'unknown'}.`,
  ];

  if (pet.tags.length > 0) {
    parts.push(`Traits: ${pet.tags.join(', ')}.`);
  }

  if (pet.compatibility) {
    const compat = [];
    if (pet.compatibility.kids) compat.push('good with kids');
    if (pet.compatibility.dogs) compat.push('good with dogs');
    if (pet.compatibility.cats) compat.push('good with cats');
    if (compat.length > 0) {
      parts.push(`Compatibility: ${compat.join(', ')}.`);
    }
  }

  return parts.filter(Boolean).join(' ');
}

/**
 * Generate an embedding vector for text using Gemini
 */
async function generateEmbedding(text: string): Promise<number[] | null> {
  return geminiGenerateEmbedding(text);
}

/**
 * Get or generate embedding for a pet
 * Uses database cache with indefinite TTL
 */
export async function getPetEmbedding(
  pet: Pet,
  source: string = 'unknown'
): Promise<number[] | null> {
  const contentHash = generatePetHash(pet);
  const dbAvailable = await isDatabaseAvailable();

  // Try to get from database cache
  if (dbAvailable) {
    try {
      const cached = await prisma.petEmbedding.findUnique({
        where: { petId: pet.id },
      });

      // If hash matches, use cached embedding
      if (cached && cached.contentHash === contentHash) {
        return cached.embedding as number[];
      }
    } catch (error) {
      console.error('Error fetching cached embedding:', error);
    }
  }

  // Generate new embedding
  const text = petToEmbeddingText(pet);
  const embedding = await generateEmbedding(text);

  if (!embedding) {
    return null;
  }

  // Cache in database
  if (dbAvailable) {
    try {
      await prisma.petEmbedding.upsert({
        where: { petId: pet.id },
        update: {
          embedding: embedding,
          contentHash,
          source,
          updatedAt: new Date(),
        },
        create: {
          petId: pet.id,
          source,
          embedding: embedding,
          contentHash,
        },
      });
    } catch (error) {
      console.error('Error caching embedding:', error);
    }
  }

  return embedding;
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Generate an embedding for user preferences
 */
export async function getUserPreferenceEmbedding(
  preferences: {
    species?: string;
    size?: string;
    energy?: string;
    traits?: string[];
    goodWith?: string[];
  }
): Promise<number[] | null> {
  const parts = ['I am looking for a pet.'];

  if (preferences.species) {
    parts.push(`I prefer ${preferences.species.toLowerCase()}s.`);
  }

  if (preferences.size) {
    parts.push(`I want a ${preferences.size.toLowerCase()} sized pet.`);
  }

  if (preferences.energy) {
    parts.push(`I prefer ${preferences.energy.toLowerCase()} energy pets.`);
  }

  if (preferences.traits && preferences.traits.length > 0) {
    parts.push(`I like pets that are ${preferences.traits.join(', ')}.`);
  }

  if (preferences.goodWith && preferences.goodWith.length > 0) {
    parts.push(`The pet should be good with ${preferences.goodWith.join(', ')}.`);
  }

  const text = parts.join(' ');
  
  // Check cache first
  const cacheKey = generateCacheKey('embedding', text);
  const cached = await getCached<number[]>('embedding', cacheKey);
  
  if (cached) {
    return cached.data;
  }

  // Generate new embedding
  const embedding = await generateEmbedding(text);
  
  if (embedding) {
    await setCache('embedding', cacheKey, embedding, 0, EMBEDDING_MODEL);
  }

  return embedding;
}

/**
 * Find the most similar pets to a user's preferences
 */
export async function findSimilarPets(
  pets: Pet[],
  userPreferences: {
    species?: string;
    size?: string;
    energy?: string;
    traits?: string[];
    goodWith?: string[];
  },
  limit: number = 10
): Promise<Array<{ pet: Pet; similarity: number }>> {
  // Get user preference embedding
  const userEmbedding = await getUserPreferenceEmbedding(userPreferences);
  
  if (!userEmbedding) {
    // Fall back to heuristic scoring if embeddings unavailable
    return fallbackSimilaritySearch(pets, userPreferences, limit);
  }

  // Get embeddings for all pets (uses cache)
  const petScores: Array<{ pet: Pet; similarity: number }> = [];

  for (const pet of pets) {
    const petEmbedding = await getPetEmbedding(pet);
    
    if (petEmbedding) {
      const similarity = cosineSimilarity(userEmbedding, petEmbedding);
      petScores.push({ pet, similarity });
    } else {
      // If no embedding, use fallback score
      const fallbackScore = calculateFallbackScore(pet, userPreferences);
      petScores.push({ pet, similarity: fallbackScore });
    }
  }

  // Sort by similarity (highest first) and limit
  return petScores
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

/**
 * Fallback similarity search using heuristics
 */
function fallbackSimilaritySearch(
  pets: Pet[],
  preferences: {
    species?: string;
    size?: string;
    energy?: string;
    traits?: string[];
    goodWith?: string[];
  },
  limit: number
): Array<{ pet: Pet; similarity: number }> {
  return pets
    .map(pet => ({
      pet,
      similarity: calculateFallbackScore(pet, preferences),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

/**
 * Calculate a heuristic-based similarity score (0-1)
 */
function calculateFallbackScore(
  pet: Pet,
  preferences: {
    species?: string;
    size?: string;
    energy?: string;
    traits?: string[];
    goodWith?: string[];
  }
): number {
  let score = 0.5; // Base score

  // Species match
  if (preferences.species) {
    const petSpecies = pet.tags.includes('Dog') ? 'Dog' : 
                       pet.tags.includes('Cat') ? 'Cat' : null;
    if (petSpecies === preferences.species) {
      score += 0.2;
    } else if (petSpecies && petSpecies !== preferences.species) {
      score -= 0.3;
    }
  }

  // Size match
  if (preferences.size && pet.size) {
    if (pet.size === preferences.size) {
      score += 0.1;
    }
  }

  // Energy match
  if (preferences.energy && pet.energyLevel) {
    if (pet.energyLevel === preferences.energy) {
      score += 0.1;
    }
  }

  // Trait matches
  if (preferences.traits && preferences.traits.length > 0) {
    const matchingTraits = preferences.traits.filter(trait =>
      pet.tags.some(tag => tag.toLowerCase().includes(trait.toLowerCase()))
    );
    score += (matchingTraits.length / preferences.traits.length) * 0.1;
  }

  // Compatibility matches
  if (preferences.goodWith && preferences.goodWith.length > 0 && pet.compatibility) {
    let compatScore = 0;
    for (const compat of preferences.goodWith) {
      const key = compat.toLowerCase() as keyof typeof pet.compatibility;
      if (pet.compatibility[key] === true) {
        compatScore += 1;
      }
    }
    score += (compatScore / preferences.goodWith.length) * 0.1;
  }

  // Clamp to 0-1
  return Math.max(0, Math.min(1, score));
}

/**
 * Batch generate embeddings for multiple pets
 * Useful for initial population or periodic refresh
 */
export async function batchGenerateEmbeddings(
  pets: Pet[],
  source: string = 'batch'
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const pet of pets) {
    const embedding = await getPetEmbedding(pet, source);
    if (embedding) {
      success++;
    } else {
      failed++;
    }
    
    // Rate limiting - small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return { success, failed };
}

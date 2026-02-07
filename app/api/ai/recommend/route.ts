/**
 * AI Recommendation API
 * 
 * GET /api/ai/recommend
 * 
 * Query Parameters:
 * - sessionId: User session ID for preference tracking
 * - species: "Dog" | "Cat" (optional)
 * - size: "Small" | "Medium" | "Large" (optional)
 * - energy: "Low" | "Moderate" | "High" (optional)
 * - goodWithKids: "true" | "false" (optional)
 * - goodWithDogs: "true" | "false" (optional)
 * - goodWithCats: "true" | "false" (optional)
 * - limit: number (default 10)
 * 
 * Returns AI-ranked pets with match scores and explanations
 */

import { NextRequest, NextResponse } from 'next/server';
import { PetRepository } from '@/lib/repository';
import { findSimilarPets } from '@/lib/ai/embeddings';
import { generateMatchExplanation } from '@/lib/ai/gemini';
import { generateCacheKey, getCached, setCache } from '@/lib/ai/cache';
import { Pet } from '@/lib/adapters/base';

interface RecommendedPet {
  pet: Pet;
  matchScore: number; // 0-100
  explanation: string;
  aiPowered: boolean;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  // Parse query parameters
  const sessionId = searchParams.get('sessionId') || 'anonymous';
  const species = searchParams.get('species') as 'Dog' | 'Cat' | null;
  const size = searchParams.get('size') as string | null;
  const energy = searchParams.get('energy') as string | null;
  const goodWithKids = searchParams.get('goodWithKids') === 'true';
  const goodWithDogs = searchParams.get('goodWithDogs') === 'true';
  const goodWithCats = searchParams.get('goodWithCats') === 'true';
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  try {
    // Build user preferences object
    const preferences: {
      species?: string;
      size?: string;
      energy?: string;
      traits?: string[];
      goodWith?: string[];
    } = {};

    if (species) preferences.species = species;
    if (size) preferences.size = size;
    if (energy) preferences.energy = energy;

    const goodWith: string[] = [];
    if (goodWithKids) goodWith.push('kids');
    if (goodWithDogs) goodWith.push('dogs');
    if (goodWithCats) goodWith.push('cats');
    if (goodWith.length > 0) preferences.goodWith = goodWith;

    // Generate cache key for this recommendation request
    const cacheKey = generateCacheKey(
      'recommendation',
      sessionId,
      JSON.stringify(preferences),
      limit.toString()
    );

    // Check cache first
    const cached = await getCached<RecommendedPet[]>('recommendation', cacheKey);
    if (cached) {
      return NextResponse.json({
        recommendations: cached.data,
        fromCache: true,
        cacheKey,
      });
    }

    // Fetch available pets
    const repo = new PetRepository();
    let pets = await repo.getSmartPets();

    // Pre-filter by species if specified
    if (species) {
      pets = pets.filter(pet => 
        pet.tags.includes(species) || 
        pet.breed.toLowerCase().includes(species.toLowerCase())
      );
    }

    // Pre-filter by compatibility if specified
    if (goodWithKids) {
      pets = pets.filter(pet => pet.compatibility?.kids !== false);
    }
    if (goodWithDogs) {
      pets = pets.filter(pet => pet.compatibility?.dogs !== false);
    }
    if (goodWithCats) {
      pets = pets.filter(pet => pet.compatibility?.cats !== false);
    }

    // Find similar pets using embeddings
    const similarPets = await findSimilarPets(pets, preferences, limit);

    // Generate explanations for top matches
    const recommendations: RecommendedPet[] = [];

    for (const { pet, similarity } of similarPets) {
      const matchScore = Math.round(similarity * 100);
      
      // Build user preference strings for explanation
      const userPreferenceStrings: string[] = [];
      if (preferences.species) userPreferenceStrings.push(`${preferences.species}s`);
      if (preferences.size) userPreferenceStrings.push(`${preferences.size} size`);
      if (preferences.energy) userPreferenceStrings.push(`${preferences.energy} energy`);
      if (preferences.goodWith) {
        userPreferenceStrings.push(`good with ${preferences.goodWith.join(', ')}`);
      }

      // Check explanation cache
      const explanationCacheKey = generateCacheKey(
        'recommendation',
        pet.id,
        sessionId,
        matchScore.toString()
      );
      
      let explanation: string;
      let aiPowered = false;

      const cachedExplanation = await getCached<string>('recommendation', explanationCacheKey);
      
      if (cachedExplanation) {
        explanation = cachedExplanation.data;
        aiPowered = true; // Cached AI response
      } else {
        // Generate explanation
        const petTraits = [
          ...pet.tags,
          pet.size,
          pet.energyLevel,
        ].filter(Boolean) as string[];

        const result = await generateMatchExplanation(
          pet.name,
          petTraits,
          userPreferenceStrings.length > 0 ? userPreferenceStrings : ['any pet'],
          matchScore
        );

        explanation = result.explanation;
        aiPowered = result.fromAI;

        // Cache the explanation
        if (result.fromAI) {
          await setCache('recommendation', explanationCacheKey, explanation, result.tokensUsed, 'gpt-3.5-turbo');
        }
      }

      recommendations.push({
        pet,
        matchScore,
        explanation,
        aiPowered,
      });
    }

    // Cache the full recommendation set
    await setCache('recommendation', cacheKey, recommendations, 0);

    return NextResponse.json({
      recommendations,
      fromCache: false,
      preferencesUsed: preferences,
      totalPetsAnalyzed: pets.length,
    });

  } catch (error) {
    console.error('Recommendation error:', error);
    
    // Fallback to basic pet list on error
    try {
      const repo = new PetRepository();
      const pets = await repo.getSmartPets();
      
      const fallbackRecommendations = pets.slice(0, limit).map(pet => ({
        pet,
        matchScore: 50,
        explanation: `${pet.name} is looking for a loving home!`,
        aiPowered: false,
      }));

      return NextResponse.json({
        recommendations: fallbackRecommendations,
        fromCache: false,
        fallback: true,
        error: 'AI recommendation unavailable, showing default results',
      });
    } catch (fallbackError) {
      return NextResponse.json(
        { error: 'Failed to fetch recommendations', recommendations: [] },
        { status: 500 }
      );
    }
  }
}

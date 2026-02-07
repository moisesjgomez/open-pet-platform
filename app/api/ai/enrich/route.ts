/**
 * Single Pet Enrichment API
 * 
 * POST /api/ai/enrich
 * Enriches a single pet with AI-generated content
 * 
 * Use Cases:
 * - User views pet detail page → trigger full AI enrichment
 * - Pre-fetch on hover/swipe → trigger heuristic only
 */

import { NextRequest, NextResponse } from 'next/server';
import { enrichPet, mergePetWithEnrichment, EnrichedPetContent } from '@/lib/ai/enrichment';
import { getRepository } from '@/lib/repository';

interface EnrichRequest {
  petId: string;
  runAI?: boolean;           // Generate AI content (default: true for single pet)
  runImageAnalysis?: boolean; // Analyze image (default: false - expensive)
  forceRefresh?: boolean;     // Ignore cache (default: false)
}

interface EnrichResponse {
  success: boolean;
  pet?: ReturnType<typeof mergePetWithEnrichment>;
  enrichment?: EnrichedPetContent;
  error?: string;
  tokensUsed: number;
  cached: boolean;
}

export async function POST(request: NextRequest): Promise<NextResponse<EnrichResponse>> {
  try {
    const body: EnrichRequest = await request.json();
    const {
      petId,
      runAI = true,  // Default to AI for single pet requests
      runImageAnalysis = false,
      forceRefresh = false,
    } = body;

    if (!petId) {
      return NextResponse.json(
        { success: false, error: 'petId is required', tokensUsed: 0, cached: false },
        { status: 400 }
      );
    }

    // Get the pet from repository
    const repo = await getRepository();
    const pet = await repo.getPet(petId);

    if (!pet) {
      return NextResponse.json(
        { success: false, error: 'Pet not found', tokensUsed: 0, cached: false },
        { status: 404 }
      );
    }

    // Determine source from repository
    const source = 'api'; // Could be enhanced to track actual source

    // Enrich the pet
    const enrichment = await enrichPet(pet, source, {
      runAI,
      runImageAnalysis,
      forceRefresh,
    });

    // Merge enrichment into pet
    const enrichedPet = mergePetWithEnrichment(pet, enrichment);

    // Check if this was cached (tokens = 0 means cached or heuristic-only)
    const wasCached = enrichment.tokensUsed === 0 && enrichment.enrichmentTier !== 'heuristic';

    return NextResponse.json({
      success: true,
      pet: enrichedPet,
      enrichment,
      tokensUsed: enrichment.tokensUsed,
      cached: wasCached,
    });
  } catch (error) {
    console.error('Enrichment error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Enrichment failed',
        tokensUsed: 0,
        cached: false,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/enrich?petId=xxx
 * Get enrichment status for a pet (no generation)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const petId = request.nextUrl.searchParams.get('petId');

  if (!petId) {
    return NextResponse.json({ error: 'petId is required' }, { status: 400 });
  }

  try {
    const { prisma, isDatabaseAvailable } = await import('@/lib/db');
    
    if (!(await isDatabaseAvailable())) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const content = await prisma.aIPetContent.findUnique({
      where: { petId },
    });

    if (!content) {
      return NextResponse.json({ 
        exists: false,
        enrichmentTier: null,
      });
    }

    return NextResponse.json({
      exists: true,
      enrichmentTier: content.enrichmentTier,
      hasAIBio: !!content.aiBio,
      hasImageAnalysis: content.imageAnalyzed,
      tokensUsed: content.tokensUsed,
      updatedAt: content.updatedAt,
    });
  } catch (error) {
    console.error('Enrichment status error:', error);
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 });
  }
}

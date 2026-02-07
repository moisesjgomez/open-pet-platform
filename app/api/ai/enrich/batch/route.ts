/**
 * Batch Pet Enrichment API
 * 
 * POST /api/ai/enrich/batch
 * Enriches multiple pets with AI-generated descriptions and labels
 * 
 * Cost Controls:
 * - Admin only (prevents abuse)
 * - Budget threshold check (stops at 50% daily budget by default)
 * - Rate limited via existing Gemini controls
 * - Skips already-enriched pets
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { batchEnrichPets, EnrichmentTier } from '@/lib/ai/enrichment';
import { getRepository } from '@/lib/repository';

interface BatchEnrichRequest {
  source?: string;           // Data source to enrich (default: all)
  limit?: number;            // Max pets to process (default: 100)
  runAI?: boolean;           // Generate AI content (default: false = heuristics only)
  budgetThreshold?: number;  // Stop at % of daily budget (default: 0.5)
}

interface BatchEnrichResponse {
  success: boolean;
  message: string;
  stats: {
    enriched: number;
    skipped: number;
    aiGenerated: number;
    tokensUsed: number;
    stoppedEarly: boolean;
  };
}

export async function POST(request: NextRequest): Promise<NextResponse<BatchEnrichResponse>> {
  // Auth check - admin only
  const session = await auth();
  
  if (!session?.user) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Authentication required',
        stats: { enriched: 0, skipped: 0, aiGenerated: 0, tokensUsed: 0, stoppedEarly: false }
      },
      { status: 401 }
    );
  }

  // For now, allow any authenticated user in development
  // In production, check for admin role
  const isAdmin = session.user.email?.endsWith('@admin.com') || 
                  (session.user as { role?: string }).role === 'admin';
  
  if (process.env.NODE_ENV === 'production' && !isAdmin) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Admin access required',
        stats: { enriched: 0, skipped: 0, aiGenerated: 0, tokensUsed: 0, stoppedEarly: false }
      },
      { status: 403 }
    );
  }

  try {
    const body: BatchEnrichRequest = await request.json();
    const {
      source = 'all',
      limit = 100,
      runAI = false,
      budgetThreshold = 0.5,
    } = body;

    // Get pets from repository
    const repo = await getRepository();
    let pets = await repo.getAllPets();

    // Apply limit
    pets = pets.slice(0, Math.min(limit, 500)); // Hard cap at 500

    // Run batch enrichment
    const stats = await batchEnrichPets(pets, source, {
      runAI,
      budgetThreshold,
      chunkSize: 10,
      delayMs: runAI ? 2000 : 500, // Longer delay for AI calls
    });

    return NextResponse.json({
      success: true,
      message: stats.stoppedEarly 
        ? `Batch enrichment stopped early (budget threshold reached). Processed ${stats.enriched} pets.`
        : `Successfully enriched ${stats.enriched} pets.`,
      stats,
    });
  } catch (error) {
    console.error('Batch enrichment error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Batch enrichment failed',
        stats: { enriched: 0, skipped: 0, aiGenerated: 0, tokensUsed: 0, stoppedEarly: false }
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/enrich/batch
 * Get enrichment statistics
 */
export async function GET(): Promise<NextResponse> {
  const session = await auth();
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    // Import prisma dynamically to avoid build issues
    const { prisma, isDatabaseAvailable } = await import('@/lib/db');
    
    if (!(await isDatabaseAvailable())) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    // Get enrichment stats
    const [total, byTier, recentUsage] = await Promise.all([
      prisma.aIPetContent.count(),
      prisma.aIPetContent.groupBy({
        by: ['enrichmentTier'],
        _count: true,
      }),
      prisma.aIUsage.findMany({
        where: {
          date: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
        orderBy: { date: 'desc' },
      }),
    ]);

    const tierCounts: Record<EnrichmentTier, number> = {
      heuristic: 0,
      basic: 0,
      full: 0,
    };
    byTier.forEach(({ enrichmentTier, _count }) => {
      tierCounts[enrichmentTier as EnrichmentTier] = _count;
    });

    const totalTokens = recentUsage.reduce((sum, u) => sum + u.tokensUsed, 0);
    const totalCost = recentUsage.reduce((sum, u) => sum + u.estimatedCost, 0);

    return NextResponse.json({
      totalEnriched: total,
      byTier: tierCounts,
      last7Days: {
        tokensUsed: totalTokens,
        estimatedCost: totalCost.toFixed(4),
        requestCount: recentUsage.reduce((sum, u) => sum + u.requestCount, 0),
      },
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'Failed to get stats' }, { status: 500 });
  }
}

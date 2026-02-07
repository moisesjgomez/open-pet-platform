/**
 * AI Response Cache Layer
 * Stores AI responses in PostgreSQL to reduce API costs by ~80%
 * 
 * TTL Strategy:
 * - Embeddings: Indefinite (pets rarely change)
 * - Pet bios: 7 days
 * - Recommendations: 1 hour per user
 * - Chat responses: 24 hours for common questions
 */

import { prisma, isDatabaseAvailable } from '@/lib/db';
import { createHash } from 'crypto';

// Cache type definitions
export type CacheType = 'bio' | 'embedding' | 'recommendation' | 'chat';

// TTL in days for each cache type
const CACHE_TTL_DAYS: Record<CacheType, number | null> = {
  bio: 7,
  embedding: null, // Never expires
  recommendation: 1 / 24, // 1 hour
  chat: 1, // 24 hours
};

/**
 * Generate a cache key from input parameters
 */
export function generateCacheKey(type: CacheType, ...inputs: string[]): string {
  const combined = [type, ...inputs].join('::');
  return createHash('sha256').update(combined).digest('hex');
}

/**
 * Get a cached AI response
 * Returns null if not found or expired
 */
export async function getCached<T>(
  type: CacheType,
  key: string
): Promise<{ data: T; tokensUsed: number } | null> {
  const dbAvailable = await isDatabaseAvailable();
  if (!dbAvailable) {
    return null;
  }

  try {
    const cached = await prisma.aICache.findUnique({
      where: { cacheKey: key },
    });

    if (!cached) {
      return null;
    }

    // Check if expired
    if (cached.expiresAt && cached.expiresAt < new Date()) {
      // Delete expired entry
      await prisma.aICache.delete({ where: { cacheKey: key } });
      return null;
    }

    return {
      data: cached.response as T,
      tokensUsed: cached.tokensUsed,
    };
  } catch (error) {
    console.error('Cache read error:', error);
    return null;
  }
}

/**
 * Store an AI response in the cache
 */
export async function setCache<T>(
  type: CacheType,
  key: string,
  response: T,
  tokensUsed: number = 0,
  model?: string
): Promise<void> {
  const dbAvailable = await isDatabaseAvailable();
  if (!dbAvailable) {
    return;
  }

  try {
    const ttlDays = CACHE_TTL_DAYS[type];
    const expiresAt = ttlDays
      ? new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000)
      : null;

    await prisma.aICache.upsert({
      where: { cacheKey: key },
      update: {
        response: response as object,
        tokensUsed,
        model,
        expiresAt,
      },
      create: {
        cacheKey: key,
        cacheType: type,
        response: response as object,
        tokensUsed,
        model,
        expiresAt,
      },
    });
  } catch (error) {
    console.error('Cache write error:', error);
  }
}

/**
 * Delete a specific cache entry
 */
export async function deleteCache(key: string): Promise<void> {
  const dbAvailable = await isDatabaseAvailable();
  if (!dbAvailable) {
    return;
  }

  try {
    await prisma.aICache.delete({ where: { cacheKey: key } });
  } catch {
    // Ignore if not found
  }
}

/**
 * Clean up expired cache entries
 * Should be called periodically (e.g., daily cron job)
 */
export async function cleanupExpiredCache(): Promise<number> {
  const dbAvailable = await isDatabaseAvailable();
  if (!dbAvailable) {
    return 0;
  }

  try {
    const result = await prisma.aICache.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
    return result.count;
  } catch (error) {
    console.error('Cache cleanup error:', error);
    return 0;
  }
}

/**
 * Get cache statistics for monitoring
 */
export async function getCacheStats(): Promise<{
  totalEntries: number;
  byType: Record<string, number>;
  totalTokensSaved: number;
} | null> {
  const dbAvailable = await isDatabaseAvailable();
  if (!dbAvailable) {
    return null;
  }

  try {
    const [total, byType, tokenStats] = await Promise.all([
      prisma.aICache.count(),
      prisma.aICache.groupBy({
        by: ['cacheType'],
        _count: true,
      }),
      prisma.aICache.aggregate({
        _sum: { tokensUsed: true },
      }),
    ]);

    return {
      totalEntries: total,
      byType: byType.reduce(
        (acc, item) => ({ ...acc, [item.cacheType]: item._count }),
        {}
      ),
      totalTokensSaved: tokenStats._sum.tokensUsed || 0,
    };
  } catch (error) {
    console.error('Cache stats error:', error);
    return null;
  }
}

// In-memory fallback cache for when database is unavailable
const memoryCache = new Map<string, { data: unknown; expiresAt: number | null }>();

/**
 * Fallback to in-memory cache when database is unavailable
 */
export function getMemoryCached<T>(key: string): T | null {
  const cached = memoryCache.get(key);
  if (!cached) return null;
  
  if (cached.expiresAt && cached.expiresAt < Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  
  return cached.data as T;
}

export function setMemoryCache<T>(
  key: string,
  data: T,
  ttlMs: number | null = null
): void {
  memoryCache.set(key, {
    data,
    expiresAt: ttlMs ? Date.now() + ttlMs : null,
  });
  
  // Limit memory cache size
  if (memoryCache.size > 1000) {
    const firstKey = memoryCache.keys().next().value;
    if (firstKey) memoryCache.delete(firstKey);
  }
}

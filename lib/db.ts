/**
 * Prisma Client Singleton
 * Prevents multiple instances in development due to hot reloading
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Check if database is available
 * Returns false if DATABASE_URL is not set or connection fails
 */
export async function isDatabaseAvailable(): Promise<boolean> {
  if (!process.env.DATABASE_URL) {
    return false;
  }
  
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    console.warn('Database connection failed, falling back to heuristics mode');
    return false;
  }
}

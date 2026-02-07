/**
 * NextAuth.js Configuration
 * 
 * Provides authentication via:
 * - Google OAuth
 * - GitHub OAuth
 * - Email magic links (optional)
 */

import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import { prisma } from '@/lib/db';

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role || 'user';
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
    async authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isOnProtectedRoute = request.nextUrl.pathname.startsWith('/api/ai');
      const isOnAdminRoute = request.nextUrl.pathname.startsWith('/admin');

      // Protect AI API routes
      if (isOnProtectedRoute && !isLoggedIn) {
        return false;
      }

      // Protect admin routes
      if (isOnAdminRoute) {
        const isAdmin = (auth?.user as { role?: string })?.role === 'admin';
        return isAdmin;
      }

      return true;
    },
  },
  trustHost: true,
});

/**
 * Helper to get session in server components
 */
export async function getServerSession() {
  return await auth();
}

/**
 * Helper to require authentication
 * Throws if not authenticated
 */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }
  return session;
}

/**
 * Helper to require admin role
 */
export async function requireAdmin() {
  const session = await requireAuth();
  if ((session.user as { role?: string }).role !== 'admin') {
    throw new Error('Forbidden: Admin access required');
  }
  return session;
}

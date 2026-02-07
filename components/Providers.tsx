'use client';

/**
 * Session Provider Wrapper
 * Wraps the app with NextAuth SessionProvider
 */

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return <SessionProvider>{children}</SessionProvider>;
}

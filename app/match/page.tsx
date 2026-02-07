'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MatchPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to swipe page with filter panel
    router.replace('/swipe');
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
        <p className="text-slate-600 font-medium">Redirecting to swipe mode...</p>
      </div>
    </div>
  );
}

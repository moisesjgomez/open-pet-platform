'use client';

/**
 * Auth Error Page
 */

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const errorMessages: Record<string, string> = {
    Configuration: 'There is a problem with the server configuration.',
    AccessDenied: 'You do not have permission to sign in.',
    Verification: 'The verification link has expired or has already been used.',
    OAuthSignin: 'Error constructing the authorization URL.',
    OAuthCallback: 'Error handling the OAuth callback.',
    OAuthCreateAccount: 'Could not create an account using OAuth.',
    EmailCreateAccount: 'Could not create an account using email.',
    Callback: 'Error in the OAuth callback handler.',
    OAuthAccountNotLinked: 'This email is already associated with another account.',
    EmailSignin: 'The email could not be sent.',
    CredentialsSignin: 'The credentials you provided are invalid.',
    SessionRequired: 'You must be signed in to access this page.',
    Default: 'An unexpected error occurred.',
  };

  const message = error ? errorMessages[error] || errorMessages.Default : errorMessages.Default;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
        <div className="text-6xl mb-4">😿</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Authentication Error</h1>
        <p className="text-gray-600 mb-6">{message}</p>

        <div className="space-y-3">
          <Link
            href="/auth/signin"
            className="block w-full bg-orange-500 text-white rounded-lg px-4 py-3 font-medium hover:bg-orange-600 transition-colors"
          >
            Try Again
          </Link>
          <Link
            href="/"
            className="block w-full bg-gray-100 text-gray-700 rounded-lg px-4 py-3 font-medium hover:bg-gray-200 transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ErrorContent />
    </Suspense>
  );
}

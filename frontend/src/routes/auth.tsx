import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { z } from 'zod';
import { useAuth } from '@/lib/supabase/hooks/useAuth';

// Define search params schema for type safety
const authSearchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute('/auth')({
  // Validate and type search params
  validateSearch: authSearchSchema,
  // Redirect to home if already authenticated
  beforeLoad: ({ context, search }) => {
    const { auth } = context;

    if (auth.isAuthenticated) {
      // Redirect to the original destination or home
      // Now search.redirect is properly typed!
      throw redirect({
        to: search.redirect || '/',
      });
    }
  },
  component: Auth,
});

function Auth() {
  const navigate = useNavigate();
  // Use the useAuth hook directly for reactive state
  const auth = useAuth();
  const search = Route.useSearch();
  const [isRetrying, setIsRetrying] = useState(false);

  const handleSignIn = async () => {
    setIsRetrying(true);
    try {
      await auth.signInAnonymously();
      // If successful, navigate to original destination or home
      // search.redirect is now properly typed!
      const destination = search.redirect || '/';
      navigate({ to: destination });
    } catch (error) {
      console.error('Sign-in failed:', error);
      setIsRetrying(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await auth.logout();
    } catch (error) {
      console.error('Sign-out failed:', error);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Authentication</h1>

      <div className="space-y-4">
        <div className="p-4 border rounded">
          <h3 className="font-semibold mb-2">Current Status:</h3>
          {auth.isLoading ? (
            <p className="text-yellow-600">🔄 Loading...</p>
          ) : auth.isAuthenticated ? (
            <div>
              <p className="text-green-600 mb-2">✅ Authenticated</p>
              <div className="text-sm text-gray-600 space-y-1">
                <p>User ID: <code className="bg-gray-100 px-2 py-1 rounded">{auth.user?.id}</code></p>
                <p>Type: {auth.user?.is_anonymous ? 'Anonymous' : 'Registered'}</p>
              </div>
            </div>
          ) : (
            <p className="text-red-600">❌ Not authenticated</p>
          )}
        </div>

        <div className="space-y-2">
          {auth.isAuthenticated ? (
            <>
              <button
                onClick={() => navigate({ to: '/' })}
                className="w-full py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Go to Home
              </button>
              <button
                onClick={handleSignOut}
                className="w-full py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Sign Out
              </button>
            </>
          ) : (
            <button
              onClick={handleSignIn}
              disabled={isRetrying}
              className="w-full py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              {isRetrying ? 'Signing in...' : 'Sign In Anonymously'}
            </button>
          )}
        </div>

        <div className="p-4 bg-gray-50 border rounded text-sm text-gray-600">
          <h4 className="font-medium mb-2">About Anonymous Auth:</h4>
          <ul className="list-disc list-inside space-y-1">
            <li>No email or password required</li>
            <li>Automatically created when you visit the app</li>
            <li>Your session persists in your browser</li>
            <li>Clearing browser data will sign you out</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

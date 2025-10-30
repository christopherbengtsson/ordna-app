import { redirect } from '@tanstack/react-router';
import type { RouterContext } from '@/router';

/**
 * Protected route helper for TanStack Router beforeLoad hooks
 *
 * Following TanStack Router best practices:
 * - Automatically signs in anonymously if not authenticated
 * - Uses abort signals for proper cleanup
 * - Returns extended context for child routes
 * - Handles errors gracefully with redirect fallback
 *
 * Usage in route file:
 * ```tsx
 * export const Route = createFileRoute('/protected')({
 *   beforeLoad: protectedRoute,
 *   component: MyComponent,
 * })
 * ```
 *
 * Or use the pathless layout route pattern (recommended):
 * ```tsx
 * // routes/_authenticated.tsx
 * export const Route = createFileRoute('/_authenticated')({
 *   beforeLoad: protectedRoute,
 * })
 * ```
 */
export async function protectedRoute({
  context,
  location,
  abortController,
}: {
  context: RouterContext;
  location: { pathname: string };
  abortController: AbortController;
}) {
  const { auth, supabase } = context;

  // If already authenticated, return immediately
  if (auth.isAuthenticated) {
    return { user: auth.user };
  }

  // Check for aborted requests (user navigated away)
  if (abortController.signal.aborted) {
    return;
  }

  // Not authenticated - automatically sign in anonymously for seamless UX
  try {
    const { data, error } = await supabase.auth.signInAnonymously();

    if (error) throw error;

    // Return the new anonymous user in context
    return { user: data.user };
  } catch (error) {
    // Only redirect if request wasn't aborted
    if (!abortController.signal.aborted) {
      console.error('Failed to sign in anonymously:', error);

      // Redirect to auth page with return URL
      throw redirect({
        to: '/auth',
        search: {
          redirect: location.pathname,
        },
      });
    }
  }
}

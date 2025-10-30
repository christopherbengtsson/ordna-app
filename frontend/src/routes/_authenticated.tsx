import { createFileRoute, Outlet } from '@tanstack/react-router';
import { protectedRoute } from '@/lib/router/protectedRoute';

/**
 * Pathless layout route that protects all child routes
 *
 * This route doesn't affect URLs but ensures all children are authenticated.
 * Following TanStack Router best practices for route protection.
 *
 * Child routes will automatically inherit the authentication requirement
 * without needing individual beforeLoad hooks.
 *
 * To make a route protected, move it under this layout:
 * - Before: /routes/game-list.tsx
 * - After: /routes/_authenticated/game-list.tsx
 */
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: protectedRoute,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  // Simply render children - auth is already handled in beforeLoad
  return <Outlet />;
}

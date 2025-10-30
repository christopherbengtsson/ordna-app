import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { NotFoundPage } from '@/components/NotFoundPage';
import type { RouterContext } from '@/router';

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  // Show loading overlay while routes are loading
  pendingComponent: LoadingOverlay,
  // Handle not found errors at root level
  notFoundComponent: NotFoundPage,
});

function RootLayout() {
  return (
    <>
      <div className="flex min-h-[100dvh] flex-col bg-background px-4 pb-[max(1rem,var(--safe-area-inset-bottom))] pt-[max(1rem,var(--safe-area-inset-top))] md:px-6 md:pb-[max(1.5rem,var(--safe-area-inset-bottom))] md:pt-[max(1.5rem,var(--safe-area-inset-top))] lg:px-8 lg:pb-[max(2rem,var(--safe-area-inset-bottom))] lg:pt-[max(2rem,var(--safe-area-inset-top))]">
        <Outlet />
      </div>
      <TanStackRouterDevtools />
    </>
  );
}

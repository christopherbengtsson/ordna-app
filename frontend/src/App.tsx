import { useMemo } from 'react';
import { RouterProvider } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/supabase/hooks/useAuth';
import { supabaseClient } from '@/lib/supabase/client/supabaseClient';
import { router } from './router';
import { LoadingOverlay } from './components/LoadingOverlay';
import { InstallPrompt } from '@/feature/pwa/InstallPrompt';

export function App() {
  const auth = useAuth();
  const queryClient = useQueryClient();

  const routerContext = useMemo(
    () => ({
      auth,
      supabase: supabaseClient,
      queryClient,
    }),
    [auth, queryClient],
  );

  // Single loading state - only show while auth is initializing
  if (auth.isLoading) {
    return <LoadingOverlay />;
  }

  return (
    <>
      <RouterProvider router={router} context={routerContext} />
      <InstallPrompt />
    </>
  );
}

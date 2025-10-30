import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import { type AuthState } from './lib/supabase/model/AuthState';
import { type SupabaseClient } from '@supabase/supabase-js';
import { type QueryClient } from '@tanstack/react-query';
import { NotFoundPage } from './components/NotFoundPage';

// Define router context type with all necessary dependencies
export interface RouterContext {
  auth: AuthState;
  supabase: SupabaseClient;
  queryClient: QueryClient;
}

export const router = createRouter({
  routeTree,
  context: {
    auth: undefined!,
    supabase: undefined!,
    queryClient: undefined!,
  },
  defaultPreload: 'intent', // Preload on hover for better UX
  defaultPreloadStaleTime: 0, // Let React Query handle staleness
  defaultNotFoundComponent: NotFoundPage,
  notFoundMode: 'fuzzy', // Smart matching for better UX
});

// Register router types for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

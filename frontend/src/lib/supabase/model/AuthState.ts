import type { Session, User } from '@supabase/supabase-js';

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  session: Session | null;
  signInAnonymously: (
    nickname?: string,
    skipLoading?: boolean,
  ) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

import { type Session, type User } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabaseClient } from './client/supabaseClient';
import { AuthContext } from './context/AuthContext';
import { useProfile } from '../../common/hooks/useProfile';
import { NotificationService } from '../firebase/service/NotificationService';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // preload profile
  useProfile(user?.id);

  // Memoized sign-in function
  const signInAnonymously = useCallback(
    async (nickname?: string, skipLoading?: boolean) => {
      console.debug('Creating user from authProvider');
      if (!skipLoading) {
        setIsLoading(true);
      }

      const options = nickname ? { data: { nickname } } : undefined;
      const { error } = await supabaseClient.auth.signInAnonymously({
        options,
      });

      if (error) {
        console.error('Error signing in anonymously:', error);
        setIsLoading(false);
        throw error;
      }
      // Don't set loading to false here - let the auth state change listener handle it
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await NotificationService.unregisterFCMToken();
    } catch (error) {
      console.error('Error clearing FCM token:', error);
      // Continue with logout even if token cleanup fails
    }

    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Set up auth state change listener first
    const { data: authListener } = supabaseClient.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      },
    );

    // Then check for existing session
    supabaseClient.auth
      .getSession()
      .then(async ({ data: { session }, error }) => {
        if (!mounted) return;

        if (error) {
          console.error('Error getting session:', error);
          setIsLoading(false);
          return;
        }

        if (session) {
          setSession(session);
          setUser(session.user);
          setIsLoading(false);
        } else {
          // No session exists - just set loading to false
          // Routes can trigger sign-in as needed (via protectedRoute or manually)
          setIsLoading(false);
        }
      })
      .catch((err) => console.error(err));

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [signInAnonymously]);

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      isAuthenticated: !!user,
      user,
      session,
      signInAnonymously,
      logout,
      isLoading,
    }),
    [user, session, signInAnonymously, logout, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

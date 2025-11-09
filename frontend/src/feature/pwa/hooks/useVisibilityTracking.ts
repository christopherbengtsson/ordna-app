import { useEffect } from 'react';
import { supabaseClient } from '@/lib/supabase/client/supabaseClient';

/**
 * Hook to track app visibility using the Page Visibility API
 *
 * Updates the user's `is_app_visible` flag in the database when the
 * tab/window becomes visible or hidden. This is used to suppress push
 * notifications while the user has the app open.
 *
 * Also updates `last_seen` when becoming visible as a heartbeat mechanism
 * for crash detection.
 */

const setAppVisibility = async (visible: boolean) => {
  supabaseClient.rpc('set_app_visibility', { visible }).then(({ error }) => {
    if (error) {
      console.error(error.message);
    }
  });
};

export const useVisibilityTracking = () => {
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      setAppVisibility(isVisible);
    };

    setAppVisibility(!document.hidden);

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      setAppVisibility(false);
    };
  }, []);
};

import { useSyncExternalStore } from 'react';

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (callback) => {
      const result = matchMedia(query);
      result.addEventListener('change', callback);
      return () => result.removeEventListener('change', callback);
    },
    () => matchMedia(query).matches,
  );
}

import type { TurnResult } from '@/feature/turn-result/model/TurnResult';
import type { router } from '../router';

declare module '@tanstack/react-router' {
  interface HistoryState {
    turnResult: TurnResult;
  }

  interface Register {
    router: typeof router;
  }
}

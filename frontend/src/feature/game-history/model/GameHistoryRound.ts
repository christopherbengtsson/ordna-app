import type { Database } from '@/common/model/generated/Database';
import type { GameHistoryMove } from './GameHistoryMove';

export interface GameHistoryRound {
  roundId: string;
  roundNumber: number;
  startedAt: Date;
  completedAt: Date;
  resolutionType: Database['public']['Enums']['resolution_type'] | null;
  playerWithMark: string | null;
  playerWithMarkNickname: string | null;
  moves: GameHistoryMove[];
}

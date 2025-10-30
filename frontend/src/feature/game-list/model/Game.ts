import type { Database } from '@/common/model/generated/Database';
import type { GameStatus } from './GameStatus';

export interface Game {
  id: string;
  isHost: boolean;
  isCurrentPlayer: boolean;
  status: GameStatus;
  currentPlayerId: string | undefined;
  deadline: Date | undefined;
  players: string[] | undefined;
  round: number | undefined;
  winnerId: string | undefined;
  lastMoveType: Database['public']['Enums']['move_type'];
  completeWord: string | undefined;
}

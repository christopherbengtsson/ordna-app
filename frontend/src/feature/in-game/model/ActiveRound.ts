import type { Database } from '../../../common/model/generated/Database';
import type { GameStatus } from '../../game-list/model/GameStatus';

export interface ActiveRound {
  id: string;
  roundNumber: number;
  startingPlayerId: string;
  currentPlayerId: string;
  currentSequence: string[];
  status: GameStatus;
  turnDeadline: Date;
  resolutionType: Database['public']['Enums']['resolution_type'];
  markedPlayer: string | undefined;
  startedAt: Date;
  completedAt: Date | undefined;
  lastMoveType: Database['public']['Enums']['move_type'] | undefined;
}

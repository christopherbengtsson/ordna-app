import type { GameStatus } from '../../game-list/model/GameStatus';
import type { ActiveRound } from './ActiveRound';
import type { GamePlayer } from './GamePlayer';
import type { GameSettings } from './GameSettings';

export interface GameData {
  activeRound: ActiveRound | undefined;
  completedAt: Date | undefined;
  currentPlayerId: string;
  currentRound: number;
  gameId: string;
  hostPlayerId: string;
  isCurrentPlayer: boolean;
  players: GamePlayer[];
  settings: GameSettings;
  startedAt: Date;
  status: GameStatus;
  winnerId: string;
}

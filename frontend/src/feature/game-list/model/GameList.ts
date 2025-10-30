import type { Game } from './Game';

export interface GameList {
  currentTurn: Game[];
  waiting: Game[];
  pending: Game[];
  finished: Game[];
}

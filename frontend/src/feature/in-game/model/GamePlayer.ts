export interface GamePlayer {
  id: string;
  nickname: string;
  marks: number;
  isEliminated: boolean;
  joinOrder: number;
  isHost: boolean;
}

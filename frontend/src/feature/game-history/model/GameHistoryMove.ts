import type { Database } from '@/common/model/generated/Database';

export interface GameHistoryMove {
  moveOrder: number;
  playerId: string;
  playerNickname: string;
  moveType: Database['public']['Enums']['move_type'];
  letterValue: string | null;
  wordValue: string | null;
  createdAt: Date;
}

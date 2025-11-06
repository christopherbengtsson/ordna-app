import type { Database } from '@/common/model/generated/Database';

export interface TurnResult {
  markedPlayerId: string | undefined;
  markedPlayerNickname: string | undefined;
  eliminatedPlayerId: string | undefined;
  startsNextRoundPlayerId: string | undefined;
  startsNextRoundPlayerNickname: string | undefined;
  sequence: string;
  moveType: Database['public']['Enums']['move_type'];
  resolutionType: Database['public']['Enums']['resolution_type'] | undefined;
  roundStatus: Database['public']['Enums']['round_status'];
  gameStatus: Database['public']['Enums']['game_status'];
}

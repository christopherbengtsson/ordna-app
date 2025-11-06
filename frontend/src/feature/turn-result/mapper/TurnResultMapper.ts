import type { Database } from '@/common/model/generated/Database';
import type { TurnResult } from '../model/TurnResult';

const fromRpc = (
  data: Database['public']['CompositeTypes']['turn_result'],
): TurnResult => ({
  markedPlayerId: data.marked_player_id ?? undefined,
  markedPlayerNickname: data.marked_player_nickname ?? undefined,
  eliminatedPlayerId: data.eliminated_player_id ?? undefined,
  startsNextRoundPlayerId: data.starts_next_round_player_id ?? undefined,
  startsNextRoundPlayerNickname:
    data.starts_next_round_player_nickname ?? undefined,
  sequence: data.sequence as string,
  moveType: data.move_type as Database['public']['Enums']['move_type'],
  resolutionType: data.resolution_type as
    | Database['public']['Enums']['resolution_type']
    | undefined,
  roundStatus: data.round_status as Database['public']['Enums']['round_status'],
  gameStatus: data.game_status as Database['public']['Enums']['game_status'],
});

export const TurnResultMapper = {
  fromRpc,
};

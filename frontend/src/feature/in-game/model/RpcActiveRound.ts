import type { Database } from '../../../common/model/generated/Database';

export interface RpcActiveRound {
  id: string;
  round_number: number;
  starting_player_id: string;
  current_player_id: string;
  current_sequence: string | null;
  status: Database['public']['Enums']['round_status'];
  turn_deadline: string;
  resolution_type: Database['public']['Enums']['resolution_type'] | null;
  player_with_mark: string | null;
  started_at: string;
  completed_at: string | null;
  last_move_type: Database['public']['Enums']['move_type'] | null;
}

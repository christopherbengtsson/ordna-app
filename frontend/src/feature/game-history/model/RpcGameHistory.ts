import type { Database } from '@/common/model/generated/Database';

export type RpcGameHistory =
  Database['public']['Functions']['get_game_history']['Returns'];
export type RpcGameHistoryRound = RpcGameHistory[0];

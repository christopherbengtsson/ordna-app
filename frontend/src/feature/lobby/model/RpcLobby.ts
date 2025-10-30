import type { Database } from '../../../common/model/generated/Database';

export type RpcLobby =
  Database['public']['Functions']['get_lobby_by_game_id']['Returns'][0];

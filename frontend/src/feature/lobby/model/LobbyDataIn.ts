import type { Database } from '@/common/model/generated/Database';

export type LobbyDataIn =
  Database['public']['Functions']['get_lobby_by_game_id']['Args'];

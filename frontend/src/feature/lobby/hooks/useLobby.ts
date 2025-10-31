import { useQuery } from '@tanstack/react-query';
import { supabaseClient } from '@/lib/supabase/client/supabaseClient';
import type { LobbyDataIn } from '../model/LobbyDataIn';
import { LobbyMapper } from '../mapper/LobbyMapper';
import type { Lobby } from '../model/Lobby';
import { FetchUtil } from '../../../common/util/constant/queryKey';

const fetchLobby = async (args: LobbyDataIn): Promise<Lobby> => {
  const { data } = await supabaseClient
    .rpc('get_lobby_by_game_id', args)
    .single()
    .throwOnError();

  return LobbyMapper.fromRpc(data);
};

export const useLobby = (gameId: string) => {
  const { data, error, isPending } = useQuery({
    queryFn: () => fetchLobby({ p_game_id: gameId }),
    queryKey: [FetchUtil.QUERY_KEY.GAME_LOBBY, gameId],
  });

  return {
    lobbyData: data,
    error,
    isFetchingLobbyData: isPending,
  };
};

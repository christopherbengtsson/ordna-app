import { useQuery } from '@tanstack/react-query';
import { supabaseClient } from '../../../lib/supabase/client/supabaseClient';
import { GameMapper } from '../mapper/GameMapper';
import type { GameData } from '../model/GameData';
import { FetchUtil } from '../../../common/util/constant/FetchUtil';

const getGameData = async (gameId: string): Promise<GameData> => {
  const { data } = await supabaseClient
    .rpc('get_game_by_id', { p_game_id: gameId })
    .single()
    .throwOnError();

  return GameMapper.fromRpc(data);
};

export const useGameData = (gameId: string, poll = false) => {
  const { data, isPending, isFetching, error } = useQuery({
    queryFn: () => getGameData(gameId),
    queryKey: [FetchUtil.QUERY_KEY.GAME_DATA, gameId],
    refetchInterval: poll ? FetchUtil.DEFAULT_POLL_INTERVAL : false,
  });

  return {
    gameData: data,
    isLoading: isPending,
    isUpdating: isFetching,
    error,
  };
};

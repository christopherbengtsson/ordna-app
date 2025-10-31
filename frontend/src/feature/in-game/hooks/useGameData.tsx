import { useQuery } from '@tanstack/react-query';
import { supabaseClient } from '../../../lib/supabase/client/supabaseClient';
import { GameMapper } from '../mapper/GameMapper';
import type { GameData } from '../model/GameData';
import { FetchUtil } from '../../../common/util/constant/queryKey';

const POLL_INTERVAL = 15_000;

const getGameData = async (gameId: string): Promise<GameData> => {
  const { data } = await supabaseClient
    .rpc('get_game_by_id', { p_game_id: gameId })
    .single()
    .throwOnError();

  return GameMapper.fromRpc(data);
};

export const useGameData = (gameId: string, poll = false) => {
  const { data, isPending, error } = useQuery({
    queryFn: () => getGameData(gameId),
    queryKey: [FetchUtil.QUERY_KEY.GAME_DATA, gameId],
    refetchInterval: poll ? POLL_INTERVAL : false,
  });

  return {
    gameData: data,
    isLoading: isPending,
    error,
  };
};

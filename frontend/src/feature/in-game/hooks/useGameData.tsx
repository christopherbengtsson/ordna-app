import { useQuery } from '@tanstack/react-query';
import { supabaseClient } from '../../../lib/supabase/client/supabaseClient';
import { GameMapper } from '../mapper/GameMapper';
import type { GameData } from '../model/GameData';
import { QUERY_KEY } from '../../../common/util/constant/queryKey';

const getGameData = async (gameId: string): Promise<GameData> => {
  const { data } = await supabaseClient
    .rpc('get_game_by_id', { p_game_id: gameId })
    .single()
    .throwOnError();

  return GameMapper.fromRpc(data);
};

export const useGameData = (gameId: string) => {
  const { data, isPending } = useQuery({
    queryFn: () => getGameData(gameId),
    queryKey: [QUERY_KEY.GAME_DATA, gameId],
  });

  return {
    gameData: data,
    isLoading: isPending,
  };
};

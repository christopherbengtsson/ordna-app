import { useQuery } from '@tanstack/react-query';
import { supabaseClient } from '@/lib/supabase/client/supabaseClient';
import { FetchUtil } from '@/common/util/constant/queryKey';
import { GameHistoryMapper } from '../mapper/GameHistoryMapper';
import type { GameHistory } from '../model/GameHistory';

const fetchGameHistory = async (gameId: string): Promise<GameHistory> => {
  const { data } = await supabaseClient
    .rpc('get_game_history', { p_game_id: gameId })
    .throwOnError();

  return GameHistoryMapper.fromRpc(data);
};

export const useGameHistory = (gameId: string) => {
  const { data, isPending, error } = useQuery({
    queryKey: [FetchUtil.QUERY_KEY.GAME_HISTORY, gameId],
    queryFn: () => fetchGameHistory(gameId),
  });

  return {
    history: data,
    isLoading: isPending,
    error,
  };
};

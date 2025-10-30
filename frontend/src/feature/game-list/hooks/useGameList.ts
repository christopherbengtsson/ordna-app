import { useQuery } from '@tanstack/react-query';
import { supabaseClient } from '../../../lib/supabase/client/supabaseClient';
import type { Database } from '../../../common/model/generated/Database';
import { GameListMapper } from '../mapper/GameListMapper';
import { QUERY_KEY } from '../../../common/util/constant/queryKey';

const fetchGames = async (
  args: Required<Database['public']['Functions']['get_games']['Args']>,
) => {
  const { data } = await supabaseClient.rpc('get_games', args).throwOnError();

  return GameListMapper.fromRpc(data);
};

export const useGameList = () => {
  const { data, isPending } = useQuery({
    queryKey: [QUERY_KEY.GAME_LIST],
    queryFn: () => fetchGames({ p_limit: 50, p_offset: 0 }),
    refetchInterval: 15_000, // Poll every 15 seconds
  });

  return { games: data, isLoading: isPending };
};

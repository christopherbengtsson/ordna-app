import { useEffect } from 'react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabaseClient } from '@/lib/supabase/client/supabaseClient';
import type { Database } from '@/common/model/generated/Database';
import { FetchUtil } from '@/common/util/constant/queryKey';
import { GameListMapper } from '../mapper/GameListMapper';

const fetchGames = async (
  args: Required<Database['public']['Functions']['get_games']['Args']>,
) => {
  const { data } = await supabaseClient.rpc('get_games', args).throwOnError();

  return GameListMapper.fromRpc(data);
};

export const useGameList = () => {
  const { data, isPending, error } = useQuery({
    queryKey: [FetchUtil.QUERY_KEY.GAME_LIST],
    queryFn: () => fetchGames({ p_limit: 50, p_offset: 0 }), // TODO: Handle pagination
    refetchInterval: FetchUtil.DEFAULT_POLL_INTERVAL,
  });

  useEffect(() => {
    if (error) {
      toast.error('Could not load games', {
        id: FetchUtil.QUERY_KEY.GAME_LIST,
      });
    }
  }, [error]);

  return { games: data, isLoading: isPending, error };
};

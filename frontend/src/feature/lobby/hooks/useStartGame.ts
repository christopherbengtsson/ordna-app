import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from '@/lib/supabase/client/supabaseClient';
import { FetchUtil, type QueryKey } from '@/common/util/constant/FetchUtil';
import type { StartGameIn } from '../model/StartGameIn';

const startGame = async (args: StartGameIn) => {
  const { data } = await supabaseClient
    .rpc('start_game', args)
    .single()
    .throwOnError();

  return data;
};

export const useStartGame = (gameId: string) => {
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: (args: StartGameIn) => startGame(args),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0] as QueryKey;
          const param: string = query.queryKey[1] as string;

          return (
            key === FetchUtil.QUERY_KEY.GAME_LIST ||
            (key === FetchUtil.QUERY_KEY.GAME_DATA && param === gameId) ||
            (key === FetchUtil.QUERY_KEY.GAME_LOBBY && param === gameId)
          );
        },
      });
    },
  });

  return {
    startGame: mutate,
    isStarting: isPending,
  };
};

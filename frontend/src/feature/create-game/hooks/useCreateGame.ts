import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from '../../../lib/supabase/client/supabaseClient';
import type { CreateGameIn } from '../model/CreateGameIn';
import { QUERY_KEY } from '../../../common/util/constant/queryKey';

const defaultArgs: CreateGameIn = {
  p_complete_move_timeout_seconds: 86400, // 24 hours
  p_marks_to_eliminate: 3,
  p_max_players: 4,
  p_min_word_length: 1,
};

const createGame = async (args: CreateGameIn) => {
  const { data } = await supabaseClient
    .rpc('create_game', { ...defaultArgs, ...args })
    .single()
    .throwOnError();

  return data;
};

export const useCreateGame = () => {
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: (args: CreateGameIn) => createGame(args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY.GAME_LIST] });
    },
  });

  return {
    createGame: mutate,
    isCreatingGame: isPending,
  };
};

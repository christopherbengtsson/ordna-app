import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from '@/lib/supabase/client/supabaseClient';
import type { AcceptInviteIn } from '../model/AcceptInviteIn';
import { QUERY_KEY } from '../../../common/util/constant/queryKey';

const acceptInvite = async (args: AcceptInviteIn) => {
  const { data } = await supabaseClient
    .rpc('accept_invite', args)
    .single()
    .throwOnError();

  return data;
};

export const useInitiation = () => {
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: (args: AcceptInviteIn) => acceptInvite(args),
    onSuccess: (data) => {
      const gameId = data.game_id;
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY.GAME_LIST] });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY.GAME_LOBBY, gameId],
      });
    },
  });

  return {
    acceptInvite: mutate,
    isAccepting: isPending,
  };
};

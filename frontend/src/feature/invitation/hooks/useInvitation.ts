import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from '@/lib/supabase/client/supabaseClient';
import { FetchUtil } from '@/common/util/constant/FetchUtil';
import type { AcceptInviteIn } from '../model/AcceptInviteIn';

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
      queryClient.invalidateQueries({
        queryKey: [FetchUtil.QUERY_KEY.GAME_LIST],
      });
      queryClient.invalidateQueries({
        queryKey: [FetchUtil.QUERY_KEY.GAME_LOBBY, gameId],
      });
    },
  });

  return {
    acceptInvite: mutate,
    isAccepting: isPending,
  };
};

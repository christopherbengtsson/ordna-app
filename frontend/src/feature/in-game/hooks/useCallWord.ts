import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabaseClient } from '@/lib/supabase/client/supabaseClient';
import { QUERY_KEY } from '@/common/util/constant/queryKey';
import { Route } from '@/routes/_authenticated/game.$gameId';

const callWord = async (gameId: string) => {
  await supabaseClient.rpc('call_word', { p_game_id: gameId });
};

export const useCallWord = (gameId: string) => {
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: callWord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY.GAME_LIST] });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY.GAME_DATA, gameId],
      });

      toast.success('Completed word called');

      navigate({
        to: '/waiting-room/$gameId',
        params: { gameId },
        replace: true,
      });
    },
    onError: (error) => {
      toast.error(`Error: ${error.message ?? 'Unknown error'}`);
    },
  });

  return {
    callWord: mutate,
    isCallingWord: isPending,
  };
};

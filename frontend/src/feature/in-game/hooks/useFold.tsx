import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabaseClient } from '@/lib/supabase/client/supabaseClient';
import { QUERY_KEY } from '@/common/util/constant/queryKey';
import { Route } from '@/routes/_authenticated/game.$gameId';

const fold = async (gameId: string) => {
  await supabaseClient.rpc('fold', { p_game_id: gameId }).throwOnError();
};

export const useFold = (gameId: string) => {
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: fold,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY.GAME_LIST] });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY.GAME_DATA, gameId],
      });

      toast.success('Turn folded');

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
    fold: mutate,
    isFolding: isPending,
  };
};

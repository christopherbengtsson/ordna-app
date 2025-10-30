import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabaseClient } from '@/lib/supabase/client/supabaseClient';
import type { Database } from '@/common/model/generated/Database';
import { QUERY_KEY } from '@/common/util/constant/queryKey';
import { Route } from '@/routes/_authenticated/game.$gameId';

const resolveBluff = async (
  args: Database['public']['Functions']['resolve_bluff']['Args'],
) => {
  await supabaseClient.rpc('resolve_bluff', args).throwOnError();
};

export const useResolveBluff = (gameId: string) => {
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: ({ gameId, word }: { word: string; gameId: string }) =>
      resolveBluff({ p_game_id: gameId, p_word: word }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY.GAME_LIST] });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY.GAME_DATA, gameId],
      });

      toast.success('Bluff resolved');

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
    resolveBluff: mutate,
    isResolvingBluff: isPending,
  };
};

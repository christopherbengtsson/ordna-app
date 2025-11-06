import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { FetchUtil } from '@/common/util/constant/queryKey';
import type { TurnResult } from '../../turn-result/model/TurnResult';

export const useGameAction = <TVariables>(
  gameId: string,
  mutationFn: (variables: TVariables) => Promise<TurnResult>,
) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation<TurnResult, Error, TVariables>({
    mutationFn,
    onSuccess: (turnResult) => {
      queryClient.invalidateQueries({
        queryKey: [FetchUtil.QUERY_KEY.GAME_LIST],
      });
      queryClient.invalidateQueries({
        queryKey: [FetchUtil.QUERY_KEY.GAME_DATA, gameId],
      });

      if (turnResult.roundStatus === 'completed') {
        queryClient.invalidateQueries({
          queryKey: [FetchUtil.QUERY_KEY.GAME_HISTORY, gameId],
        });
      }

      if (turnResult.gameStatus === 'completed') {
        navigate({
          to: '/game-over/$gameId',
          params: { gameId },
          state: { turnResult },
          replace: true,
        });
      } else {
        navigate({
          to: '/waiting-room/$gameId',
          params: { gameId },
          state: { turnResult },
          replace: true,
        });
      }
    },
    onError: (error) => {
      toast.error(`Error: ${error.message ?? 'Unknown error'}`);
    },
  });

  return {
    mutate,
    isPending,
  };
};

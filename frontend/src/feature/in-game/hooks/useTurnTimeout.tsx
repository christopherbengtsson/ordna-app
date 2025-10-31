import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabaseClient } from '@/lib/supabase/client/supabaseClient';
import { FetchUtil } from '@/common/util/constant/queryKey';
import { Route } from '@/routes/_authenticated/game.$gameId';

const callMoveTimeout = async (gameId: string) => {
  await supabaseClient
    .rpc('call_in_game_timeout', { p_game_id: gameId })
    .throwOnError();
};

export const useTurnTimeout = (gameId: string) => {
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();

  const [turnDeadline, setTurnDeadline] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState('');

  const timeoutStarted = !!timeLeft.length;

  const { mutate, isPending } = useMutation({
    mutationFn: callMoveTimeout,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [FetchUtil.QUERY_KEY.GAME_LIST],
      });
      queryClient.invalidateQueries({
        queryKey: [FetchUtil.QUERY_KEY.GAME_DATA, gameId],
      });

      toast.success('Turn timed out');

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

  const handleTimeout = useCallback(() => {
    setTimeLeft("Time's up!");
    setTurnDeadline(null);

    mutate(gameId);
  }, [gameId, mutate]);

  useEffect(() => {
    if (!turnDeadline) return;

    let interval: number | undefined = undefined;

    const updateTimer = () => {
      const now = new Date().getTime();
      const distance = turnDeadline.getTime() - now;

      if (distance < 0) {
        clearInterval(interval);
        handleTimeout();
        return;
      }

      const hours = Math.floor(distance / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m left`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')} left`);
      } else {
        setTimeLeft(`${seconds}s left`);
      }
    };

    updateTimer();
    interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [handleTimeout, turnDeadline]);

  return {
    setTurnDeadline,

    timeLeft,
    timeoutStarted,

    isCallingTimeout: isPending,
  };
};

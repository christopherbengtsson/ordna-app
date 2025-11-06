import { useEffect, useState } from 'react';
import { useGameAction } from './useGameAction';
import { GameActionService } from '../service/GameActionService';

export const useTurnTimeout = (gameId: string) => {
  const [turnDeadline, setTurnDeadline] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [intervalMs, setIntervalMs] = useState(1000);

  const timeoutStarted = !!timeLeft.length;

  const { mutate, isPending } = useGameAction(
    gameId,
    GameActionService.callMoveTimeout,
  );

  useEffect(() => {
    if (!turnDeadline) return;

    let interval: number | undefined = undefined;

    const updateTimer = () => {
      const now = new Date().getTime();
      const distance = turnDeadline.getTime() - now;

      if (distance < 0) {
        clearInterval(interval);
        setTimeLeft("Time's up!");
        setTurnDeadline(null);

        mutate({ p_game_id: gameId });
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
    interval = setInterval(updateTimer, intervalMs);

    return () => clearInterval(interval);
  }, [gameId, intervalMs, mutate, turnDeadline]);

  return {
    setTurnDeadline,
    setIntervalMs,

    timeLeft,
    timeoutStarted,

    isCallingTimeout: isPending,
  };
};

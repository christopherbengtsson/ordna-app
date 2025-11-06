import { useRouterState } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Route } from '@/routes/_authenticated/game-over.$gameId';
import { useAuth } from '@/lib/supabase/hooks/useAuth';
import { useNavigateOnError } from '@/common/hooks/useNavigateOnError';
import { TurnResultDrawer } from '@/feature/turn-result/container/TurnResultDrawer';
import { useGameData } from '../../in-game/hooks/useGameData';
import { useGameHistory } from '../../game-history/hooks/useGameHistory';
import { LoadingGameOver } from '../component/LoadingGameOver';
import { GameOverContainer } from '../container/GameOverContainer';

export function GameOverPage() {
  const { gameId } = Route.useParams();
  const navigate = Route.useNavigate();
  const { user } = useAuth();
  const { gameData, isLoading, error } = useGameData(gameId);
  const { history, isLoading: isHistoryLoading } = useGameHistory(gameId);
  const { turnResult } = useRouterState({ select: (s) => s.location.state });

  const [dismissed, setDismissed] = useState(false);

  useNavigateOnError(error, 'Could not find game');

  useEffect(() => {
    if (!isLoading && gameData && gameData.status !== 'completed') {
      navigate({ to: '/', replace: true });
    }
  }, [gameData, isLoading, navigate]);

  const handleModalOpenChange = (open: boolean) => {
    if (!open) setDismissed(true);
  };

  if (isLoading || !gameData || !user?.id) {
    return <LoadingGameOver />;
  }

  return (
    <>
      <GameOverContainer
        gameData={gameData}
        history={history}
        isHistoryLoading={isHistoryLoading}
      />
      {turnResult && (
        <TurnResultDrawer
          open={!dismissed}
          onOpenChange={handleModalOpenChange}
          turnResult={turnResult}
          userId={user.id}
        />
      )}
    </>
  );
}

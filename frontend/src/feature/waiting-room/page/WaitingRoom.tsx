import { useEffect, useState } from 'react';
import { useRouterState } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Route } from '@/routes/_authenticated/waiting-room.$gameId';
import { useAuth } from '@/lib/supabase/hooks/useAuth';
import { useNavigateOnError } from '@/common/hooks/useNavigateOnError';
import { TurnResultDrawer } from '@/feature/turn-result/container/TurnResultDrawer';
import { useGameData } from '../../in-game/hooks/useGameData';
import { useGameHistory } from '../../game-history/hooks/useGameHistory';
import { LoadingWaitingRoom } from '../component/LoadingWaitingRoom';
import { WaitingRoomContainer } from '../container/WaitingRoomContainer';

export function WaitingRoomPage() {
  const { t } = useTranslation('validation');
  const { gameId } = Route.useParams();
  const navigate = Route.useNavigate();
  const { turnResult } = useRouterState({ select: (s) => s.location.state });
  const { user } = useAuth();

  const { gameData, isLoading, isUpdating, error } = useGameData(gameId, true);
  const { history, isLoading: isHistoryLoading } = useGameHistory(gameId);

  const [dismissed, setDismissed] = useState(false);

  useNavigateOnError(error, t('toast.error.gameNotFound'));

  useEffect(() => {
    // Don't navigate away if we have turnResult since we then been navigated to this page from in-game
    if (isLoading || isUpdating || !!turnResult) return;

    if (gameData?.status === 'active' && gameData?.isCurrentPlayer === true) {
      navigate({ to: '/game/$gameId', params: { gameId }, replace: true });
    } else if (gameData?.status === 'completed') {
      navigate({
        to: '/game-over/$gameId',
        params: { gameId },
        state: { turnResult },
        replace: true,
      });
    }
  }, [
    gameData?.isCurrentPlayer,
    gameData?.status,
    gameId,
    isLoading,
    isUpdating,
    navigate,
    turnResult,
  ]);

  if (isLoading || !gameData || !user?.id) {
    return <LoadingWaitingRoom />;
  }

  return (
    <>
      <WaitingRoomContainer
        gameData={gameData}
        history={history}
        isHistoryLoading={isHistoryLoading}
      />

      {turnResult && (
        <TurnResultDrawer
          open={!dismissed}
          onOpenChange={(open) => {
            if (!open) setDismissed(true);
          }}
          turnResult={turnResult}
          userId={user.id}
        />
      )}
    </>
  );
}

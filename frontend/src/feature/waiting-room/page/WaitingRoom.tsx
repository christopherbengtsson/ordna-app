import { useEffect } from 'react';
import { Route } from '@/routes/_authenticated/waiting-room.$gameId';
import { useNavigateOnError } from '@/common/hooks/useNavigateOnError';
import { useGameData } from '../../in-game/hooks/useGameData';
import { useGameHistory } from '../../game-history/hooks/useGameHistory';
import { LoadingWaitingRoom } from '../component/LoadingWaitingRoom';
import { WaitingRoomContainer } from '../container/WaitingRoomContainer';

export function WaitingRoomPage() {
  const { gameId } = Route.useParams();
  const navigate = Route.useNavigate();
  const { gameData, isLoading, isUpdating, error } = useGameData(gameId, true);
  const { history, isLoading: isHistoryLoading } = useGameHistory(gameId);

  useNavigateOnError(error, 'Could not find game');

  useEffect(() => {
    if (isLoading || isUpdating) return;

    if (gameData?.status === 'active' && gameData?.isCurrentPlayer === true) {
      navigate({ to: '/game/$gameId', params: { gameId }, replace: true });
    } else if (gameData?.status === 'completed') {
      navigate({ to: '/game-over/$gameId', params: { gameId }, replace: true });
    }
  }, [
    gameData?.isCurrentPlayer,
    gameData?.status,
    gameId,
    isLoading,
    isUpdating,
    navigate,
  ]);

  if (isLoading || !gameData) {
    return <LoadingWaitingRoom />;
  }

  return (
    <WaitingRoomContainer
      gameData={gameData}
      history={history}
      isHistoryLoading={isHistoryLoading}
    />
  );
}

import { useEffect } from 'react';
import { Route } from '@/routes/_authenticated/waiting-room.$gameId';
import { useNavigateOnError } from '@/common/hooks/useNavigateOnError';
import { useGameData } from '../../in-game/hooks/useGameData';
import { LoadingWaitingRoom } from '../component/LoadingWaitingRoom';
import { WaitingRoomContainer } from '../container/WaitingRoomContainer';

export function WaitingRoomPage() {
  const { gameId } = Route.useParams();
  const navigate = Route.useNavigate();
  const { gameData, isLoading, error } = useGameData(gameId, true);

  useNavigateOnError(error, 'Could not find game');

  useEffect(() => {
    if (gameData?.isCurrentPlayer === true) {
      navigate({ to: '/game/$gameId', params: { gameId } });
    }
  }, [gameData?.isCurrentPlayer, gameId, navigate]);

  if (isLoading || !gameData) {
    return <LoadingWaitingRoom />;
  }

  return <WaitingRoomContainer gameData={gameData} />;
}

import { Route } from '../../../routes/_authenticated/waiting-room.$gameId';
import { useGameData } from '../../in-game/hooks/useGameData';
import { LoadingWaitingRoom } from '../component/LoadingWaitingRoom';
import { WaitingRoomContainer } from '../container/WaitingRoomContainer';

export function WaitingRoomPage() {
  const { gameId } = Route.useParams();
  const { gameData, isLoading } = useGameData(gameId);

  if (isLoading || !gameData) {
    return <LoadingWaitingRoom />;
  }

  return <WaitingRoomContainer gameData={gameData} />;
}

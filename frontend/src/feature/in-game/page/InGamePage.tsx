import { Route } from '@/routes/_authenticated/game.$gameId';
import { LoadingGame } from '../component/LoadingGame';
import { useGameData } from '../hooks/useGameData';
import { InGameContainer } from '../container/InGameContainer';

export function InGamePage() {
  const { gameId } = Route.useParams();

  const { gameData, isLoading } = useGameData(gameId);

  if (isLoading || !gameData) {
    return <LoadingGame />;
  }

  return <InGameContainer gameData={gameData} />;
}

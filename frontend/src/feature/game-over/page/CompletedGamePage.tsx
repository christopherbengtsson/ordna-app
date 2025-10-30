import { Route } from '@/routes/_authenticated/game-over.$gameId';
import { useGameData } from '../../in-game/hooks/useGameData';
import { LoadingGameOver } from '../component/LoadingGameOver';
import { GameOverContainer } from '../container/GameOverContainer';

export function GameOverPage() {
  const { gameId } = Route.useParams();

  const { gameData, isLoading } = useGameData(gameId);

  if (isLoading || !gameData) {
    return <LoadingGameOver />;
  }

  return <GameOverContainer gameData={gameData} />;
}

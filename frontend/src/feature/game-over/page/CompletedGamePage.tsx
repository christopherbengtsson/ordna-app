import { Route } from '@/routes/_authenticated/game-over.$gameId';
import { useNavigateOnError } from '@/common/hooks/useNavigateOnError';
import { useGameData } from '../../in-game/hooks/useGameData';
import { LoadingGameOver } from '../component/LoadingGameOver';
import { GameOverContainer } from '../container/GameOverContainer';
import { useEffect } from 'react';

export function GameOverPage() {
  const { gameId } = Route.useParams();
  const navigate = Route.useNavigate();
  const { gameData, isLoading, error } = useGameData(gameId);

  useNavigateOnError(error, 'Could not find game');

  useEffect(() => {
    if (gameData && gameData.status !== 'completed') {
      navigate({ to: '/', replace: true });
    }
  }, [gameData, navigate]);

  if (isLoading || !gameData) {
    return <LoadingGameOver />;
  }

  return <GameOverContainer gameData={gameData} />;
}

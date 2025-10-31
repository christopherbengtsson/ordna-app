import { useEffect } from 'react';
import { Route } from '@/routes/_authenticated/game.$gameId';
import { useNavigateOnError } from '@/common/hooks/useNavigateOnError';
import { LoadingGame } from '../component/LoadingGame';
import { useGameData } from '../hooks/useGameData';
import { InGameContainer } from '../container/InGameContainer';

export function InGamePage() {
  const { gameId } = Route.useParams();
  const navigate = Route.useNavigate();

  const { gameData, isLoading, error } = useGameData(gameId);

  useNavigateOnError(error, 'Could not load game');

  useEffect(() => {
    if (gameData?.isCurrentPlayer === false) {
      navigate({ to: '/', replace: true });
    }
  }, [gameData?.isCurrentPlayer, navigate]);

  if (isLoading || !gameData) {
    return <LoadingGame />;
  }

  return <InGameContainer gameData={gameData} />;
}

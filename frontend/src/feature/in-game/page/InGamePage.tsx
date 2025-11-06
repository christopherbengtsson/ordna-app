import { useTranslation } from 'react-i18next';
import { Route } from '@/routes/_authenticated/game.$gameId';
import { useNavigateOnError } from '@/common/hooks/useNavigateOnError';
import { LoadingGame } from '../component/LoadingGame';
import { useGameData } from '../hooks/useGameData';
import { InGameContainer } from '../container/InGameContainer';

export function InGamePage() {
  const { t } = useTranslation('validation');
  const { gameId } = Route.useParams();

  const { gameData, isLoading, error } = useGameData(gameId);

  useNavigateOnError(error, t('toast.error.loadGameFailed'));

  if (isLoading || !gameData) {
    return <LoadingGame />;
  }

  return <InGameContainer gameData={gameData} />;
}

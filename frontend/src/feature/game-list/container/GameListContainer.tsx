import { Clock, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { GameCardCard } from '../component/GameListCard';
import type { GameList } from '../model/GameList';
import type { Game } from '../model/Game';

const emptyGameList: GameList = {
  currentTurn: [],
  pending: [],
  waiting: [],
  finished: [],
} as const;

interface Props {
  userId: string | undefined;
  games: GameList | undefined;
}

export function GameListContainer({
  userId,
  games: { currentTurn, pending, waiting, finished } = emptyGameList,
}: Props) {
  const { t } = useTranslation('game-setup');
  const navigate = useNavigate();

  const handleCardClick = (game: Game) => {
    // TODO: Pass whole game object?
    switch (game.status) {
      case 'pending':
        navigate({ to: '/lobby/$gameId', params: { gameId: game.id } });
        break;

      case 'active':
        if (game.currentPlayerId === userId) {
          navigate({ to: '/game/$gameId', params: { gameId: game.id } });
        } else {
          navigate({
            to: '/waiting-room/$gameId',
            params: { gameId: game.id },
          });
        }
        break;

      case 'completed':
        navigate({ to: '/game-over/$gameId', params: { gameId: game.id } });
        break;

      default:
        throw new Error(`Unhandled game status: ${game.status}`);
    }
  };

  return (
    <div className="space-y-6">
      {currentTurn.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-3 flex items-center gap-2">
            <Clock className="w-6 h-6 text-warning" />
            {t('gameList.sections.yourTurn')}
          </h2>
          <div className="grid gap-3">
            {currentTurn.map((game) => (
              <GameCardCard
                key={game.id}
                game={game}
                userId={userId}
                onGameClick={handleCardClick}
              />
            ))}
          </div>
        </div>
      )}

      {waiting.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-3 flex items-center gap-2">
            <Users className="w-6 h-6 text-info" />
            {t('gameList.status.waiting')}
          </h2>
          <div className="grid gap-3">
            {waiting.map((game) => (
              <GameCardCard
                key={game.id}
                game={game}
                userId={userId}
                onGameClick={handleCardClick}
              />
            ))}
          </div>
        </div>
      )}

      {pending.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-3">
            {t('gameList.sections.pending')}
          </h2>
          <div className="grid gap-3">
            {pending.map((game) => (
              <GameCardCard
                key={game.id}
                game={game}
                userId={userId}
                onGameClick={handleCardClick}
              />
            ))}
          </div>
        </div>
      )}

      {finished.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-3">
            {t('gameList.sections.finished')}
          </h2>
          <div className="grid gap-3">
            {finished.map((game) => (
              <GameCardCard
                key={game.id}
                game={game}
                userId={userId}
                onGameClick={handleCardClick}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

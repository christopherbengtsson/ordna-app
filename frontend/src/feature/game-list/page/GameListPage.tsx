import { useMemo } from 'react';
import { Gamepad2, Plus } from 'lucide-react';
import { useAuth } from '@/lib/supabase/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useMediaQuery } from '@/common/hooks/useMediaQuery';
import { useGameList } from '../hooks/useGameList';
import { LoadingGameList } from '../component/LoadingGameList';
import { GameListContainer } from '../container/GameListContainer';
import { CreateGameDialogContainer } from '../../create-game/container/CreateGameDialogContainer';
import { EmptyGameListContainer } from '../container/EmptyGameListContainer';
import { GameListError } from '../component/GameListError';

export function GameListPage() {
  const auth = useAuth();
  const { games, isLoading, error } = useGameList();
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const noGames = useMemo(
    () =>
      !games ||
      games.currentTurn.length +
        games.pending.length +
        games.waiting.length +
        games.finished.length ===
        0,
    [games],
  );

  if (isLoading) {
    return <LoadingGameList />;
  }

  if (error) {
    return <GameListError />;
  }

  return (
    <div className="container mx-auto max-w-4xl">
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 md:p-3 rounded-full">
            <Gamepad2 className="w-6 h-6 md:w-8 md:h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold bg-clip-text text-primary">
              Orda
            </h1>
          </div>
        </div>

        {!noGames && (
          <CreateGameDialogContainer
            trigger={
              <Button size="default" className="px-4 md:px-6">
                <Plus className="w-6 h-6" />
                {isDesktop && 'New Game'}
              </Button>
            }
          />
        )}
      </div>

      {noGames ? (
        <EmptyGameListContainer />
      ) : (
        <GameListContainer games={games} userId={auth.user?.id} />
      )}
    </div>
  );
}

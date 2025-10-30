import { useAuth } from '@/lib/supabase/hooks/useAuth';
import { Route } from '@/routes/_authenticated/lobby.$gameId';
import { useLobby } from '../hooks/useLobby';
import { LoadingLobby } from '../component/LoadingLobby';
import { LobbyContainer } from '../container/LobbyContainer';

export function LobbyPage() {
  const { user } = useAuth();
  const { gameId } = Route.useParams();
  const { lobbyData, isFetchingLobbyData } = useLobby(gameId);

  if (isFetchingLobbyData || !lobbyData) {
    return <LoadingLobby />;
  }

  return <LobbyContainer lobbyData={lobbyData} userId={user?.id} />;
}

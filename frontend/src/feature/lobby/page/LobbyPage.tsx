import { useEffect } from 'react';
import { useAuth } from '@/lib/supabase/hooks/useAuth';
import { Route } from '@/routes/_authenticated/lobby.$gameId';
import { useLobby } from '../hooks/useLobby';
import { LoadingLobby } from '../component/LoadingLobby';
import { LobbyContainer } from '../container/LobbyContainer';
import { useNavigateOnError } from '../../../common/hooks/useNavigateOnError';

export function LobbyPage() {
  const { user } = useAuth();
  const { gameId } = Route.useParams();
  const navigate = Route.useNavigate();
  const { lobbyData, isFetchingLobbyData, error } = useLobby(gameId);

  useNavigateOnError(error, 'Could not find lobby');

  useEffect(() => {
    if (lobbyData && !lobbyData.inviteCode?.length) {
      navigate({ to: '/' });
    }
  }, [lobbyData, navigate]);

  if (isFetchingLobbyData || !lobbyData) {
    return <LoadingLobby />;
  }

  return <LobbyContainer lobbyData={lobbyData} userId={user?.id} />;
}

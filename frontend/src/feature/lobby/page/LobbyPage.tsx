import { useEffect } from 'react';
import { useAuth } from '@/lib/supabase/hooks/useAuth';
import { Route } from '@/routes/_authenticated/lobby.$gameId';
import { useNavigateOnError } from '@/common/hooks/useNavigateOnError';
import { useLobby } from '../hooks/useLobby';
import { LoadingLobby } from '../component/LoadingLobby';
import { LobbyContainer } from '../container/LobbyContainer';

export function LobbyPage() {
  const { user } = useAuth();
  const { gameId } = Route.useParams();
  const navigate = Route.useNavigate();
  const { lobbyData, isLoading, isUpdating, error } = useLobby(gameId);

  useNavigateOnError(error, 'Could not find lobby');

  useEffect(() => {
    if (isLoading || isUpdating) return;

    const hasInviteCode = !!lobbyData?.inviteCode?.length;

    if (!hasInviteCode && lobbyData?.hostPlayerId === user?.id) {
      navigate({ to: '/game/$gameId', params: { gameId }, replace: true });
      return;
    }

    if (!hasInviteCode) {
      navigate({ to: '/', replace: true });
    }
  }, [
    gameId,
    isLoading,
    isUpdating,
    lobbyData?.hostPlayerId,
    lobbyData?.inviteCode?.length,
    navigate,
    user?.id,
  ]);

  if (isLoading || !lobbyData) {
    return <LoadingLobby />;
  }

  return <LobbyContainer lobbyData={lobbyData} userId={user?.id} />;
}

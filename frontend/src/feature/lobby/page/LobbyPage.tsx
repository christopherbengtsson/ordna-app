import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/supabase/hooks/useAuth';
import { Route } from '@/routes/_authenticated/lobby.$gameId';
import { useNavigateOnError } from '@/common/hooks/useNavigateOnError';
import { useLobby } from '../hooks/useLobby';
import { LoadingLobby } from '../component/LoadingLobby';
import { LobbyContainer } from '../container/LobbyContainer';
import { NotificationPermissionDrawer } from '@/feature/pwa/NotificationPermissionDrawer';
import { useNotificationPermission } from '../../pwa/hooks/useNotificationPermission';

export function LobbyPage() {
  const { t } = useTranslation('validation');
  const { user } = useAuth();
  const { gameId } = Route.useParams();
  const navigate = Route.useNavigate();
  const { lobbyData, isLoading, isUpdating, error } = useLobby(gameId);

  const {
    showNotificationPrompt,
    handleNotificationPromptDismiss,
    closeNotificationPrompt,
  } = useNotificationPermission({
    showPromptCondition: !isLoading && !!lobbyData,
  });

  useNavigateOnError(error, t('toast.error.lobbyNotFound'));

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

  return (
    <>
      <LobbyContainer lobbyData={lobbyData} userId={user?.id} />
      <NotificationPermissionDrawer
        open={showNotificationPrompt}
        close={closeNotificationPrompt}
        onDismiss={handleNotificationPromptDismiss}
      />
    </>
  );
}

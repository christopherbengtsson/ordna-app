import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { AuthError } from '@supabase/supabase-js';
import { useNavigate } from '@tanstack/react-router';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/supabase/hooks/useAuth';
import { useProfile } from '@/common/hooks/useProfile';
import { useInitiation } from '../hooks/useInvitation';

interface Props {
  inviteCode: string;
}

export function InvitationContainer({ inviteCode }: Props) {
  const { t } = useTranslation(['game-setup', 'validation']);
  const navigate = useNavigate();

  const { user, isAuthenticated, signInAnonymously } = useAuth();
  const { profile } = useProfile(user?.id);
  const { acceptInvite, isAccepting } = useInitiation();

  const [nickname, setNickname] = useState('');
  const [userHasEdited, setUserHasEdited] = useState(false);

  // Derive the displayed value - this is just calculation during render
  const displayNickname = userHasEdited
    ? nickname
    : profile?.nickname && profile.nickname !== 'Anonymous'
      ? profile.nickname
      : nickname;

  const handleNicknameOnChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    setUserHasEdited(true);
    setNickname(ev.target.value.trim());
  };

  const onInviteAccepted = (gameId: string, autoStarted: boolean) => {
    if (autoStarted) {
      navigate({
        to: '/waiting-room/$gameId',
        params: { gameId },
        replace: true,
      });
    } else {
      navigate({ to: '/lobby/$gameId', params: { gameId }, replace: true });
    }

    toast.success(t('toast.success.joinedGame', { ns: 'validation' }));
  };

  const handleJoinGame = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      try {
        await signInAnonymously(
          displayNickname.length > 0 ? displayNickname : undefined,
          true,
        );
      } catch (error) {
        toast.error(
          (error as AuthError).message ??
            t('toast.error.signInFailed', { ns: 'validation' }),
        );

        return;
      }
    }

    acceptInvite(
      {
        p_invite_token: inviteCode,
        p_nickname: displayNickname,
      },
      {
        onSuccess: ({ game_id, auto_started }) => {
          onInviteAccepted(game_id, auto_started);
        },
        onError: (error) => {
          toast.error(
            error.message ?? t('toast.error.joinGameFailed', { ns: 'validation' }),
          );
        },
      },
    );
  };

  return (
    <div className="flex flex-1 items-center justify-center">
      <Card className="w-full max-w-md shadow-card border-border/50">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-primary md:text-3xl bg-clip-text">
            {t('invitation.title')}
          </CardTitle>
          <CardDescription>{t('invitation.invited')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoinGame} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nickname">{t('invitation.form.nickname')}</Label>
              <Input
                id="nickname"
                value={displayNickname}
                onChange={handleNicknameOnChange}
                placeholder={t('invitation.form.nicknamePlaceholder')}
                maxLength={20}
                disabled={isAccepting}
                className="min-h-11"
              />
            </div>

            <Button
              type="submit"
              className="w-full min-h-11 md:min-h-12"
              disabled={isAccepting}
            >
              {isAccepting ? t('invitation.actions.joining') : t('invitation.actions.joinGame')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

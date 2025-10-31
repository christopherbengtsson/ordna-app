import { useState } from 'react';
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

    toast.success('Successfully joined game!');
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
            'Unknown Error, failed to sign in anonymously',
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
            error.message ?? 'Unknown Error, failed to join the game',
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
            Join Ghost Bluff
          </CardTitle>
          <CardDescription>You've been invited to join a game!</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoinGame} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nickname">Your Name</Label>
              <Input
                id="nickname"
                value={displayNickname}
                onChange={handleNicknameOnChange}
                placeholder="Enter nickname"
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
              {isAccepting ? 'Joining...' : 'Join Game'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

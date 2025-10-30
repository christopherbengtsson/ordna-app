import { useState } from 'react';
import { Gamepad2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
  InputGroupButton,
} from '@/components/ui/input-group';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { CreateGameDialogContainer } from '../../create-game/container/CreateGameDialogContainer';
import { useInitiation } from '../../invitation/hooks/useInvitation';

export function EmptyGameListContainer() {
  const [inviteCode, setInviteCode] = useState('');
  const { acceptInvite, isAccepting } = useInitiation();

  const handleJoinGame = (e: React.FormEvent) => {
    e.preventDefault();
    acceptInvite(
      {
        p_invite_token: inviteCode.trim(),
      },
      {
        onSuccess: () => {
          toast.success('Game joined, waiting for host to start');
        },
        onError: (error) => {
          toast.error(error.message);
        },
      },
    );
  };

  // TODO: InputGroup shrinks on accepting

  return (
    <Card className="shadow-card border-border/50">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Gamepad2 />
          </EmptyMedia>
          <EmptyTitle>No Games</EmptyTitle>
          <EmptyDescription>
            You have no games yet. Create a new one or join one by an invite
            code.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div className="flex flex-col gap-3 md:gap-4">
            <CreateGameDialogContainer
              trigger={
                <Button className="w-full min-h-11 md:min-h-12">
                  Create New Game
                </Button>
              }
            />

            <div className="text-center text-sm text-muted-foreground">or</div>

            <form onSubmit={handleJoinGame}>
              <InputGroup>
                <InputGroupInput
                  placeholder="Enter invite code..."
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    type="submit"
                    disabled={isAccepting || !inviteCode.trim().length}
                  >
                    {isAccepting ? <Spinner /> : 'Join'}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </form>
          </div>
        </EmptyContent>
      </Empty>
    </Card>
  );
}

import { useState } from 'react';
import { Gamepad2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation(['game-setup', 'validation']);
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
          toast.success(t('toast.success.gameJoined', { ns: 'validation' }));
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
          <EmptyTitle>{t('gameList.empty.title')}</EmptyTitle>
          <EmptyDescription>
            {t('gameList.empty.description')}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div className="flex flex-col gap-3 md:gap-4">
            <CreateGameDialogContainer
              trigger={
                <Button className="w-full min-h-11 md:min-h-12">
                  {t('gameList.empty.action')}
                </Button>
              }
            />

            <div className="text-center text-sm text-muted-foreground">
              {t('gameList.empty.or')}
            </div>

            <form onSubmit={handleJoinGame}>
              <InputGroup>
                <InputGroupInput
                  placeholder={t('gameList.actions.enterInviteCode')}
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    type="submit"
                    disabled={isAccepting || !inviteCode.trim().length}
                  >
                    {isAccepting ? <Spinner /> : t('gameList.actions.join')}
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

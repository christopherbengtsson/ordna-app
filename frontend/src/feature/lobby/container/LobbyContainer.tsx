import { useState, useCallback } from 'react';
import { useNavigate, useCanGoBack, useRouter } from '@tanstack/react-router';
import { ArrowLeft, Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useStartGame } from '../hooks/useStartGame';
import type { Lobby } from '../model/Lobby';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../../components/ui/accordion';
import { cn } from '../../../lib/utils';

interface Props {
  lobbyData: Lobby;
  userId: string | undefined;
}

export function LobbyContainer({ lobbyData, userId }: Props) {
  const navigate = useNavigate();
  const router = useRouter();
  const canGoBack = useCanGoBack();
  const { startGame, isStarting } = useStartGame(lobbyData.id);

  const inviteUrl = `${window.location.origin}/invitation?inviteCode=${lobbyData.inviteCode}`;
  const [copied, setCopied] = useState(false);

  const goBack = useCallback(() => {
    if (canGoBack) {
      router.history.back();
    } else {
      router.navigate({ to: '/' });
    }
  }, [canGoBack, router]);

  const handleCopyInvite = () => {
    if (!lobbyData.inviteCode) return;

    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast('Invite link copied!', { duration: 5000 });
    setTimeout(() => setCopied(false), 5000);
  };

  const handleStartGame = () => {
    if (!lobbyData) return;

    startGame(
      {
        p_game_id: lobbyData.id,
      },
      {
        onSuccess: ({ game_id, starting_player_id }) => {
          // TODO: Maybe not necessary if
          if (starting_player_id === userId) {
            navigate({ to: '/game/$gameId', params: { gameId: game_id } });
          }
        },
      },
    );
  };

  return (
    <div className="flex flex-col flex-1 w-full max-w-7xl mx-auto">
      <Card className="flex-1 w-full p-4 md:p-6 shadow-card border-none">
        <Button
          variant="ghost"
          onClick={goBack}
          className="gap-2 self-start mb-4 md:mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Games
        </Button>

        <div className="flex-1 flex flex-col justify-center">
          <div className="w-full max-w-2xl mx-auto space-y-4 md:space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-3xl md:text-4xl text-primary font-bold bg-clip-text">
                Game Lobby
              </h1>
              <p className="text-sm md:text-base text-muted-foreground">
                Waiting for players...
              </p>
            </div>

            <Card className="shadow-card border-border/50">
              <CardHeader>
                <CardTitle>Invite Players</CardTitle>
                <CardDescription>
                  Share this link with your friends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    value={lobbyData.inviteCode ? inviteUrl : 'Loading...'}
                    readOnly
                    className="flex-1 min-h-11"
                  />
                  <Button
                    onClick={handleCopyInvite}
                    variant="outline"
                    size="icon"
                    className="shrink-0 min-h-11 min-w-11"
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card border-border/50">
              <CardHeader>
                <CardTitle>{lobbyData.players.length} players joined</CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible>
                  <AccordionItem value="item-1">
                    <AccordionTrigger>Players</AccordionTrigger>
                    <AccordionContent className={cn('grid gap-4')}>
                      <div className="space-y-2">
                        {lobbyData.players?.map((player) => (
                          <div
                            key={player.id}
                            className="flex items-center justify-between p-3 md:p-4 rounded-lg border border-border/30"
                          >
                            <span className="font-medium">
                              {player.nickname}
                            </span>
                            {player.isHost && (
                              <Badge variant="default">Host</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>

            {lobbyData &&
              lobbyData.hostPlayerId === userId &&
              lobbyData.players.length >= 2 && (
                <Button
                  className="w-full min-h-11 md:min-h-12"
                  onClick={handleStartGame}
                  disabled={isStarting}
                >
                  Start Game
                </Button>
              )}
          </div>
        </div>
      </Card>
    </div>
  );
}

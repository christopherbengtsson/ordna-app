import { useCanGoBack, useRouter } from '@tanstack/react-router';
import { ArrowLeft, Clock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Scoreboard } from '../../in-game/component/Scoreboard';
import type { GameData } from '../../in-game/model/GameData';
import type { GamePlayer } from '../../in-game/model/GamePlayer';

interface Props {
  gameData: GameData;
}

const currentPlayerNickname = (playerId: string, players: GamePlayer[]) =>
  players.find(({ id }) => id === playerId)?.nickname ?? 'Anonymous';

export function WaitingRoomContainer({ gameData }: Props) {
  const router = useRouter();
  const canGoBack = useCanGoBack();

  const goBack = () => {
    if (canGoBack) {
      router.history.back();
    } else {
      router.navigate({ to: '/' });
    }
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
              <h1 className="text-3xl text-primary md:text-4xl font-bold bg-clip-text">
                Waiting for next player
              </h1>
              <p className="text-sm md:text-base text-muted-foreground">
                It's not your turn yet. The game will continue when others have
                played.
              </p>
            </div>

            <Card className="shadow-card border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Current Turn
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 p-3 md:p-4 bg-primary/10 rounded-lg border border-primary/20">
                  <Users className="w-5 h-5 text-primary" />
                  <p className="text-sm">
                    <span className="font-semibold text-foreground">
                      {currentPlayerNickname(
                        gameData.currentPlayerId,
                        gameData.players,
                      )}
                    </span>
                    <span className="text-muted-foreground">
                      {' '}
                      is currently playing
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>

            <Scoreboard
              maxRounds={gameData.settings.marksToEliminate}
              players={gameData.players}
              activePlayerId={gameData.currentPlayerId}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}

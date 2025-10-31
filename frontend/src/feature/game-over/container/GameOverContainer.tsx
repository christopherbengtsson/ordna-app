import { useCanGoBack, useRouter } from '@tanstack/react-router';
import { ArrowLeft, Award, Medal, PartyPopper, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { GameData } from '../../in-game/model/GameData';

interface Props {
  gameData: GameData;
}

export function GameOverContainer({ gameData }: Props) {
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
            <div className="text-center">
              <div className="inline-block p-4 rounded-full mb-4 animate-pulse-glow">
                <Trophy className="w-16 h-16 text-primary" />
              </div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold bg-clip-text">
                <div className="flex justify-center gap-4">
                  <PartyPopper />

                  <span>
                    {
                      gameData?.players.find(
                        ({ isEliminated }) => !isEliminated,
                      )?.nickname
                    }{' '}
                    Wins!
                  </span>

                  <PartyPopper />
                </div>
              </h1>
            </div>

            <Card className="shadow-card border-border/50">
              <CardHeader>
                <CardTitle className="text-center">Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {gameData.players
                    .sort((a, b) => a.marks - b.marks)
                    .map((player, index) => (
                      <div
                        key={player.id}
                        className={`
                      p-4 rounded-lg border-2 flex items-center justify-between
                      ${
                        index === 0
                          ? '/20 border-primary shadow-glow'
                          : index === 1
                            ? 'bg-accent/20 border-accent/50'
                            : 'bg-secondary/30 border-border/30'
                      }
                    `}
                      >
                        <div className="flex items-center gap-3">
                          {index === 0 && (
                            <Trophy className="w-6 h-6 text-primary" />
                          )}
                          {index === 1 && (
                            <Medal className="w-6 h-6 text-accent" />
                          )}
                          {index === 2 && (
                            <Award className="w-6 h-6 text-muted-foreground" />
                          )}
                          <div>
                            <p className="font-bold text-lg">
                              {player.nickname}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {player.marks} marks
                            </p>
                          </div>
                        </div>
                        <div className="text-3xl font-bold text-muted-foreground">
                          #{index + 1}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Card>
    </div>
  );
}

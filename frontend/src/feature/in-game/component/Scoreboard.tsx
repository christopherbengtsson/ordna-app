import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Skull } from 'lucide-react';
import type { GamePlayer } from '../model/GamePlayer';

interface Props {
  players: GamePlayer[];
  activePlayerId: string;
  maxRounds: number;
}

export function Scoreboard({ players, activePlayerId, maxRounds }: Props) {
  return (
    <Card className="shadow-card border-border/50 min-w-[250px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          Scoreboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {players.map((player) => (
            <div
              key={player.id}
              className={`
                p-3 rounded-lg border transition-all
                ${
                  player.id === activePlayerId
                    ? 'bg-primary/20 border-primary animate-pulse-glow'
                    : 'bg-secondary/30 border-border/30'
                }
                ${player.isEliminated ? 'opacity-50' : ''}
              `}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold">{player.nickname}</span>
                {player.isEliminated && (
                  <Skull className="w-4 h-4 text-destructive" />
                )}
              </div>
              <div className="flex gap-1">
                {Array.from({ length: maxRounds }).map((_, i) => (
                  <div
                    key={i}
                    className={`
                      w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold
                      ${
                        i < player.marks
                          ? 'bg-destructive border-destructive text-destructive-foreground'
                          : 'bg-secondary/50 border-border/50'
                      }
                    `}
                  >
                    {i < player.marks ? '✕' : ''}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

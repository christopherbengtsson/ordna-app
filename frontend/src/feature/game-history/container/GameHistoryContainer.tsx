import { History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import type { GameHistory } from '../model/GameHistory';
import { LoadingGameHistory } from '../component/LoadingGameHistory';
import { GameMoveItem } from '../component/GameMoveItem';
import { RoundOutcome } from '../component/RoundOutcome';
interface Props {
  gameId: string;
  history: GameHistory | undefined;
  isLoading: boolean;
}

export function GameHistoryContainer({ history, isLoading }: Props) {
  if (isLoading) {
    return <LoadingGameHistory />;
  }

  if (!history || history.length === 0) {
    return null;
  }

  return (
    <Card className="shadow-card border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5" />
          Round History
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {history.map((round) => (
            <AccordionItem key={round.roundId} value={round.roundId}>
              <AccordionTrigger>
                <div className="flex items-center justify-between w-full pr-4">
                  <span className="font-semibold">
                    Round {round.roundNumber}
                  </span>
                  <Badge variant="secondary">
                    {round.moves.length} action
                    {round.moves.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  {round.moves.map((move) => (
                    <GameMoveItem move={move} round={round} />
                  ))}

                  {round.resolutionType && round.playerWithMarkNickname && (
                    <RoundOutcome round={round} />
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}

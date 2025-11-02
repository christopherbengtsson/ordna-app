import {
  Plus,
  AlertTriangle,
  FileText,
  Hourglass,
  OctagonX,
} from 'lucide-react';
import type { Database } from '@/common/model/generated/Database';
import { Badge } from '@/components/ui/badge';
import { GameHistoryUtil } from '../util/GameHistoryUtil';
import type { GameHistoryMove } from '../model/GameHistoryMove';
import type { GameHistoryRound } from '../model/GameHistoryRound';

const getMoveIcon = (moveType: Database['public']['Enums']['move_type']) => {
  switch (moveType) {
    case 'add_letter':
      return <Plus className="w-4 h-4 text-chart-2" />;
    case 'call_bluff':
      return <AlertTriangle className="w-4 h-4 text-chart-4" />;
    case 'timeout':
      return <Hourglass className="w-4 h-4 text-destructive" />;
    case 'resolve_bluff':
    case 'call_word':
      return <FileText className="w-4 h-4 text-info" />;
    case 'fold':
      return <OctagonX className="w-4 h-4 text-destructive" />;

    default:
      return null;
  }
};

interface Props {
  move: GameHistoryMove;
  round: GameHistoryRound;
}

export function GameMoveItem({ move, round }: Props) {
  return (
    <div
      key={`${round.roundId}-${move.moveOrder}`}
      className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
    >
      <div className="mt-0.5">{getMoveIcon(move.moveType)}</div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">{move.playerNickname}</span>
          <span className="text-sm text-muted-foreground">
            {GameHistoryUtil.getMoveTypeLabel(move.moveType)}
          </span>
          {move.letterValue && (
            <Badge variant="outline" className="font-mono">
              {move.letterValue}
            </Badge>
          )}
          {move.wordValue && (
            <Badge variant="outline" className="font-mono">
              {move.wordValue}
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {GameHistoryUtil.formatTimestamp(move.createdAt)}
        </div>
      </div>
    </div>
  );
}

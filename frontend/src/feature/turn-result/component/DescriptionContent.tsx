import { Badge } from '@/components/ui/badge';
import type { TurnResult } from '../model/TurnResult';

interface Props {
  turnResult: TurnResult;
  userId: string;
}

export function DescriptionContent({ turnResult, userId }: Props) {
  return (
    <div className="space-y-4 py-4">
      <div className="flex flex-col items-center gap-4 text-center">
        {/* Elimination badge */}
        {turnResult.eliminatedPlayerId && (
          <Badge variant="destructive" className="text-base px-3 py-1">
            {turnResult.eliminatedPlayerId === userId
              ? 'You were'
              : turnResult.markedPlayerNickname}{' '}
            eliminated!
          </Badge>
        )}

        {/* Sequence badge */}
        {turnResult.sequence && (
          <Badge variant="secondary" className="text-lg px-4 py-2 font-mono">
            {turnResult.sequence}
          </Badge>
        )}
      </div>
    </div>
  );
}

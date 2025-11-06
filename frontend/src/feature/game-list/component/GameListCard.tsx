import { Clock, Trophy, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Game } from '../model/Game';
import { GameCardUtil } from '../util/GameCardUtil';

interface Props {
  userId: string | undefined;
  game: Game;
  onGameClick: (game: Game) => void;
}

export function GameCardCard({ userId, game, onGameClick }: Props) {
  const { t } = useTranslation('game-setup');
  const timeRemaining = game.deadline
    ? GameCardUtil.getTimeRemaining(game.deadline, t)
    : '';

  return (
    <Card
      className="cursor-pointer hover:scale-[1.02] transition-transform"
      onClick={() => onGameClick(game)}
    >
      <CardHeader className="pb-3 md:pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base md:text-lg truncate">
              {t('gameList.card.gameNumber', { id: game.id.slice(0, 8) })}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1 text-xs md:text-sm">
              <Users className="w-3 h-3 md:w-4 md:h-4 shrink-0" />
              <span className="truncate">{game.players?.join(', ')}</span>
            </CardDescription>
          </div>
          {game.currentPlayerId === userId && game.deadline && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {timeRemaining}
            </Badge>
          )}
          {game.status === 'active' && game.currentPlayerId !== userId && (
            <Badge variant="secondary">{t('gameList.badges.waiting')}</Badge>
          )}
          {game.status === 'pending' && (
            <Badge variant="outline">{t('gameList.badges.pending')}</Badge>
          )}
          {game.status === 'completed' &&
            game.winnerId &&
            game.winnerId === userId && (
              <Badge variant="default" className="flex items-center gap-1">
                <Trophy />
                {t('gameList.badges.win')}
              </Badge>
            )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex items-center justify-between text-sm">
          <span className="font-mono text-primary">
            {GameCardUtil.getCardInfoLabel(game, t)}
          </span>

          <span className="text-muted-foreground">
            {game.round ? t('gameList.card.round', { number: game.round }) : ''}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

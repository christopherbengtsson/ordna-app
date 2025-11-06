import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Clock, LogIn, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Scoreboard } from '../../in-game/component/Scoreboard';
import type { GameData } from '../../in-game/model/GameData';
import type { GamePlayer } from '../../in-game/model/GamePlayer';
import type { GameHistory } from '../../game-history/model/GameHistory';
import { GameHistoryContainer } from '../../game-history/container/GameHistoryContainer';
import { GoBackButton } from '../../../common/component/GoBackButton';

interface Props {
  gameData: GameData;
  history: GameHistory | undefined;
  isHistoryLoading: boolean;
}

const currentPlayerNickname = (
  playerId: string,
  players: GamePlayer[],
  anonymousLabel: string,
) => players.find(({ id }) => id === playerId)?.nickname ?? anonymousLabel;

export function WaitingRoomContainer({
  gameData,
  history,
  isHistoryLoading,
}: Props) {
  const { t } = useTranslation('gameplay');
  const navigate = useNavigate();

  const startTurn = () => {
    navigate({
      to: '/game/$gameId',
      params: { gameId: gameData.gameId },
      state: undefined,
      replace: true,
    });
  };

  return (
    <div className="flex flex-col flex-1 w-full max-w-7xl mx-auto">
      <Card className="flex-1 w-full p-4 md:p-6 shadow-card border-none">
        <GoBackButton />

        <div className="flex-1 flex flex-col justify-center">
          <div className="w-full max-w-2xl mx-auto space-y-4 md:space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-3xl text-primary md:text-4xl font-bold bg-clip-text">
                {gameData.isCurrentPlayer
                  ? t('waitingRoom.yourTurn')
                  : t('waitingRoom.waitingForOthers')}
              </h1>
              <p className="text-sm md:text-base text-muted-foreground">
                {gameData.isCurrentPlayer
                  ? t('waitingRoom.startYourMove')
                  : t('waitingRoom.description')}
              </p>
            </div>

            <Card className="shadow-card border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  {t('waitingRoom.currentTurn')}
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
                        t('waitingRoom.anonymous'),
                      )}
                    </span>
                    <span className="text-muted-foreground">
                      {' '}
                      {t('waitingRoom.isPlaying')}
                    </span>
                  </p>

                  {gameData.isCurrentPlayer && (
                    <Button
                      variant="default"
                      onClick={startTurn}
                      className="ml-auto"
                    >
                      {/* TODO: Use Link for preloading */}
                      {t('waitingRoom.play')}
                      <LogIn className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Scoreboard
              maxRounds={gameData.settings.marksToEliminate}
              players={gameData.players}
              activePlayerId={gameData.currentPlayerId}
            />

            <GameHistoryContainer
              gameId={gameData.gameId}
              history={history}
              isLoading={isHistoryLoading}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}

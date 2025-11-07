import { useState } from 'react';
import { Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { GameData } from '../model/GameData';
import { ActionButtons } from '../component/ActionButtons';
import { Scoreboard } from '../component/Scoreboard';
import { TurnTimer } from '../component/TurnTimer';
import { SequenceDisplay } from '../component/SequenceDisplay';
import { GameActionService } from '../service/GameActionService';
import { useSequenceAnimation } from '../hooks/useSequenceAnimation';
import { useGameAction } from '../hooks/useGameAction';
import { useTurnTimeout } from '../hooks/useTurnTimeout';
import { GoBackButton } from '../../../common/component/GoBackButton';

interface Props {
  gameData: GameData;
}

export function InGameContainer({ gameData }: Props) {
  const { t } = useTranslation('gameplay');
  const [showScoreboard, setShowScoreboard] = useState(false);

  const { mutate: submitLetter, isPending: isSubmittingLetter } = useGameAction(
    gameData.gameId,
    GameActionService.submitLetter,
  );
  const { mutate: callWord, isPending: isCallingWord } = useGameAction(
    gameData.gameId,
    GameActionService.callWord,
  );
  const { mutate: callBluff, isPending: isCallingBluff } = useGameAction(
    gameData.gameId,
    GameActionService.callBluff,
  );
  const { mutate: resolveBluff, isPending: isResolvingBluff } = useGameAction(
    gameData.gameId,
    GameActionService.resolveBluff,
  );
  const { mutate: fold, isPending: isFolding } = useGameAction(
    gameData.gameId,
    GameActionService.fold,
  );
  const { setTurnDeadline, timeoutStarted, timeLeft, isCallingTimeout } =
    useTurnTimeout(gameData.gameId);

  const isLoading =
    isSubmittingLetter ||
    isCallingWord ||
    isCallingBluff ||
    isResolvingBluff ||
    isFolding ||
    isCallingTimeout;

  const currentSequence = gameData.activeRound?.currentSequence ?? [];
  const isBluffResolution = gameData.activeRound?.lastMoveType === 'call_bluff';

  const {
    animating,
    isExiting,
    setAnimating,
    currentLetterIndex,
    setCurrentLetterIndex,
  } = useSequenceAnimation(currentSequence, setTurnDeadline);

  const startTurn = () => {
    setAnimating(true);
    setCurrentLetterIndex(0);
  };

  const replaySequence = () => {
    // TODO: Subtract timeout
    setCurrentLetterIndex(0);
    setAnimating(true);
  };

  const handleResolveBluff = (word: string) => {
    resolveBluff({
      p_game_id: gameData.gameId,
      p_word: word,
    });
  };

  const handleInputSubmit = (value: string) => {
    if (isBluffResolution) {
      handleResolveBluff(value);
      return;
    }

    submitLetter({
      p_game_id: gameData.gameId,
      p_letter: value,
    });
  };

  const handleAction = (action: 'call-bluff' | 'call-word' | 'fold') => {
    switch (action) {
      case 'call-word':
        callWord({
          p_game_id: gameData.gameId,
        });
        break;

      case 'call-bluff':
        callBluff({
          p_game_id: gameData.gameId,
        });
        break;

      case 'fold':
        fold({
          p_game_id: gameData.gameId,
        });
        break;
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full max-w-7xl mx-auto">
      {/* Mobile Scoreboard Toggle */}
      <div className="lg:hidden fixed top-[calc(var(--safe-area-inset-top)+2rem)] right-8 z-50">
        <Button
          onClick={() => setShowScoreboard(!showScoreboard)}
          variant="outline"
          size="icon"
          className="bg-card shadow-glow min-h-11 min-w-11"
        >
          <Trophy className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile Scoreboard Overlay */}
      {showScoreboard && (
        <div
          className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setShowScoreboard(false)}
        >
          <div
            className="absolute top-[calc(var(--safe-area-inset-top)+5rem)] right-8 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <Scoreboard
              maxRounds={gameData.settings.marksToEliminate}
              players={gameData.players}
              activePlayerId={gameData.currentPlayerId}
            />
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_300px] gap-4 md:gap-6 flex-1">
        {/* Main Game Area */}
        <div className="flex flex-col w-full">
          <Card className="flex-1 w-full p-4 md:p-6 shadow-card border-border/50">
            {!animating && !timeoutStarted && <GoBackButton />}

            {/* Centered Content Area */}
            <div className="flex-1 flex flex-col justify-center">
              <div className="w-full max-w-2xl mx-auto space-y-4 md:space-y-6">
                <div className="text-center">
                  {timeoutStarted && !animating && (
                    <TurnTimer timeLeft={timeLeft} />
                  )}
                </div>

                <SequenceDisplay
                  isBluffResolution={isBluffResolution}
                  sequence={currentSequence}
                  currentLetterIndex={currentLetterIndex}
                  isAnimating={animating}
                  isExiting={isExiting}
                  isLoading={isLoading}
                  submitValue={handleInputSubmit}
                  replaySequence={replaySequence}
                />

                {currentLetterIndex < 0 && (
                  <div className="text-center">
                    <Button
                      onClick={startTurn}
                      className="min-h-11 md:min-h-12 px-6"
                      disabled={
                        !gameData.isCurrentPlayer ||
                        gameData.status !== 'active'
                      }
                    >
                      {isBluffResolution
                        ? t('actions.resolveBluff')
                        : t('actions.startTurn')}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons at Bottom */}
            {currentLetterIndex >= 0 &&
              !animating &&
              currentSequence.length > 0 &&
              !isBluffResolution && (
                <div className="mt-4 md:mt-6">
                  <ActionButtons
                    onAction={handleAction}
                    sequenceLength={currentSequence.length}
                  />
                </div>
              )}
          </Card>
        </div>

        {/* Desktop Scoreboard */}
        <div className="hidden lg:block lg:sticky lg:top-4 h-fit">
          <Scoreboard
            maxRounds={gameData.settings.marksToEliminate}
            players={gameData.players}
            activePlayerId={gameData.currentPlayerId}
          />
        </div>
      </div>
    </div>
  );
}

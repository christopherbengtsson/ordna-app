import { useEffect, useRef, useState } from 'react';
import { RotateCcw, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  sequence: string[];
  currentLetterIndex: number;
  isAnimating: boolean;
  isExiting: boolean;
  isLoading: boolean;
  submitValue: (value: string) => void;
  isBluffResolution: boolean;
  replaySequence: VoidFunction;
}

export function SequenceDisplay({
  sequence,
  currentLetterIndex,
  isAnimating,
  isExiting,
  isLoading,
  submitValue,
  isBluffResolution,
  replaySequence,
}: Props) {
  const { t } = useTranslation('gameplay');
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (!isAnimating && currentLetterIndex >= 0 && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAnimating, currentLetterIndex]);

  const handleLetterInput: React.ChangeEventHandler<HTMLInputElement> = (
    ev,
  ) => {
    const val = ev.currentTarget.value;

    const pattern = isBluffResolution
      ? /^[\p{L}]+$/u // Multiple letters for word input
      : /^[\p{L}]$/u; // Single letter for normal play

    // Only allow alphabetical characters (supports all Unicode letters)
    if ((val && !pattern.test(val)) || isLoading) {
      return;
    }

    setInputValue(val.toUpperCase().trim());
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();

    if (!inputValue.length || isLoading) return;

    submitValue(inputValue);
    setInputValue('');
  };

  if (currentLetterIndex < 0) {
    return (
      <div className="flex justify-center items-center py-8 sm:py-16">
        <div className="text-center max-w-md mx-auto px-4">
          {isBluffResolution ? (
            <>
              <p className="text-destructive text-lg font-semibold mb-2">
                {t('sequence.bluffCalled')}
              </p>
              <p className="text-muted-foreground text-sm">
                {t('sequence.bluffResolutionInstructions')}
              </p>
            </>
          ) : (
            <p className="text-muted-foreground text-lg">
              {sequence.length
                ? t('sequence.revealSequence')
                : t('sequence.placeFirstLetter')}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center py-8 sm:py-16 min-h-[200px]">
      {isAnimating ? (
        // During animation, show only the current letter
        currentLetterIndex >= 0 &&
        currentLetterIndex < sequence.length && (
          <div
            key={currentLetterIndex}
            className={`w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center rounded-xl bg-gradient-card border-2 border-primary shadow-glow transition-shadow duration-300 ${
              isExiting ? 'animate-letter-exit' : 'animate-letter-reveal'
            }`}
          >
            <span className="text-4xl sm:text-5xl font-bold text-primary">
              {sequence[currentLetterIndex]}
            </span>
          </div>
        )
      ) : (
        // After animation, show input field
        <div className="w-full max-w-md px-4">
          <div className="text-center mb-4">
            {isBluffResolution ? (
              <p className="text-sm text-muted-foreground">
                {t('sequence.enterWordWithSequence')}
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('sequence.hasLetters', { count: sequence.length })}
                </p>

                {sequence.length > 0 && (
                  <Button variant="link" onClick={replaySequence}>
                    <RotateCcw />
                    {sequence.length === 1
                      ? t('sequence.replayLetter')
                      : t('sequence.replayLetters')}
                  </Button>
                )}
              </>
            )}
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 ">
            <div
              className={`rounded-xl bg-gradient-card border-2 border-accent/50 shadow-card flex items-center justify-center p-4 ${
                isBluffResolution
                  ? 'w-full sm:w-64'
                  : 'w-32 h-32 sm:w-40 sm:h-40 mx-auto'
              }`}
            >
              <Input
                ref={inputRef}
                name="letter-input"
                disabled={isLoading}
                autoComplete="off"
                autoFocus
                maxLength={isBluffResolution ? 20 : 1}
                value={inputValue}
                onChange={handleLetterInput}
                className={`uppercase text-center font-bold border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0 ${
                  isBluffResolution
                    ? 'text-2xl sm:text-3xl h-14'
                    : 'text-5xl sm:text-6xl md:text-5xl h-full'
                }`}
                placeholder={
                  isBluffResolution
                    ? t('sequence.typeWordPlaceholder')
                    : t('sequence.letterPlaceholder')
                }
              />
            </div>

            <Button
              type="submit"
              size="lg"
              className="min-h-11 md:min-h-12"
              disabled={!inputValue.length || isLoading}
            >
              <Send className="w-5 h-5 mr-2" />
              {isBluffResolution
                ? t('sequence.submitWord')
                : t('sequence.submitLetter')}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

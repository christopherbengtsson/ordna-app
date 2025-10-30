import { useEffect, useState } from 'react';
import {
  BASE_TIMEOUT_MULTIPLIER,
  LETTER_CYCLE_DURATION,
  LETTER_REVEAL_DURATION,
} from '../util/constant';

export const useSequenceAnimation = (
  currentSequence: string[],
  setTurnDeadline: React.Dispatch<React.SetStateAction<Date | null>>,
) => {
  const [animating, setAnimating] = useState(false);
  const [currentLetterIndex, setCurrentLetterIndex] = useState(-1);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (!animating || currentLetterIndex < 0) return;

    if (currentLetterIndex >= currentSequence.length) {
      setAnimating(false);
      setIsExiting(false);
      // Start timer after animation completes
      // Ensure minimum 1 minute thinking time (even for empty sequences)
      const thinkingTime =
        Math.max(1, currentSequence.length) * BASE_TIMEOUT_MULTIPLIER;
      const deadline = new Date(Date.now() + thinkingTime);
      setTurnDeadline(deadline);
      return;
    }

    // Show letter with reveal animation
    const revealTimer = setTimeout(() => {
      // After reveal, trigger exit animation
      setIsExiting(true);
    }, LETTER_REVEAL_DURATION);

    // After exit animation, move to next letter
    const exitTimer = setTimeout(() => {
      setIsExiting(false);
      setCurrentLetterIndex((prev) => prev + 1);
    }, LETTER_CYCLE_DURATION);

    return () => {
      clearTimeout(revealTimer);
      clearTimeout(exitTimer);
    };
  }, [animating, currentLetterIndex, currentSequence.length, setTurnDeadline]);

  return {
    animating,
    currentLetterIndex,
    isExiting,

    setAnimating,
    setCurrentLetterIndex,
  };
};

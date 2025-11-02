import type { Database } from '@/common/model/generated/Database';

const getMoveTypeLabel = (
  moveType: Database['public']['Enums']['move_type'],
): string => {
  switch (moveType) {
    case 'add_letter':
      return 'placed letter';

    case 'call_word':
      return 'called word';

    case 'call_bluff':
      return 'called BLUFF';

    case 'resolve_bluff':
      return 'resolved bluff with word';

    case 'fold':
      return 'folded';

    case 'timeout':
      return 'timed out';

    default:
      return 'something weird';
  }
};

const getResolutionLabel = (
  resolutionType: Database['public']['Enums']['resolution_type'] | null,
): string => {
  if (!resolutionType) return '';

  switch (resolutionType) {
    case 'bluff_true':
      return 'Bluff was correct';
    case 'bluff_false':
      return 'Bluff was incorrect';
    case 'word_valid':
      return 'Word was valid';
    case 'word_invalid':
      return 'Word was invalid';
    case 'fold':
      return 'Player folded';
    case 'timeout':
      return 'Player timed out';
    default:
      return '';
  }
};

const formatTimestamp = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

export const GameHistoryUtil = {
  getMoveTypeLabel,
  getResolutionLabel,
  formatTimestamp,
};

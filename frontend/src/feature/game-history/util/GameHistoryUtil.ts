import type { TFunction } from 'i18next';
import type { Database } from '@/common/model/generated/Database';

const getMoveTypeLabel = (
  moveType: Database['public']['Enums']['move_type'],
  t: TFunction<'results'>,
): string => {
  switch (moveType) {
    case 'add_letter':
      return t('history.moveTypeLabels.addLetter');

    case 'call_word':
      return t('history.moveTypeLabels.callWord');

    case 'call_bluff':
      return t('history.moveTypeLabels.callBluff');

    case 'resolve_bluff':
      return t('history.moveTypeLabels.resolveBluff');

    case 'fold':
      return t('history.moveTypeLabels.fold');

    case 'timeout':
      return t('history.moveTypeLabels.timeout');

    default:
      return '';
  }
};

const getResolutionLabel = (
  resolutionType: Database['public']['Enums']['resolution_type'] | null,
  t: TFunction<'results'>,
): string => {
  if (!resolutionType) return '';

  switch (resolutionType) {
    case 'bluff_true':
      return t('history.resolutions.bluffTrue');
    case 'bluff_false':
      return t('history.resolutions.bluffFalse');
    case 'word_valid':
      return t('history.resolutions.wordValid');
    case 'word_invalid':
      return t('history.resolutions.wordInvalid');
    case 'fold':
      return t('history.resolutions.fold');
    case 'timeout':
      return t('history.resolutions.timeout');
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

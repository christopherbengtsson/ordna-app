import type { TFunction } from 'i18next';
import type { Database } from '../../../common/model/generated/Database';
import type { Game } from '../model/Game';

const _getLastMoveLabel = (
  lastMoveType: Database['public']['Enums']['move_type'],
  t: TFunction,
) => {
  switch (lastMoveType) {
    case 'add_letter':
      return t('gameList.moveTypes.addLetter');

    case 'call_word':
      return t('gameList.moveTypes.callWord');

    case 'call_bluff':
      return t('gameList.moveTypes.callBluff');

    case 'resolve_bluff':
      return t('gameList.moveTypes.resolveBluff');

    case 'fold':
      return t('gameList.moveTypes.fold');

    case 'timeout':
      return t('gameList.moveTypes.timeout');

    default:
      return '';
  }
};

const getCardInfoLabel = (game: Game, t: TFunction) => {
  if (game.status === 'active') {
    return _getLastMoveLabel(game.lastMoveType, t);
  }

  if (game.status === 'completed') {
    return game.completeWord;
  }

  return '';
};

const getTimeRemaining = (deadline: Date, t: TFunction) => {
  if (!deadline) return null;
  const diff = deadline.getTime() - Date.now();
  if (diff <= 0) return t('gameList.card.expired');

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) return t('gameList.card.timeRemaining', { hours, minutes });
  return t('gameList.card.timeRemainingMinutes', { minutes });
};

export const GameCardUtil = {
  getCardInfoLabel,
  getTimeRemaining,
};

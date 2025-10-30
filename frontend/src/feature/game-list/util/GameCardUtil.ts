import type { Database } from '../../../common/model/generated/Database';
import type { Game } from '../model/Game';

const _getLastMoveLabel = (
  lastMoveType: Database['public']['Enums']['move_type'],
) => {
  switch (lastMoveType) {
    case 'add_letter':
      return 'New letter added';

    case 'call_word':
      return 'Word called';

    case 'call_bluff':
      return 'Bluff called';

    case 'resolve_bluff':
      return 'Bluff resolved';

    case 'fold':
      return 'Player folded';

    case 'timeout':
      return 'Player timed out';

    default:
      return '';
  }
};

const getCardInfoLabel = (game: Game) => {
  if (game.status === 'active') {
    return _getLastMoveLabel(game.lastMoveType);
  }

  if (game.status === 'completed') {
    return game.completeWord;
  }

  return '';
};

const getTimeRemaining = (deadline: Date) => {
  if (!deadline) return null;
  const diff = deadline.getTime() - Date.now();
  if (diff <= 0) return 'Expired';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

export const GameCardUtil = {
  getCardInfoLabel,
  getTimeRemaining,
};

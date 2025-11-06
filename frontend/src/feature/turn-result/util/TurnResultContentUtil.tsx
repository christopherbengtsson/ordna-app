import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Plus,
  Flag,
  Clock,
} from 'lucide-react';
import type { TFunction } from 'i18next';
import type { TurnResult } from '../model/TurnResult';

const getTurnIcon = ({
  moveType,
  isUserMarked,
}: {
  moveType: TurnResult['moveType'];
  isUserMarked: boolean;
}): React.ReactNode => {
  switch (moveType) {
    case 'add_letter':
      return <Plus className="w-12 h-12 text-blue-500 mx-auto" />;
    case 'call_word':
    case 'resolve_bluff':
      // Show success/failure based on outcome for THIS user
      return isUserMarked ? (
        <XCircle className="w-12 h-12 text-destructive mx-auto" />
      ) : (
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
      );
    case 'call_bluff':
      return <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />;
    case 'fold':
      return <Flag className="w-12 h-12 text-orange-500 mx-auto" />;
    case 'timeout':
      return <Clock className="w-12 h-12 text-red-500 mx-auto" />;
  }
};

const getTurnTitle = ({
  moveType,
  resolutionType,
  t,
}: {
  moveType: TurnResult['moveType'];
  resolutionType: TurnResult['resolutionType'];
  t: TFunction<'results'>;
}): string => {
  switch (moveType) {
    case 'add_letter':
      return t('moveResult.titles.letterAdded');

    case 'call_word':
      return resolutionType === 'word_valid'
        ? t('moveResult.titles.wordValid')
        : t('moveResult.titles.wordInvalid');

    case 'resolve_bluff':
      return resolutionType === 'bluff_false'
        ? t('moveResult.titles.wordValid')
        : t('moveResult.titles.bluffConfirmed');

    case 'call_bluff':
      return t('moveResult.titles.bluffCalled');

    case 'fold':
      return t('moveResult.titles.folded');

    case 'timeout':
      return t('moveResult.titles.timeExpired');

    default:
      return '';
  }
};

const getTurnDescription = (props: {
  moveType: TurnResult['moveType'];
  resolutionType: TurnResult['resolutionType'];
  isUserMarked: boolean;
  wasEliminated: boolean;
  markedPlayerNickname: string | undefined;
  startsNextRoundPlayerNickname: string | undefined;
  t: TFunction<'results'>;
}): string => {
  const {
    moveType,
    resolutionType,
    isUserMarked,
    wasEliminated,
    markedPlayerNickname,
    startsNextRoundPlayerNickname,
    t,
  } = props;

  switch (moveType) {
    case 'call_word': {
      if (resolutionType === 'word_valid') {
        // Word was valid - previous player got marked/eliminated
        if (wasEliminated) {
          return isUserMarked
            ? t('moveResult.descriptions.callWord.valid.eliminatedYou')
            : t('moveResult.descriptions.callWord.valid.eliminatedOther', {
                nickname: markedPlayerNickname,
              });
        }
        return isUserMarked
          ? t('moveResult.descriptions.callWord.valid.markedYou')
          : t('moveResult.descriptions.callWord.valid.markedOther', {
              nickname: markedPlayerNickname,
            });
      } else {
        // Word was invalid - you got marked/eliminated
        if (wasEliminated) {
          return t('moveResult.descriptions.callWord.invalid.eliminated');
        }
        return t('moveResult.descriptions.callWord.invalid.marked');
      }
    }

    case 'call_bluff':
      return t('moveResult.descriptions.callBluff.waiting');

    case 'resolve_bluff': {
      if (resolutionType === 'bluff_false') {
        // Word was valid, bluff caller was wrong
        if (wasEliminated) {
          return isUserMarked
            ? t('moveResult.descriptions.resolveBluff.bluffFalse.eliminatedYou')
            : t('moveResult.descriptions.resolveBluff.bluffFalse.eliminatedOther', {
                nickname: markedPlayerNickname,
              });
        }
        return isUserMarked
          ? t('moveResult.descriptions.resolveBluff.bluffFalse.markedYou')
          : t('moveResult.descriptions.resolveBluff.bluffFalse.markedOther', {
              nickname: markedPlayerNickname,
            });
      } else {
        // Word was invalid, resolver was bluffing
        if (wasEliminated) {
          return isUserMarked
            ? t('moveResult.descriptions.resolveBluff.bluffTrue.eliminatedYou')
            : t('moveResult.descriptions.resolveBluff.bluffTrue.eliminatedOther', {
                nickname: markedPlayerNickname,
              });
        }
        return isUserMarked
          ? t('moveResult.descriptions.resolveBluff.bluffTrue.markedYou')
          : t('moveResult.descriptions.resolveBluff.bluffTrue.markedOther', {
              nickname: markedPlayerNickname,
            });
      }
    }

    case 'add_letter': {
      return startsNextRoundPlayerNickname
        ? t('moveResult.descriptions.addLetter.nextRound', {
            nickname: startsNextRoundPlayerNickname,
          })
        : t('moveResult.descriptions.addLetter.continues');
    }

    case 'fold': {
      if (wasEliminated) {
        return t('moveResult.descriptions.fold.eliminated');
      }
      return t('moveResult.descriptions.fold.marked');
    }

    case 'timeout': {
      if (wasEliminated) {
        return t('moveResult.descriptions.timeout.eliminated');
      }
      return t('moveResult.descriptions.timeout.marked');
    }

    default:
      return '';
  }
};

export const TurnResultContentUtil = {
  getTurnIcon,
  getTurnTitle,
  getTurnDescription,
};

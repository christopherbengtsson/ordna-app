import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Plus,
  Flag,
  Clock,
} from 'lucide-react';
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
}: {
  moveType: TurnResult['moveType'];
  resolutionType: TurnResult['resolutionType'];
}): string => {
  switch (moveType) {
    case 'add_letter':
      return 'Letter added';

    case 'call_word':
      return resolutionType === 'word_valid' ? 'Word valid' : 'Word invalid';

    case 'resolve_bluff':
      return resolutionType === 'bluff_false'
        ? 'Word valid'
        : 'Bluff confirmed';

    case 'call_bluff':
      return 'Bluff called';

    case 'fold':
      return 'Folded';

    case 'timeout':
      return 'Time expired';

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
}): string => {
  const {
    moveType,
    resolutionType,
    isUserMarked,
    wasEliminated,
    markedPlayerNickname,
    startsNextRoundPlayerNickname,
  } = props;

  switch (moveType) {
    case 'call_word': {
      if (resolutionType === 'word_valid') {
        // Word was valid - previous player got marked/eliminated
        if (wasEliminated) {
          return isUserMarked
            ? 'You called a valid word. The previous player has been eliminated.'
            : `${markedPlayerNickname} was eliminated for completing the word.`;
        }
        return isUserMarked
          ? 'You called a valid word. The previous player got a mark.'
          : `${markedPlayerNickname} got a mark for completing the word.`;
      } else {
        // Word was invalid - you got marked/eliminated
        if (wasEliminated) {
          return 'You called an invalid word.';
        }
        return 'You called an invalid word and got a mark.';
      }
    }

    case 'call_bluff':
      return 'You called bluff on the previous player. Waiting for their response.';

    case 'resolve_bluff': {
      if (resolutionType === 'bluff_false') {
        // Word was valid, bluff caller was wrong
        if (wasEliminated) {
          return isUserMarked
            ? 'Your bluff call was incorrect. The word was valid.'
            : `${markedPlayerNickname} was eliminated for an incorrect bluff call.`;
        }
        const markedName = isUserMarked ? 'You' : markedPlayerNickname;
        return isUserMarked
          ? 'Your bluff call was incorrect and you got a mark.'
          : `${markedName}'s bluff call was incorrect and got a mark.`;
      } else {
        // Word was invalid, resolver was bluffing
        if (wasEliminated) {
          return isUserMarked
            ? 'You were unable to complete the word after being challenged.'
            : `${markedPlayerNickname} couldn't complete the word.`;
        }
        const markedName = isUserMarked ? 'You' : markedPlayerNickname;
        return isUserMarked
          ? 'You were unable to complete the word and got a mark.'
          : `${markedName} couldn't complete the word and got a mark.`;
      }
    }

    case 'add_letter': {
      return startsNextRoundPlayerNickname
        ? `${startsNextRoundPlayerNickname} starts the next round.`
        : 'The sequence continues.';
    }

    case 'fold': {
      if (wasEliminated) {
        return 'You folded and have been eliminated.';
      }
      return 'You folded and got a mark.';
    }

    case 'timeout': {
      if (wasEliminated) {
        return 'You ran out of time and have been eliminated.';
      }
      return 'You ran out of time and got a mark.';
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

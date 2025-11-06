import { useTranslation } from 'react-i18next';
import type { GameHistoryRound } from '../model/GameHistoryRound';
import { GameHistoryUtil } from '../util/GameHistoryUtil';

interface Props {
  round: GameHistoryRound;
}

export function RoundOutcome({ round }: Props) {
  const { t } = useTranslation('results');

  return (
    <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
      <div className="flex items-center gap-2 text-sm flex-wrap">
        <span className="font-medium">{t('history.outcome')}</span>
        <span>{GameHistoryUtil.getResolutionLabel(round.resolutionType, t)}</span>
        <span>-</span>
        <span className="font-medium">{round.playerWithMarkNickname}</span>
        <span>{t('history.receivedMark')}</span>
      </div>
    </div>
  );
}

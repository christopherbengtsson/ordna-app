import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface Props {
  onAction: (action: 'call-bluff' | 'call-word' | 'fold') => void;
  sequenceLength: number;
}

export function ActionButtons({ onAction, sequenceLength }: Props) {
  const { t } = useTranslation('gameplay');

  return (
    <div className="grid grid-cols-3 gap-2 md:gap-3">
      <Button
        onClick={() => onAction('call-bluff')}
        className="h-auto py-3 md:py-4 flex-col gap-1 md:gap-2 min-h-[88px]"
        variant="outline"
      >
        <AlertTriangle className="w-5 h-5 md:w-6 md:h-6" />
        <span className="font-semibold text-xs md:text-sm">
          {t('actions.callBluff')}
        </span>
      </Button>

      <Button
        onClick={() => onAction('fold')}
        disabled={sequenceLength <= 1}
        className="h-auto py-3 md:py-4 flex-col gap-1 md:gap-2 disabled:opacity-50 min-h-[88px]"
        variant="outline"
      >
        <XCircle className="w-5 h-5 md:w-6 md:h-6" />
        <span className="font-semibold text-xs md:text-sm">
          {t('actions.fold')}
        </span>
      </Button>

      <Button
        onClick={() => onAction('call-word')}
        className="h-auto py-3 md:py-4 flex-col gap-1 md:gap-2 min-h-[88px]"
        variant="outline"
      >
        <CheckCircle className="w-5 h-5 md:w-6 md:h-6" />
        <span className="font-semibold text-xs md:text-sm">
          {t('actions.callComplete')}
        </span>
      </Button>
    </div>
  );
}

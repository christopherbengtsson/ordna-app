import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function GoBackButton() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();

  const goBack = () => {
    navigate({ to: '/', replace: true });
  };

  return (
    <Button
      variant="ghost"
      onClick={goBack}
      className="gap-2 self-start mb-4 md:mb-6"
    >
      <ArrowLeft className="w-4 h-4" />
      {t('actions.backToGames')}
    </Button>
  );
}

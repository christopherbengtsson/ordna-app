import { Frown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Card } from '@/components/ui/card';

export function GameListError() {
  const { t } = useTranslation('validation');

  return (
    <div className="container mx-auto max-w-4xl">
      <Card className="shadow-card border-border/50">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Frown />
            </EmptyMedia>
            <EmptyTitle>{t('errors.notFound.title')}</EmptyTitle>
            <EmptyDescription>
              {t('errors.loadingError')}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent></EmptyContent>
        </Empty>
      </Card>
    </div>
  );
}

import { useTranslation } from 'react-i18next';

export function NotFoundPage() {
  const { t } = useTranslation('validation');

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          {t('errors.notFound.title')}
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          {t('errors.notFound.message')}
        </p>
      </div>
    </div>
  );
}

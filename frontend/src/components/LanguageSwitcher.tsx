import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SupportedLanguage } from '@/locales/i18n';

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation('common');

  const handleLanguageChange = (language: SupportedLanguage) => {
    i18n.changeLanguage(language);
  };

  return (
    <Select
      value={i18n.language}
      onValueChange={(value) => handleLanguageChange(value as SupportedLanguage)}
    >
      <SelectTrigger className="w-[140px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">{t('language.english')}</SelectItem>
        <SelectItem value="sv">{t('language.swedish')}</SelectItem>
      </SelectContent>
    </Select>
  );
}

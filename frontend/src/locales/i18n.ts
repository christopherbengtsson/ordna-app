import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { STORAGE_KEY } from '@/common/util/constant/storageKey';
import {
  resources,
  SUPPORTED_LANGUAGES,
  I18N_CONFIG,
  type SupportedLanguage,
} from './resources';

export { resources, SUPPORTED_LANGUAGES, type SupportedLanguage };

// Initialize i18next for React app
i18n
  // Detect user language
  // Priority: localStorage > browser language > fallback
  .use(LanguageDetector)
  // Pass i18n instance to react-i18next
  .use(initReactI18next)
  // Init options
  .init({
    ...I18N_CONFIG,
    resources,

    // React-specific: Language detector options
    detection: {
      // Order of detection
      order: ['localStorage', 'navigator'],
      // Keys to look for in localStorage
      lookupLocalStorage: STORAGE_KEY.APP_LANGUAGE,
      // Cache user language
      caches: ['localStorage'],
    },

    // React-specific: Development options
    debug: false,

    // React-specific: Suspense disabled for compatibility
    react: {
      useSuspense: false,
    },
  });

export default i18n;

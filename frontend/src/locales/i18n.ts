import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import all namespaces
import enCommon from './en/common.json';
import enGameSetup from './en/game-setup.json';
import enGameplay from './en/gameplay.json';
import enResults from './en/results.json';
import enValidation from './en/validation.json';

import svCommon from './sv/common.json';
import svGameSetup from './sv/game-setup.json';
import svGameplay from './sv/gameplay.json';
import svResults from './sv/results.json';
import svValidation from './sv/validation.json';

// Define resources type for TypeScript (must use 'as const' for type inference)
export const resources = {
  en: {
    common: enCommon,
    'game-setup': enGameSetup,
    gameplay: enGameplay,
    results: enResults,
    validation: enValidation,
  },
  sv: {
    common: svCommon,
    'game-setup': svGameSetup,
    gameplay: svGameplay,
    results: svResults,
    validation: svValidation,
  },
} as const;

// Default namespace for type safety
// Most users start at game list/setup, so this is accessed most frequently
export const defaultNS = 'game-setup';

// Supported languages
export const SUPPORTED_LANGUAGES = ['en', 'sv'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

// Initialize i18next
i18n
  // Detect user language
  // Priority: localStorage > browser language > fallback
  .use(LanguageDetector)
  // Pass i18n instance to react-i18next
  .use(initReactI18next)
  // Init options
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS,
    fallbackNS: 'common', // Fallback to common namespace for shared UI elements
    ns: ['common', 'game-setup', 'gameplay', 'results', 'validation'],

    // Only load language code, not region (e.g., 'en' not 'en-US')
    load: 'languageOnly',

    supportedLngs: SUPPORTED_LANGUAGES,

    // Language detector options
    detection: {
      // Order of detection
      order: ['localStorage', 'navigator'],
      // Keys to look for in localStorage
      lookupLocalStorage: 'dansk-ui-language',
      // Cache user language
      caches: ['localStorage'],
    },

    interpolation: {
      // React already escapes values
      escapeValue: false,
      // Be explicit about interpolation syntax
      prefix: '{{',
      suffix: '}}',
    },

    // Development options
    debug: false,

    react: {
      useSuspense: false,
    },

    // Ensure type safety by not returning null
    returnNull: false,
  });

export default i18n;

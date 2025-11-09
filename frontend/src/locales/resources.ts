/**
 * Shared i18n resources and configuration
 * Used by both React app (i18n.ts) and service worker (i18n-sw.ts)
 */

// Import all namespaces for English
import enCommon from './en/common.json';
import enGameSetup from './en/game-setup.json';
import enGameplay from './en/gameplay.json';
import enResults from './en/results.json';
import enValidation from './en/validation.json';

// Import all namespaces for Swedish
import svCommon from './sv/common.json';
import svGameSetup from './sv/game-setup.json';
import svGameplay from './sv/gameplay.json';
import svResults from './sv/results.json';
import svValidation from './sv/validation.json';

/**
 * Translation resources for all supported languages
 * Must use 'as const' for proper TypeScript type inference
 */
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

/**
 * Supported languages
 */
export const SUPPORTED_LANGUAGES = ['en', 'sv'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * Default namespace for type safety
 * Most users start at game list/setup, so this is accessed most frequently
 */
export const DEFAULT_NS = 'game-setup';

/**
 * Fallback namespace for shared UI elements
 */
export const FALLBACK_NS = 'common';

/**
 * All available namespaces
 */
export const ALL_NAMESPACES = [
  'common',
  'game-setup',
  'gameplay',
  'results',
  'validation',
] as const;

/**
 * Shared i18next configuration
 */
export const I18N_CONFIG = {
  fallbackLng: 'en' as const,
  defaultNS: DEFAULT_NS,
  fallbackNS: FALLBACK_NS,
  ns: ALL_NAMESPACES,
  load: 'languageOnly' as const,
  supportedLngs: SUPPORTED_LANGUAGES,
  interpolation: {
    escapeValue: false,
    prefix: '{{',
    suffix: '}}',
  },
  returnNull: false,
} as const;

/**
 * i18n configuration for Service Worker context
 * Uses shared resources but without React dependencies
 */

import i18next from 'i18next';
import { resources, I18N_CONFIG, SUPPORTED_LANGUAGES } from './resources';
import type { NotificationData } from '@/common/model/notification/NotificationData';

/**
 * Detect user's language from browser locale
 * Falls back to 'en' if locale is not supported
 */
const detectLanguage = (): string => {
  const locale = navigator.language.toLowerCase();

  for (const lang of SUPPORTED_LANGUAGES) {
    if (locale.startsWith(lang)) {
      return lang;
    }
  }

  return 'en';
};

// Initialize i18next for service worker (no React plugin)
i18next.init({
  ...I18N_CONFIG,
  resources,
  lng: detectLanguage(),
  debug: false,
});

/**
 * Generated notification text
 */
interface NotificationText {
  title: string;
  body: string;
}

/**
 * Generates localized notification text based on notification type and data
 * Uses i18next for translation with browser locale detection
 */
export function getNotificationText(data: NotificationData): NotificationText {
  const notificationType = data.notification_type;

  switch (notificationType) {
    case 'your_turn': {
      return {
        title: i18next.t('pwa.notifications.messages.yourTurn.title', {
          ns: 'common',
        }),
        body: i18next.t('pwa.notifications.messages.yourTurn.body', {
          ns: 'common',
        }),
      };
    }

    case 'game_ended': {
      const winnerName = data.winner_name as string | undefined;
      const isWinner = !winnerName; // If no winner_name provided, user is the winner

      if (isWinner) {
        return {
          title: i18next.t('pwa.notifications.messages.gameEnded.won', {
            ns: 'common',
          }),
          body: i18next.t('pwa.notifications.messages.gameEnded.wonBody', {
            ns: 'common',
          }),
        };
      } else {
        return {
          title: i18next.t('pwa.notifications.messages.gameEnded.lost', {
            ns: 'common',
          }),
          body: i18next.t('pwa.notifications.messages.gameEnded.lostBody', {
            ns: 'common',
            winnerName: winnerName || '',
          }),
        };
      }
    }

    case 'game_started': {
      const hostName = data.host_name as string | undefined;
      return {
        title: i18next.t('pwa.notifications.messages.gameStarted.title', {
          ns: 'common',
        }),
        body: i18next.t('pwa.notifications.messages.gameStarted.body', {
          ns: 'common',
          hostName: hostName || '',
        }),
      };
    }

    default:
      // Fallback for unknown notification types
      return {
        title: 'Orda',
        body: i18next.t('pwa.notifications.messages.fallback', {
          ns: 'common',
          defaultValue: 'You have a new notification',
        }),
      };
  }
}

export default i18next;

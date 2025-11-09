import { useEffect, useState } from 'react';
import { STORAGE_KEY } from '@/common/util/constant/storageKey';

const DAYS_UNTIL_PROMPT_AGAIN = 7;

const checkShouldShow = (): boolean => {
  // Check if Notification API is supported
  if (!('Notification' in window)) {
    return false;
  }

  // Don't show if permission already granted or denied
  const permission = Notification.permission;
  if (permission !== 'default') {
    return false;
  }

  // Check if enough time has passed since last dismissal
  const lastShownTimestamp = localStorage.getItem(
    STORAGE_KEY.NOTIFICATION_PERMISSION_REQUEST,
  );
  const daysInMs = DAYS_UNTIL_PROMPT_AGAIN * 24 * 60 * 60 * 1000;
  const shouldShowBasedOnTime =
    !lastShownTimestamp ||
    Date.now() - parseInt(lastShownTimestamp, 10) > daysInMs;

  return shouldShowBasedOnTime;
};

interface In {
  showPromptCondition: boolean;
}

export const useNotificationPermission = ({ showPromptCondition }: In) => {
  const [hasShownThisSession, setHasShownThisSession] = useState(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);

  const shouldShow = hasShownThisSession ? false : checkShouldShow();

  useEffect(() => {
    if (showPromptCondition && shouldShow) {
      const timer = setTimeout(() => {
        setShowNotificationPrompt(true);
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [shouldShow, showPromptCondition]);

  const markAsShown = () => {
    setHasShownThisSession(true);
  };

  const closeNotificationPrompt = () => {
    setShowNotificationPrompt(false);
  };

  const handleNotificationPromptDismiss = () => {
    markAsShown();
  };

  return {
    showNotificationPrompt,
    handleNotificationPromptDismiss,
    closeNotificationPrompt,
  };
};

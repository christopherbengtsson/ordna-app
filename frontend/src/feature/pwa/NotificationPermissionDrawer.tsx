import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useMediaQuery } from '@/common/hooks/useMediaQuery';
import { Button } from '@/components/ui/button';
import { NotificationService } from '@/lib/firebase/service/NotificationService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { BellRing, Bell, Check } from 'lucide-react';
import { STORAGE_KEY } from '@/common/util/constant/storageKey';

interface Props {
  open: boolean;
  close: VoidFunction;
  onDismiss: () => void;
}

export function NotificationPermissionDrawer({
  open,
  close,
  onDismiss,
}: Props) {
  const { t } = useTranslation('common');
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [showDeniedMessage, setShowDeniedMessage] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);

  const handleEnable = async () => {
    setIsEnabling(true);

    try {
      // Check if Notification API is supported
      if (!('Notification' in window)) {
        console.error('This browser does not support notifications');
        setIsEnabling(false);
        return;
      }

      // Request permission
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        try {
          // Register FCM token with backend
          await NotificationService.registerFCMToken();

          // Close the drawer
          close();
          // Don't store timestamp - permission was granted
          localStorage.removeItem(STORAGE_KEY.NOTIFICATION_PERMISSION_REQUEST);
        } catch (error) {
          console.error('Failed to register FCM token:', error);
          toast.error(t('pwa.notifications.error.description'));
        }
      } else if (permission === 'denied') {
        // Show instructions on how to enable
        setShowDeniedMessage(true);
        // Store that we asked and got denied
        localStorage.setItem(
          STORAGE_KEY.NOTIFICATION_PERMISSION_REQUEST,
          Date.now().toString(),
        );
      } else {
        // User dismissed the permission dialog (default)
        handleNotNow();
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    } finally {
      setIsEnabling(false);
    }
  };

  const handleNotNow = () => {
    close();
    // Store timestamp when dismissed, will show again after 7 days
    localStorage.setItem(
      STORAGE_KEY.NOTIFICATION_PERMISSION_REQUEST,
      Date.now().toString(),
    );
    onDismiss();
  };

  const handleCloseDeniedMessage = () => {
    setShowDeniedMessage(false);
    close();
    onDismiss();
  };

  // Don't render if not open
  if (!open) return null;

  // Show denied message state
  if (showDeniedMessage) {
    const deniedContent = (
      <div className="space-y-4 py-4">
        <div className="flex justify-center">
          <Bell className="h-16 w-16 text-muted-foreground" />
        </div>
        <p className="text-center text-sm text-muted-foreground">
          {t('pwa.notifications.denied.message')}
        </p>
      </div>
    );

    if (isDesktop) {
      return (
        <Dialog open={open} onOpenChange={handleCloseDeniedMessage}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-center">
                {t('pwa.notifications.denied.title')}
              </DialogTitle>
            </DialogHeader>

            {deniedContent}

            <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-center">
              <Button
                onClick={handleCloseDeniedMessage}
                className="w-full sm:w-auto"
              >
                {t('pwa.notifications.denied.close')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    }

    return (
      <Drawer open={open} onOpenChange={handleCloseDeniedMessage}>
        <DrawerContent>
          <DrawerHeader className="text-center">
            <DrawerTitle>{t('pwa.notifications.denied.title')}</DrawerTitle>
          </DrawerHeader>

          <div className="px-4">{deniedContent}</div>

          <DrawerFooter className="pt-2">
            <Button onClick={handleCloseDeniedMessage}>
              {t('pwa.notifications.denied.close')}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  // Main notification prompt
  const content = (
    <div className="space-y-4 py-4">
      <div className="flex justify-center">
        <BellRing className="h-16 w-16 text-primary" />
      </div>
      <ul className="space-y-2 text-sm text-muted-foreground">
        <li className="flex items-start gap-2">
          <Check className="h-4 w-4 flex-shrink-0 text-primary mt-0.5" />
          <span>{t('pwa.notifications.benefits.turnNotifications')}</span>
        </li>
        <li className="flex items-start gap-2">
          <Check className="h-4 w-4 flex-shrink-0 text-primary mt-0.5" />
          <span>{t('pwa.notifications.benefits.gameUpdates')}</span>
        </li>
        <li className="flex items-start gap-2">
          <Check className="h-4 w-4 flex-shrink-0 text-primary mt-0.5" />
          <span>{t('pwa.notifications.benefits.neverMiss')}</span>
        </li>
      </ul>
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog
        open={open}
        onOpenChange={(newOpen) => !newOpen && handleNotNow()}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-center">
              {t('pwa.notifications.title')}
            </DialogTitle>
            <DialogDescription className="text-center">
              {t('pwa.notifications.description')}
            </DialogDescription>
          </DialogHeader>

          {content}

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-center">
            <Button
              onClick={handleEnable}
              className="w-full sm:w-auto"
              disabled={isEnabling}
            >
              <BellRing className="mr-2 h-4 w-4" />
              {t('pwa.notifications.actions.enable')}
            </Button>
            <Button
              variant="outline"
              onClick={handleNotNow}
              className="w-full sm:w-auto"
              disabled={isEnabling}
            >
              {t('pwa.notifications.actions.notNow')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={(newOpen) => !newOpen && handleNotNow()}>
      <DrawerContent>
        <DrawerHeader className="text-center">
          <DrawerTitle>{t('pwa.notifications.title')}</DrawerTitle>
          <DrawerDescription>
            {t('pwa.notifications.description')}
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4">{content}</div>

        <DrawerFooter className="pt-2">
          <Button onClick={handleEnable} disabled={isEnabling}>
            <BellRing className="mr-2 h-4 w-4" />
            {t('pwa.notifications.actions.enable')}
          </Button>
          <DrawerClose asChild>
            <Button
              variant="outline"
              onClick={handleNotNow}
              disabled={isEnabling}
            >
              {t('pwa.notifications.actions.notNow')}
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

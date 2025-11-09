import { useEffect, useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { UAParser } from 'ua-parser-js';
import { useMediaQuery } from '@/common/hooks/useMediaQuery';
import { Button } from '@/components/ui/button';
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
import { Download, LayoutGrid, Share } from 'lucide-react';
import { STORAGE_KEY } from '@/common/util/constant/storageKey';

const DAYS_UNTIL_PROMPT_AGAIN = 7;

interface BeforeInstallPwaDrawerEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface NavigatorStandalone extends Navigator {
  standalone?: boolean;
}

export function InstallPwaDrawer() {
  const { t } = useTranslation('common');
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [open, setOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPwaDrawerEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);

  const parser = new UAParser();
  const browser = parser.getBrowser();
  const browserName = browser.name || t('pwa.install.ios.browserFallback');

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as NavigatorStandalone).standalone === true;

  useEffect(() => {
    if (isStandalone) {
      return;
    }

    // Detect iOS/iPadOS using feature detection (handles iPadOS 13+ reporting as macOS)
    const detectIOS = async () => {
      const parser = new UAParser();
      const os = parser.getOS();

      // Check for iPhone/iPod via OS name
      if (os.name === 'iOS') {
        setIsIOS(true);
        return true;
      }

      // Check for iPad using feature detection (iPadOS 13+ reports as macOS)
      const device = await parser.getDevice().withFeatureCheck();
      const detectedAsIPad = device.is('tablet') && os.name === 'Mac OS';
      setIsIOS(detectedAsIPad);
      return detectedAsIPad;
    };

    // Check if enough time has passed since last shown
    const lastShownTimestamp = localStorage.getItem(STORAGE_KEY.PWA_INSTALL);
    const daysInMs = DAYS_UNTIL_PROMPT_AGAIN * 24 * 60 * 60 * 1000;
    const shouldShow =
      !lastShownTimestamp ||
      Date.now() - parseInt(lastShownTimestamp, 10) > daysInMs;

    if (!shouldShow) {
      return;
    }

    // Listen for the beforeinstallprompt event (Chromium browsers)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPwaDrawerEvent);
      setOpen(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Detect iOS and show prompt if detected
    detectIOS().then((detected) => {
      if (detected) {
        setOpen(true);
      }
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, [isStandalone]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setOpen(false);
        // Don't show again if user installed
        localStorage.removeItem(STORAGE_KEY.PWA_INSTALL);
      } else {
        // User dismissed the native prompt, show again in X days
        localStorage.setItem(STORAGE_KEY.PWA_INSTALL, Date.now().toString());
      }
    } catch (error) {
      console.error('Install prompt error:', error);
    } finally {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setOpen(false);
    setDeferredPrompt(null);
    // Store timestamp when dismissed, will show again after X days
    localStorage.setItem(STORAGE_KEY.PWA_INSTALL, Date.now().toString());
  };

  // Don't render if not open
  if (!open) return null;

  const content = (
    <>
      {/* Chromium browsers - show install button */}
      {deferredPrompt && (
        <div className="space-y-4 py-4">
          <div className="flex justify-center">
            <Download className="h-16 w-16 text-primary" />
          </div>
          <p className="text-center text-sm text-muted-foreground">
            {t('pwa.install.chromium.description')}
          </p>
        </div>
      )}

      {/* iOS - show instructions */}
      {isIOS && !deferredPrompt && (
        <div className="space-y-4 py-4">
          <div className="flex justify-center">
            <LayoutGrid className="h-16 w-16 text-primary" />
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="text-center font-semibold">
              {t('pwa.install.ios.title')}
            </p>
            <p className="text-center">{t('pwa.install.ios.subtitle')}</p>
            <ol className="list-decimal space-y-2 pl-6">
              <li>
                <div className="flex items-center gap-1">
                  <Trans
                    i18nKey="pwa.install.ios.step1"
                    ns="common"
                    values={{ browserName }}
                    components={{ strong: <strong /> }}
                  />
                  <Share className="h-4 w-4 flex-shrink-0" />
                </div>
              </li>
              <li>
                <Trans
                  i18nKey="pwa.install.ios.step2"
                  ns="common"
                  components={{ strong: <strong /> }}
                />
              </li>
              <li>
                <Trans
                  i18nKey="pwa.install.ios.step3"
                  ns="common"
                  components={{ strong: <strong /> }}
                />
              </li>
            </ol>
          </div>
        </div>
      )}
    </>
  );

  if (isDesktop) {
    return (
      <Dialog
        open={open}
        onOpenChange={(newOpen) => !newOpen && handleDismiss()}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-center">
              {t('pwa.install.title')}
            </DialogTitle>
            <DialogDescription className="text-center">
              {t('pwa.install.description')}
            </DialogDescription>
          </DialogHeader>

          {content}

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-center">
            {deferredPrompt && (
              <Button onClick={handleInstall} className="w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" />
                {t('pwa.install.actions.installNow')}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleDismiss}
              className="w-full sm:w-auto"
            >
              {deferredPrompt
                ? t('pwa.install.actions.installLater')
                : t('pwa.install.actions.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={(newOpen) => !newOpen && handleDismiss()}>
      <DrawerContent>
        <DrawerHeader className="text-center">
          <DrawerTitle>{t('pwa.install.title')}</DrawerTitle>
          <DrawerDescription>{t('pwa.install.description')}</DrawerDescription>
        </DrawerHeader>

        <div className="px-4">{content}</div>

        <DrawerFooter className="pt-2">
          {deferredPrompt && (
            <Button onClick={handleInstall}>
              <Download className="mr-2 h-4 w-4" />
              {t('pwa.install.actions.installNow')}
            </Button>
          )}
          <DrawerClose asChild>
            <Button variant="outline" onClick={handleDismiss}>
              {deferredPrompt
                ? t('pwa.install.actions.installLater')
                : t('pwa.install.actions.close')}
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

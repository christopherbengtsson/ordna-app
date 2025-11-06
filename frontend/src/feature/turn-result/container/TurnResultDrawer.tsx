import { useTranslation } from 'react-i18next';
import { useMediaQuery } from '@/common/hooks/useMediaQuery';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { TurnResultContentUtil } from '../util/TurnResultContentUtil';
import type { TurnResult } from '../model/TurnResult';
import { HeaderContent } from '../component/HeaderContent';
import { DescriptionContent } from '../component/DescriptionContent';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  turnResult: TurnResult;
  userId: string;
}

export function TurnResultDrawer({
  open,
  onOpenChange,
  turnResult,
  userId,
}: Props) {
  const { t } = useTranslation(['results', 'common']);
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const isUserMarked = turnResult.markedPlayerId === userId;
  const wasEliminated = turnResult.eliminatedPlayerId !== undefined;

  const icon = TurnResultContentUtil.getTurnIcon({
    moveType: turnResult.moveType,
    isUserMarked,
  });

  const title = TurnResultContentUtil.getTurnTitle({
    moveType: turnResult.moveType,
    resolutionType: turnResult.resolutionType,
    t,
  });

  const description = TurnResultContentUtil.getTurnDescription({
    moveType: turnResult.moveType,
    resolutionType: turnResult.resolutionType,
    isUserMarked,
    wasEliminated,
    markedPlayerNickname: turnResult.markedPlayerNickname,
    startsNextRoundPlayerNickname: turnResult.startsNextRoundPlayerNickname,
    t,
  });

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-center">
              <HeaderContent icon={icon} title={title} />
            </DialogTitle>

            {description && (
              <DialogDescription className="text-center text-muted-foreground">
                {description}
              </DialogDescription>
            )}
          </DialogHeader>

          <DescriptionContent turnResult={turnResult} userId={userId} t={t} />
          <div className="flex justify-center pt-2">
            <Button onClick={() => onOpenChange(false)}>{t('actions.close', { ns: 'common' })}</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="text-center">
          <DrawerTitle>
            <HeaderContent icon={icon} title={title} />
          </DrawerTitle>

          {description && (
            <DrawerDescription className="text-center text-muted-foreground">
              {description}
            </DrawerDescription>
          )}
        </DrawerHeader>

        <div className="px-4">
          <DescriptionContent turnResult={turnResult} userId={userId} t={t} />
        </div>

        <DrawerFooter className="pt-2">
          <DrawerClose asChild>
            <Button>{t('actions.close', { ns: 'common' })}</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

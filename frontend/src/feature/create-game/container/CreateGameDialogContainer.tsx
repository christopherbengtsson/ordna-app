import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { useMediaQuery } from '@/common/hooks/useMediaQuery';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { ScrollArea } from '../../../components/ui/scroll-area';
import { CreateGameFormContainer } from './CreateGameFormContainer';

interface Props {
  trigger: React.ReactNode;
}

export function CreateGameDialogContainer({ trigger }: Props) {
  const { t } = useTranslation('game-setup');
  const navigate = useNavigate();
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const [open, setOpen] = useState(false);

  const handleGameCreated = (gameId: string) => {
    setOpen(false);
    navigate({ to: '/lobby/$gameId', params: { gameId } });
  };

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger || <Button variant="outline">{t('create.actions.create')}</Button>}
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('create.title')}</DialogTitle>
            <DialogDescription>
              {t('create.description')}
            </DialogDescription>
          </DialogHeader>
          <CreateGameFormContainer onGameCreated={handleGameCreated} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        {trigger || <Button variant="outline">{t('create.actions.create')}</Button>}
      </DrawerTrigger>
      <DrawerContent className="px-4">
        <DrawerHeader className="text-left">
          <DrawerTitle>{t('create.title')}</DrawerTitle>
          <DrawerDescription>
            {t('create.description')}
          </DrawerDescription>
        </DrawerHeader>

        <ScrollArea className="overflow-y-auto">
          <CreateGameFormContainer onGameCreated={handleGameCreated} />
          <DrawerFooter className="pt-2 px-0">
            <DrawerClose asChild>
              <Button variant="outline">{t('create.actions.cancel')}</Button>
            </DrawerClose>
          </DrawerFooter>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}

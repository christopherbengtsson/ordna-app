import { useState } from 'react';
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
import { CreateGameFormContainer } from './CreateGameFormContainer';
import { useNavigate } from '@tanstack/react-router';
import { ScrollArea } from '../../../components/ui/scroll-area';

interface Props {
  trigger: React.ReactNode;
}

export function CreateGameDialogContainer({ trigger }: Props) {
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
          {trigger || <Button variant="outline">Create Game</Button>}
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Game</DialogTitle>
            <DialogDescription>
              Configure your game settings and start playing
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
        {trigger || <Button variant="outline">Create Game</Button>}
      </DrawerTrigger>
      <DrawerContent className="px-4">
        <DrawerHeader className="text-left">
          <DrawerTitle>Create New Game</DrawerTitle>
          <DrawerDescription>
            Configure your game settings and start playing
          </DrawerDescription>
        </DrawerHeader>

        <ScrollArea className='overflow-y-auto'>
          <CreateGameFormContainer onGameCreated={handleGameCreated} />
          <DrawerFooter className="pt-2 px-0">
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}

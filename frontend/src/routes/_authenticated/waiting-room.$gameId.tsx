import { createFileRoute } from '@tanstack/react-router';
import { WaitingRoomPage } from '../../feature/waiting-room/page/WaitingRoom';

export const Route = createFileRoute('/_authenticated/waiting-room/$gameId')({
  component: WaitingRoomPage,
});

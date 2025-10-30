import { createFileRoute } from '@tanstack/react-router';
import { LobbyPage } from '../../feature/lobby/page/LobbyPage';

// No beforeLoad needed - auth is handled by parent _authenticated layout
export const Route = createFileRoute('/_authenticated/lobby/$gameId')({
  component: LobbyPage,
});

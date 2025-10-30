import { createFileRoute } from '@tanstack/react-router';
import { InGamePage } from '../../feature/in-game/page/InGamePage';

// No beforeLoad needed - auth is handled by parent _authenticated layout
export const Route = createFileRoute('/_authenticated/game/$gameId')({
  component: InGamePage,
});

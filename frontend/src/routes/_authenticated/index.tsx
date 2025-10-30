import { createFileRoute } from '@tanstack/react-router';
import { GameListPage } from '../../feature/game-list/page/GameListPage';

// No beforeLoad needed - auth is handled by parent _authenticated layout
export const Route = createFileRoute('/_authenticated/')({
  component: GameListPage,
});

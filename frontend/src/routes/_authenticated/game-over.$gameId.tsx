import { createFileRoute } from '@tanstack/react-router';
import { GameOverPage } from '../../feature/game-over/page/CompletedGamePage';

export const Route = createFileRoute('/_authenticated/game-over/$gameId')({
  component: GameOverPage,
});

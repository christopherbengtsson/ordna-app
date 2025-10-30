import type { Game } from '../model/Game';
import type { GameList } from '../model/GameList';
import type { RpcGame } from '../model/RpcGame';

const toGameData = (data: RpcGame): Game => ({
  id: data.id,
  status: data.status,
  currentPlayerId: data.current_player_id,
  deadline: data.active_turn_deadline
    ? new Date(data.active_turn_deadline)
    : undefined,
  players: data.players,
  round: data.active_round_number,
  winnerId: data.winner_id,
  isHost: data.is_host,
  isCurrentPlayer: data.is_current_player,
  lastMoveType: data.last_move_type ?? undefined,
  completeWord: data.completed_word ?? undefined,
});

const fromRpc = (data: RpcGame[]) =>
  data.reduce<GameList>(
    (acc, gameData) => {
      const game = toGameData(gameData);

      if (game.status === 'pending') {
        acc['pending'].push(game);
      } else if (game.status === 'active' && game.isCurrentPlayer) {
        acc['currentTurn'].push(game);
      } else if (game.status === 'active') {
        acc['waiting'].push(game);
      } else if (game.status === 'completed') {
        acc['finished'].push(game);
      }

      return acc;
    },
    { currentTurn: [], waiting: [], pending: [], finished: [] },
  );

export const GameListMapper = {
  fromRpc,
};

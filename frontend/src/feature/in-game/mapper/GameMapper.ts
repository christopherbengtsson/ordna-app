import type { Database } from '@/common/model/generated/Database';
import type { ActiveRound } from '../model/ActiveRound';
import type { GameData } from '../model/GameData';
import type { GamePlayer } from '../model/GamePlayer';
import type { GameSettings } from '../model/GameSettings';
import type { RpcActiveRound } from '../model/RpcActiveRound';
import type { RpcPlayer } from '../model/RpcPlayer';
import type { RpcSettings } from '../model/RpcSettings';

const toPlayer = (player: RpcPlayer): GamePlayer => ({
  id: player.id,
  nickname: player.nickname,
  marks: player.marks,
  isEliminated: player.is_eliminated,
  joinOrder: player.join_order,
  isHost: player.is_host,
});

const toSettings = (settings: RpcSettings): GameSettings => ({
  language: settings.language,
  minWordLength: settings.min_word_length,
  maxPlayers: settings.max_players,
  marksToEliminate: settings.marks_to_eliminate,
  completeMoveTimeoutSeconds: settings.complete_move_timeout_seconds,
});

const toActiveRound = (round: RpcActiveRound): ActiveRound => ({
  id: round.id,
  roundNumber: round.round_number,
  startingPlayerId: round.starting_player_id,
  currentPlayerId: round.current_player_id,
  currentSequence: (round.current_sequence ?? '')
    .split('')
    .filter((letter) => !!letter?.length),
  lastMoveType: round.last_move_type ?? undefined,
  status: round.status,
  turnDeadline: new Date(round.turn_deadline),
  resolutionType: round.resolution_type!,
  markedPlayer: round.player_with_mark ?? undefined,
  startedAt: new Date(round.started_at),
  completedAt: round.completed_at ? new Date(round.completed_at) : undefined,
});

const fromRpc = (
  rpcData: Database['public']['Functions']['get_game_by_id']['Returns'][0],
): GameData => ({
  gameId: rpcData.game_id,
  status: rpcData.status,
  startedAt: new Date(rpcData.started_at),
  completedAt: rpcData.completed_at
    ? new Date(rpcData.completed_at)
    : undefined,
  currentPlayerId: rpcData.current_player_id,
  currentRound: rpcData.current_round,
  isCurrentPlayer: rpcData.is_current_player,
  hostPlayerId: rpcData.host_player_id,
  winnerId: rpcData.winner_id,
  players: (rpcData.players as unknown as RpcPlayer[]).map(toPlayer),
  settings: toSettings(rpcData.settings as unknown as RpcSettings),
  activeRound: rpcData.active_round
    ? toActiveRound(rpcData.active_round as unknown as RpcActiveRound)
    : undefined,
});

export const GameMapper = {
  fromRpc,
};

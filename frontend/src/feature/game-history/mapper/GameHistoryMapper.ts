import type { Database } from '@/common/model/generated/Database';
import type { GameHistory } from '../model/GameHistory';
import type { GameHistoryMove } from '../model/GameHistoryMove';
import type { GameHistoryRound } from '../model/GameHistoryRound';
import type { RpcGameHistoryRound } from '../model/RpcGameHistory';

interface RpcMove {
  move_order: number;
  player_id: string;
  player_nickname: string;
  move_type: Database['public']['Enums']['move_type'];
  letter_value: string | null;
  word_value: string | null;
  created_at: string;
}

const toMove = (rpcMove: RpcMove): GameHistoryMove => ({
  moveOrder: rpcMove.move_order,
  playerId: rpcMove.player_id,
  playerNickname: rpcMove.player_nickname,
  moveType: rpcMove.move_type,
  letterValue: rpcMove.letter_value ?? null,
  wordValue: rpcMove.word_value ?? null,
  createdAt: new Date(rpcMove.created_at),
});

const toRound = (rpcRound: RpcGameHistoryRound): GameHistoryRound => ({
  roundId: rpcRound.round_id,
  roundNumber: rpcRound.round_number,
  startedAt: new Date(rpcRound.started_at),
  completedAt: new Date(rpcRound.completed_at),
  resolutionType: rpcRound.resolution_type ?? null,
  playerWithMark: rpcRound.player_with_mark ?? null,
  playerWithMarkNickname: rpcRound.player_with_mark_nickname ?? null,
  moves: (rpcRound.moves as RpcMove[] | null)?.map(toMove) ?? [],
});

const fromRpc = (data: RpcGameHistoryRound[]): GameHistory => data.map(toRound);

export const GameHistoryMapper = {
  fromRpc,
};

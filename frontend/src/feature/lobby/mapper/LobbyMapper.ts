import type { Lobby } from '../model/Lobby';
import type { RpcLobby } from '../model/RpcLobby';

interface RpcLobbyPlayer {
  id: string;
  nickname: string;
  is_host: boolean;
}

const fromRpc = (rpcLobby: RpcLobby): Lobby => ({
  id: rpcLobby.game_id,
  gameId: rpcLobby.game_id,
  inviteCode: rpcLobby.invite_code,
  hostPlayerId: rpcLobby.host_player_id,
  players:
    (rpcLobby.players as unknown as RpcLobbyPlayer[] | undefined)?.map((p) => ({
      id: p.id,
      nickname: p.nickname,
      isHost: p.is_host,
    })) ?? [],
});

export const LobbyMapper = {
  fromRpc,
};

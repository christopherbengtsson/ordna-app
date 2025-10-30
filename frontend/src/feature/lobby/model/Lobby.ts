export interface Lobby {
  id: string;
  gameId: string;
  inviteCode: string;
  hostPlayerId: string;
  players: {
    id: string;
    nickname: string;
    isHost: boolean;
  }[];
}

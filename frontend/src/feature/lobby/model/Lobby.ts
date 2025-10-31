export interface Lobby {
  id: string;
  gameId: string;
  inviteCode: string | undefined;
  hostPlayerId: string;
  players: {
    id: string;
    nickname: string;
    isHost: boolean;
  }[];
}

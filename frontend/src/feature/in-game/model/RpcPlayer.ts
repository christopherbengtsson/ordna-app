export interface RpcPlayer {
  id: string;
  nickname: string;
  marks: number;
  is_eliminated: boolean;
  join_order: number;
  is_host: boolean;
}

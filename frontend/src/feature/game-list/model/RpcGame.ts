import type { Database } from '../../../common/model/generated/Database';

export type RpcGame =
  Database['public']['Functions']['get_games']['Returns'][0];

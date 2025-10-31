const QUERY_KEY = {
  GAME_LIST: 'game-list',
  GAME_DATA: 'game-data',
  GAME_LOBBY: 'game-lobby',

  PROFILE: (id: string) => `profile-${id}`,
} as const;

export type QueryKey = (typeof QUERY_KEY)[keyof typeof QUERY_KEY];

const DEFAULT_POLL_INTERVAL = 15_000;

export const FetchUtil = {
  QUERY_KEY,
  DEFAULT_POLL_INTERVAL,
};

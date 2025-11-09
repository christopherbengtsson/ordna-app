import type { Database } from '../generated/Database';

export interface NotificationData {
  notification_type?: Database['public']['Enums']['notification_type'];

  game_id?: string;

  winner_id?: string;

  winner_name?: string;

  host_name?: string;

  action?: Database['public']['Enums']['notification_action'];

  /** Allow additional properties from FCM */
  [key: string]: unknown;
}

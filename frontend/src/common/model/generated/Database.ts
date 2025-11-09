export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      game_players: {
        Row: {
          game_id: string;
          id: string;
          is_eliminated: boolean;
          join_order: number;
          joined_at: string;
          marks: number;
          player_id: string;
          player_token: string;
        };
        Insert: {
          game_id: string;
          id?: string;
          is_eliminated?: boolean;
          join_order: number;
          joined_at?: string;
          marks?: number;
          player_id: string;
          player_token: string;
        };
        Update: {
          game_id?: string;
          id?: string;
          is_eliminated?: boolean;
          join_order?: number;
          joined_at?: string;
          marks?: number;
          player_id?: string;
          player_token?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'game_players_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'games';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'game_players_player_id_fkey';
            columns: ['player_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      game_settings: {
        Row: {
          complete_move_timeout_seconds: number;
          game_id: string;
          language: string;
          marks_to_eliminate: number;
          max_players: number;
          min_word_length: number;
        };
        Insert: {
          complete_move_timeout_seconds?: number;
          game_id: string;
          language?: string;
          marks_to_eliminate?: number;
          max_players?: number;
          min_word_length?: number;
        };
        Update: {
          complete_move_timeout_seconds?: number;
          game_id?: string;
          language?: string;
          marks_to_eliminate?: number;
          max_players?: number;
          min_word_length?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'game_settings_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: true;
            referencedRelation: 'games';
            referencedColumns: ['id'];
          },
        ];
      };
      games: {
        Row: {
          completed_at: string | null;
          created_at: string;
          current_player_id: string | null;
          current_round: number;
          host_player_id: string;
          id: string;
          invite_token: string | null;
          started_at: string | null;
          status: Database['public']['Enums']['game_status'];
          winner_id: string | null;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          current_player_id?: string | null;
          current_round?: number;
          host_player_id: string;
          id?: string;
          invite_token?: string | null;
          started_at?: string | null;
          status?: Database['public']['Enums']['game_status'];
          winner_id?: string | null;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          current_player_id?: string | null;
          current_round?: number;
          host_player_id?: string;
          id?: string;
          invite_token?: string | null;
          started_at?: string | null;
          status?: Database['public']['Enums']['game_status'];
          winner_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'games_current_player_id_fkey';
            columns: ['current_player_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'games_host_player_id_fkey';
            columns: ['host_player_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'games_winner_id_fkey';
            columns: ['winner_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      moves: {
        Row: {
          created_at: string;
          id: string;
          letter_value: string | null;
          move_order: number;
          move_type: Database['public']['Enums']['move_type'];
          player_id: string;
          round_id: string;
          word_value: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          letter_value?: string | null;
          move_order: number;
          move_type: Database['public']['Enums']['move_type'];
          player_id: string;
          round_id: string;
          word_value?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          letter_value?: string | null;
          move_order?: number;
          move_type?: Database['public']['Enums']['move_type'];
          player_id?: string;
          round_id?: string;
          word_value?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'moves_player_id_fkey';
            columns: ['player_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'moves_round_id_fkey';
            columns: ['round_id'];
            isOneToOne: false;
            referencedRelation: 'rounds';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          created_at: string;
          data: Json | null;
          id: string;
          notification_type: Database['public']['Enums']['notification_type'];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          data?: Json | null;
          id?: string;
          notification_type: Database['public']['Enums']['notification_type'];
          user_id: string;
        };
        Update: {
          created_at?: string;
          data?: Json | null;
          id?: string;
          notification_type?: Database['public']['Enums']['notification_type'];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          fcm_token: string | null;
          id: string;
          is_app_visible: boolean;
          last_seen: string;
          nickname: string;
        };
        Insert: {
          created_at?: string;
          fcm_token?: string | null;
          id: string;
          is_app_visible?: boolean;
          last_seen?: string;
          nickname?: string;
        };
        Update: {
          created_at?: string;
          fcm_token?: string | null;
          id?: string;
          is_app_visible?: boolean;
          last_seen?: string;
          nickname?: string;
        };
        Relationships: [];
      };
      rounds: {
        Row: {
          completed_at: string | null;
          current_player_id: string | null;
          current_sequence: string;
          game_id: string;
          id: string;
          player_with_mark: string | null;
          resolution_type:
            | Database['public']['Enums']['resolution_type']
            | null;
          round_number: number;
          started_at: string;
          starting_player_id: string;
          status: Database['public']['Enums']['round_status'];
          turn_deadline: string | null;
        };
        Insert: {
          completed_at?: string | null;
          current_player_id?: string | null;
          current_sequence?: string;
          game_id: string;
          id?: string;
          player_with_mark?: string | null;
          resolution_type?:
            | Database['public']['Enums']['resolution_type']
            | null;
          round_number: number;
          started_at?: string;
          starting_player_id: string;
          status?: Database['public']['Enums']['round_status'];
          turn_deadline?: string | null;
        };
        Update: {
          completed_at?: string | null;
          current_player_id?: string | null;
          current_sequence?: string;
          game_id?: string;
          id?: string;
          player_with_mark?: string | null;
          resolution_type?:
            | Database['public']['Enums']['resolution_type']
            | null;
          round_number?: number;
          started_at?: string;
          starting_player_id?: string;
          status?: Database['public']['Enums']['round_status'];
          turn_deadline?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'rounds_current_player_id_fkey';
            columns: ['current_player_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'rounds_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'games';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'rounds_player_with_mark_fkey';
            columns: ['player_with_mark'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'rounds_starting_player_id_fkey';
            columns: ['starting_player_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      word_dictionary: {
        Row: {
          language: string;
          word: string;
        };
        Insert: {
          language: string;
          word: string;
        };
        Update: {
          language?: string;
          word?: string;
        };
        Relationships: [];
      };
      word_dictionary_en: {
        Row: {
          language: string;
          word: string;
        };
        Insert: {
          language: string;
          word: string;
        };
        Update: {
          language?: string;
          word?: string;
        };
        Relationships: [];
      };
      word_dictionary_sv: {
        Row: {
          language: string;
          word: string;
        };
        Insert: {
          language: string;
          word: string;
        };
        Update: {
          language?: string;
          word?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      __apply_game_timeout: {
        Args: { p_game_id: string; p_player_id: string };
        Returns: undefined;
      };
      __build_turn_result: {
        Args: {
          p_eliminated_player_id: string;
          p_game_id: string;
          p_marked_player_id: string;
          p_move_type: Database['public']['Enums']['move_type'];
          p_next_round_starter_id: string;
          p_resolution_type: Database['public']['Enums']['resolution_type'];
          p_round_status: Database['public']['Enums']['round_status'];
          p_sequence: string;
        };
        Returns: Database['public']['CompositeTypes']['turn_result'];
      };
      __process_expired_turns: {
        Args: Record<PropertyKey, never>;
        Returns: {
          error_count: number;
          processed_count: number;
        }[];
      };
      _award_mark_and_check_elimination: {
        Args: { p_game_id: string; p_player_id: string };
        Returns: boolean;
      };
      _check_and_complete_game: {
        Args: { p_game_id: string };
        Returns: boolean;
      };
      _get_next_player: {
        Args: { p_current_player_id: string; p_game_id: string };
        Returns: string;
      };
      _get_previous_player: {
        Args: { p_current_player_id: string; p_game_id: string };
        Returns: string;
      };
      _internal_start_game: {
        Args: {
          p_game_id: string;
          p_game_record: Database['public']['Tables']['games']['Row'];
        };
        Returns: string;
      };
      _is_valid_word: {
        Args: { p_language: string; p_word: string };
        Returns: boolean;
      };
      _queue_game_end_notification: {
        Args: { p_game_id: string; p_player_id: string; p_winner_id: string };
        Returns: undefined;
      };
      _queue_game_start_notification: {
        Args: { p_game_id: string; p_host_name: string; p_player_id: string };
        Returns: undefined;
      };
      _queue_turn_notification: {
        Args:
          | {
              p_current_sequence: string;
              p_game_id: string;
              p_player_id: string;
            }
          | { p_game_id: string; p_player_id: string };
        Returns: undefined;
      };
      _start_new_round: {
        Args: {
          p_game_id: string;
          p_player_with_mark: string;
          p_resolution_type: Database['public']['Enums']['resolution_type'];
          p_starting_player_id: string;
        };
        Returns: string;
      };
      _validate_player_can_act: {
        Args: { p_game_id: string };
        Returns: Record<string, unknown>;
      };
      accept_invite: {
        Args: { p_invite_token: string; p_nickname?: string };
        Returns: {
          auto_started: boolean;
          game_id: string;
        }[];
      };
      call_bluff: {
        Args: { p_game_id: string };
        Returns: Database['public']['CompositeTypes']['turn_result'];
      };
      call_in_game_timeout: {
        Args: { p_game_id: string };
        Returns: Database['public']['CompositeTypes']['turn_result'];
      };
      call_word: {
        Args: { p_game_id: string };
        Returns: Database['public']['CompositeTypes']['turn_result'];
      };
      clear_fcm_token: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      create_game: {
        Args: {
          p_complete_move_timeout_seconds?: number;
          p_language?: string;
          p_marks_to_eliminate?: number;
          p_max_players?: number;
          p_min_word_length?: number;
          p_nickname?: string;
        };
        Returns: {
          game_id: string;
        }[];
      };
      fold: {
        Args: { p_game_id: string };
        Returns: Database['public']['CompositeTypes']['turn_result'];
      };
      get_game_by_id: {
        Args: { p_game_id: string };
        Returns: {
          active_round: Json;
          completed_at: string;
          current_player_id: string;
          current_round: number;
          game_id: string;
          host_player_id: string;
          is_current_player: boolean;
          players: Json;
          settings: Json;
          started_at: string;
          status: Database['public']['Enums']['game_status'];
          winner_id: string;
        }[];
      };
      get_game_history: {
        Args: { p_game_id: string };
        Returns: {
          completed_at: string;
          moves: Json;
          player_with_mark: string;
          player_with_mark_nickname: string;
          resolution_type: Database['public']['Enums']['resolution_type'];
          round_id: string;
          round_number: number;
          started_at: string;
        }[];
      };
      get_games: {
        Args: { p_limit?: number; p_offset?: number };
        Returns: {
          active_round_number: number;
          active_turn_deadline: string;
          completed_word: string;
          current_player_id: string;
          id: string;
          is_current_player: boolean;
          is_host: boolean;
          last_move_type: Database['public']['Enums']['move_type'];
          players: string[];
          status: Database['public']['Enums']['game_status'];
          winner_id: string;
        }[];
      };
      get_lobby_by_game_id: {
        Args: { p_game_id: string };
        Returns: {
          game_id: string;
          host_player_id: string;
          invite_code: string;
          players: Json;
        }[];
      };
      resolve_bluff: {
        Args: { p_game_id: string; p_word: string };
        Returns: Database['public']['CompositeTypes']['turn_result'];
      };
      set_app_visibility: {
        Args: { visible: boolean };
        Returns: undefined;
      };
      start_game: {
        Args: { p_game_id: string };
        Returns: {
          game_id: string;
          starting_player_id: string;
        }[];
      };
      submit_letter: {
        Args: { p_game_id: string; p_letter: string };
        Returns: Database['public']['CompositeTypes']['turn_result'];
      };
      update_fcm_token: {
        Args: { token: string };
        Returns: undefined;
      };
    };
    Enums: {
      game_status: 'pending' | 'active' | 'completed';
      move_type:
        | 'add_letter'
        | 'call_word'
        | 'call_bluff'
        | 'fold'
        | 'timeout'
        | 'resolve_bluff';
      notification_action:
        | 'navigate_to_game'
        | 'navigate_to_game_over'
        | 'navigate_to_lobby'
        | 'navigate_to_waiting_room';
      notification_type: 'your_turn' | 'game_ended' | 'game_started';
      resolution_type:
        | 'timeout'
        | 'bluff_true'
        | 'bluff_false'
        | 'word_valid'
        | 'word_invalid'
        | 'fold';
      round_status: 'active' | 'completed';
    };
    CompositeTypes: {
      turn_result: {
        marked_player_id: string | null;
        marked_player_nickname: string | null;
        eliminated_player_id: string | null;
        sequence: string | null;
        move_type: Database['public']['Enums']['move_type'] | null;
        resolution_type: Database['public']['Enums']['resolution_type'] | null;
        round_status: Database['public']['Enums']['round_status'] | null;
        game_status: Database['public']['Enums']['game_status'] | null;
        starts_next_round_player_id: string | null;
        starts_next_round_player_nickname: string | null;
      };
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  'public'
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      game_status: ['pending', 'active', 'completed'],
      move_type: [
        'add_letter',
        'call_word',
        'call_bluff',
        'fold',
        'timeout',
        'resolve_bluff',
      ],
      notification_action: [
        'navigate_to_game',
        'navigate_to_game_over',
        'navigate_to_lobby',
        'navigate_to_waiting_room',
      ],
      notification_type: ['your_turn', 'game_ended', 'game_started'],
      resolution_type: [
        'timeout',
        'bluff_true',
        'bluff_false',
        'word_valid',
        'word_invalid',
        'fold',
      ],
      round_status: ['active', 'completed'],
    },
  },
} as const;

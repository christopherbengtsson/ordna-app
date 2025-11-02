-- RPC function to get game history (completed rounds only)
CREATE OR REPLACE FUNCTION public.get_game_history(p_game_id uuid)
RETURNS TABLE(
  round_id uuid,
  round_number int,
  started_at timestamptz,
  completed_at timestamptz,
  resolution_type public.resolution_type,
  player_with_mark uuid,
  player_with_mark_nickname text,
  moves jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_player boolean;
BEGIN
  -- Authentication check
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  -- Verify user is a player in this game
  SELECT exists(
    SELECT 1 FROM public.game_players gp
    WHERE gp.game_id = p_game_id AND gp.player_id = v_uid
  ) INTO v_is_player;

  IF NOT v_is_player THEN
    RAISE EXCEPTION 'access denied: not a player in this game';
  END IF;

  RETURN QUERY
  SELECT
    r.id as round_id,
    r.round_number,
    r.started_at,
    r.completed_at,
    r.resolution_type,
    r.player_with_mark,
    p_mark.nickname as player_with_mark_nickname,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'move_order', m.move_order,
          'player_id', m.player_id,
          'player_nickname', p.nickname,
          'move_type', m.move_type,
          'letter_value', m.letter_value,
          'word_value', m.word_value,
          'created_at', m.created_at
        ) ORDER BY m.move_order ASC
      )
      FROM public.moves m
      JOIN public.profiles p ON p.id = m.player_id
      WHERE m.round_id = r.id
    ) as moves
  FROM public.rounds r
  LEFT JOIN public.profiles p_mark ON p_mark.id = r.player_with_mark
  WHERE r.game_id = p_game_id
    AND r.status = 'completed'  -- Only completed rounds
  ORDER BY r.round_number DESC;  -- Most recent first
END;
$$;

COMMENT ON FUNCTION public.get_game_history(uuid) IS
  'Public RPC: Returns completed rounds with moves for a game. Shows player nicknames, timestamps, and resolution details.';

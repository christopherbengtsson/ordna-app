-- Migration: Allow Unicode letters (Swedish ö, ä, å, etc.) in submit_letter function
-- Date: 2025-11-01
-- Description: Removes A-Z only restriction to support Swedish and other Unicode letters.
--              Validates alphabetic characters only (blocks emojis, numbers, special chars).

CREATE OR REPLACE FUNCTION "public"."submit_letter"("p_game_id" "uuid", "p_letter" "text")
RETURNS "void"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" TO ''
AS $_$
declare
  v_validation_result record;
  v_game public.games;
  v_round public.rounds;
  v_settings public.game_settings;
  v_player_id uuid;
  v_letter text;
  v_new_sequence text;
  v_next_player_id uuid;
  v_new_deadline timestamptz;
  v_move_order int;
begin
  -- Validate player can act (locks game, verifies state)
  select * from public._validate_player_can_act(p_game_id) into v_validation_result;
  v_game := v_validation_result.v_game;
  v_round := v_validation_result.v_round;
  v_settings := v_validation_result.v_settings;
  v_player_id := v_validation_result.v_player_id;

  -- Verify it's this player's turn
  if v_round.current_player_id <> v_player_id then
    raise exception 'not your turn';
  end if;

  -- Validate letter input
  if p_letter is null or char_length(p_letter) <> 1 then
    raise exception 'letter must be exactly one character';
  end if;

  -- Convert to uppercase (supports Swedish and other Unicode letters)
  v_letter := upper(p_letter);

  -- Validate it's still a single character after uppercasing
  -- (some Unicode characters might expand when uppercased)
  if char_length(v_letter) <> 1 then
    raise exception 'letter must be a single character';
  end if;

  -- Validate it's an alphabetic character (allows Swedish letters, blocks emojis/numbers/special chars)
  if v_letter !~ '^[[:alpha:]]$' then
    raise exception 'letter must be an alphabetic character';
  end if;

  -- Check sequence length limit
  v_new_sequence := v_round.current_sequence || v_letter;
  if char_length(v_new_sequence) > 45 then
    raise exception 'sequence cannot exceed 45 characters';
  end if;

  -- Get next move order
  select coalesce(max(m.move_order), 0) + 1 into v_move_order
  from public.moves m
  where m.round_id = v_round.id;

  -- Record the move
  insert into public.moves (
    id, round_id, player_id, move_type, letter_value, move_order, created_at
  )
  values (
    gen_random_uuid(), v_round.id, v_player_id, 'add_letter', v_letter, v_move_order, now()
  );

  -- Update round sequence
  update public.rounds
  set current_sequence = v_new_sequence
  where id = v_round.id;

  -- Get next player
  v_next_player_id := public._get_next_player(p_game_id, v_player_id);

  if v_next_player_id is null then
    raise exception 'no valid next player found';
  end if;

  -- Calculate new deadline
  v_new_deadline := now() + (v_settings.complete_move_timeout_seconds * interval '1 second');

  -- Update round with next player and deadline
  update public.rounds
  set
    current_player_id = v_next_player_id,
    turn_deadline = v_new_deadline
  where id = v_round.id;

  -- Update game with next player
  update public.games
  set current_player_id = v_next_player_id
  where id = p_game_id;
end;
$_$;

ALTER FUNCTION "public"."submit_letter"("p_game_id" "uuid", "p_letter" "text") OWNER TO "postgres";

COMMENT ON FUNCTION "public"."submit_letter"("p_game_id" "uuid", "p_letter" "text") IS 'Public RPC: Submit a letter to the current round. Accepts Unicode alphabetic characters including Swedish letters (ö, ä, å). Blocks emojis, numbers, and special characters.';

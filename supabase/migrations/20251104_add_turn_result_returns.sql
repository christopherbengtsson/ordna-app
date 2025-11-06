-- Migration: Add turn_result return type to game action RPCs
-- This allows the frontend to display rich outcome information after each move

-- Step 1: Create custom composite type for turn results
CREATE TYPE public.turn_result AS (
  marked_player_id uuid,
  marked_player_nickname text,
  eliminated_player_id uuid,
  sequence text,
  move_type public.move_type,
  resolution_type public.resolution_type,
  round_status public.round_status,
  game_status public.game_status,
  starts_next_round_player_id uuid,
  starts_next_round_player_nickname text
);

-- Step 2: Create system-only helper function to build turn results
CREATE OR REPLACE FUNCTION public.__build_turn_result(
  p_game_id uuid,
  p_sequence text,
  p_move_type public.move_type,
  p_marked_player_id uuid,
  p_eliminated_player_id uuid,
  p_resolution_type public.resolution_type,
  p_round_status public.round_status,
  p_next_round_starter_id uuid
) RETURNS public.turn_result
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_result public.turn_result;
  v_game_status public.game_status;
  v_marked_nickname text;
  v_next_starter_nickname text;
BEGIN
  -- Validate required parameter
  IF p_game_id IS NULL THEN
    RAISE EXCEPTION '__build_turn_result: p_game_id cannot be NULL';
  END IF;

  -- Get current game status
  SELECT g.status INTO v_game_status
  FROM public.games g
  WHERE g.id = p_game_id;

  -- Get marked player nickname (if any)
  IF p_marked_player_id IS NOT NULL THEN
    SELECT p.nickname INTO v_marked_nickname
    FROM public.profiles p
    WHERE p.id = p_marked_player_id;
  END IF;

  -- Get next round starter nickname (if any)
  IF p_next_round_starter_id IS NOT NULL THEN
    SELECT p.nickname INTO v_next_starter_nickname
    FROM public.profiles p
    WHERE p.id = p_next_round_starter_id;
  END IF;

  -- Build result
  v_result.marked_player_nickname := v_marked_nickname;
  v_result.marked_player_id := p_marked_player_id;
  v_result.eliminated_player_id := p_eliminated_player_id;
  v_result.sequence := p_sequence;
  v_result.move_type := p_move_type;
  v_result.resolution_type := p_resolution_type;
  v_result.round_status := p_round_status;
  v_result.game_status := v_game_status;
  v_result.starts_next_round_player_id := p_next_round_starter_id;
  v_result.starts_next_round_player_nickname := v_next_starter_nickname;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.__build_turn_result(
  p_game_id uuid,
  p_sequence text,
  p_move_type public.move_type,
  p_marked_player_id uuid,
  p_eliminated_player_id uuid,
  p_resolution_type public.resolution_type,
  p_round_status public.round_status,
  p_next_round_starter_id uuid
) IS 'System function: Builds turn result data structure. Only called by action RPCs. Double underscore prefix indicates system-only access.';

-- Step 3: Drop existing RPC functions (can't change return type with CREATE OR REPLACE)
DROP FUNCTION IF EXISTS public.submit_letter(uuid, text);
DROP FUNCTION IF EXISTS public.call_bluff(uuid);
DROP FUNCTION IF EXISTS public.call_word(uuid);
DROP FUNCTION IF EXISTS public.resolve_bluff(uuid, text);
DROP FUNCTION IF EXISTS public.fold(uuid);
DROP FUNCTION IF EXISTS public.call_in_game_timeout(uuid);

-- Step 4: Update submit_letter to return turn_result
CREATE OR REPLACE FUNCTION public.submit_letter(p_game_id uuid, p_letter text)
RETURNS public.turn_result
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $_$
DECLARE
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
BEGIN
  -- Validate player can act (locks game, verifies state)
  SELECT * FROM public._validate_player_can_act(p_game_id) INTO v_validation_result;
  v_game := v_validation_result.v_game;
  v_round := v_validation_result.v_round;
  v_settings := v_validation_result.v_settings;
  v_player_id := v_validation_result.v_player_id;

  -- Verify it's this player's turn
  IF v_round.current_player_id <> v_player_id THEN
    RAISE EXCEPTION 'not your turn';
  END IF;

  -- Validate letter input
  IF p_letter IS NULL OR char_length(p_letter) <> 1 THEN
    RAISE EXCEPTION 'letter must be exactly one character';
  END IF;

  -- Convert to uppercase (supports Swedish and other Unicode letters)
  v_letter := upper(p_letter);

  -- Validate it's still a single character after uppercasing
  -- (some Unicode characters might expand when uppercased)
  IF char_length(v_letter) <> 1 THEN
    RAISE EXCEPTION 'letter must be a single character';
  END IF;

  -- Validate it's an alphabetic character (allows Swedish letters, blocks emojis/numbers/special chars)
  IF v_letter !~ '^[[:alpha:]]$' THEN
    RAISE EXCEPTION 'letter must be an alphabetic character';
  END IF;

  -- Check sequence length limit
  v_new_sequence := v_round.current_sequence || v_letter;
  IF char_length(v_new_sequence) > 45 THEN
    RAISE EXCEPTION 'sequence cannot exceed 45 characters';
  END IF;

  -- Get next move order
  SELECT COALESCE(MAX(m.move_order), 0) + 1 INTO v_move_order
  FROM public.moves m
  WHERE m.round_id = v_round.id;

  -- Record the move
  INSERT INTO public.moves (
    id, round_id, player_id, move_type, letter_value, move_order, created_at
  )
  VALUES (
    gen_random_uuid(), v_round.id, v_player_id, 'add_letter', v_letter, v_move_order, now()
  );

  -- Update round sequence
  UPDATE public.rounds
  SET current_sequence = v_new_sequence
  WHERE id = v_round.id;

  -- Get next player
  v_next_player_id := public._get_next_player(p_game_id, v_player_id);

  IF v_next_player_id IS NULL THEN
    RAISE EXCEPTION 'no valid next player found';
  END IF;

  -- Calculate new deadline
  v_new_deadline := now() + (v_settings.complete_move_timeout_seconds * interval '1 second');

  -- Update round with next player and deadline
  UPDATE public.rounds
  SET
    current_player_id = v_next_player_id,
    turn_deadline = v_new_deadline
  WHERE id = v_round.id;

  -- Update game with next player
  UPDATE public.games
  SET current_player_id = v_next_player_id
  WHERE id = p_game_id;

  -- Return turn result
  RETURN public.__build_turn_result(
    p_game_id := p_game_id,
    p_sequence := v_new_sequence,
    p_move_type := 'add_letter'::public.move_type,
    p_marked_player_id := NULL,
    p_eliminated_player_id := NULL,
    p_resolution_type := NULL,
    p_round_status := 'active'::public.round_status,
    p_next_round_starter_id := NULL
  );
END;
$_$;

-- Step 5: Update call_bluff to return turn_result
CREATE OR REPLACE FUNCTION public.call_bluff(p_game_id uuid)
RETURNS public.turn_result
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_validation_result record;
  v_game public.games;
  v_round public.rounds;
  v_settings public.game_settings;
  v_player_id uuid;
  v_move_order int;
  v_previous_player_id uuid;
  v_new_deadline timestamptz;
  v_last_move_type public.move_type;
BEGIN
  -- Validate player can act (locks game, verifies state)
  SELECT * FROM public._validate_player_can_act(p_game_id) INTO v_validation_result;
  v_game := v_validation_result.v_game;
  v_round := v_validation_result.v_round;
  v_settings := v_validation_result.v_settings;
  v_player_id := v_validation_result.v_player_id;

  -- Verify it's this player's turn
  IF v_round.current_player_id <> v_player_id THEN
    RAISE EXCEPTION 'not your turn';
  END IF;

  -- Validate sequence is not empty
  IF v_round.current_sequence IS NULL OR char_length(v_round.current_sequence) = 0 THEN
    RAISE EXCEPTION 'cannot call bluff on empty sequence';
  END IF;

  -- Check minimum word length requirement
  IF char_length(v_round.current_sequence) < v_settings.min_word_length THEN
    RAISE EXCEPTION 'sequence too short to call bluff (minimum: %)', v_settings.min_word_length;
  END IF;

  -- Get the last move and validate it was 'add_letter'
  SELECT m.move_type INTO v_last_move_type
  FROM public.moves m
  WHERE m.round_id = v_round.id
  ORDER BY m.move_order DESC
  LIMIT 1;

  IF v_last_move_type IS NULL THEN
    RAISE EXCEPTION 'no previous move found';
  END IF;

  IF v_last_move_type <> 'add_letter'::public.move_type THEN
    RAISE EXCEPTION 'can only call bluff after a letter was added (last move: %)', v_last_move_type;
  END IF;

  -- Get previous player (who added the last letter and is being challenged)
  v_previous_player_id := public._get_previous_player(p_game_id, v_player_id);

  IF v_previous_player_id IS NULL THEN
    RAISE EXCEPTION 'no valid previous player found';
  END IF;

  -- Get next move order
  SELECT COALESCE(MAX(m.move_order), 0) + 1 INTO v_move_order
  FROM public.moves m
  WHERE m.round_id = v_round.id;

  -- Record the call_bluff move
  INSERT INTO public.moves (
    id, round_id, player_id, move_type, move_order, created_at
  )
  VALUES (
    gen_random_uuid(), v_round.id, v_player_id, 'call_bluff', v_move_order, now()
  );

  -- Calculate new deadline for previous player to respond
  v_new_deadline := now() + (v_settings.complete_move_timeout_seconds * interval '1 second');

  -- Update round: turn goes to PREVIOUS player (they must resolve the bluff)
  UPDATE public.rounds
  SET
    current_player_id = v_previous_player_id,
    turn_deadline = v_new_deadline
  WHERE id = v_round.id;

  -- Update game: current player is now the previous player
  UPDATE public.games
  SET current_player_id = v_previous_player_id
  WHERE id = p_game_id;

  -- Return turn result (no marks awarded, round continues)
  RETURN public.__build_turn_result(
    p_game_id := p_game_id,
    p_sequence := v_round.current_sequence,
    p_move_type := 'call_bluff'::public.move_type,
    p_marked_player_id := NULL,
    p_eliminated_player_id := NULL,
    p_resolution_type := NULL,
    p_round_status := 'active'::public.round_status,
    p_next_round_starter_id := NULL
  );
END;
$$;

-- Step 6: Update call_word to return turn_result
CREATE OR REPLACE FUNCTION public.call_word(p_game_id uuid)
RETURNS public.turn_result
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_validation_result record;
  v_game public.games;
  v_round public.rounds;
  v_settings public.game_settings;
  v_player_id uuid;
  v_move_order int;
  v_is_valid_word boolean;
  v_previous_player_id uuid;
  v_was_eliminated boolean;
  v_game_ended boolean;
  v_player_with_mark uuid;
  v_resolution_type public.resolution_type;
  v_next_round_starter uuid;
  v_stored_sequence text;
BEGIN
  -- Validate player can act (locks game, verifies state)
  SELECT * FROM public._validate_player_can_act(p_game_id) INTO v_validation_result;
  v_game := v_validation_result.v_game;
  v_round := v_validation_result.v_round;
  v_settings := v_validation_result.v_settings;
  v_player_id := v_validation_result.v_player_id;

  -- Verify it's this player's turn
  IF v_round.current_player_id <> v_player_id THEN
    RAISE EXCEPTION 'not your turn';
  END IF;

  -- Validate sequence is not empty
  IF v_round.current_sequence IS NULL OR char_length(v_round.current_sequence) = 0 THEN
    RAISE EXCEPTION 'cannot call word on empty sequence';
  END IF;

  -- Check minimum word length
  IF char_length(v_round.current_sequence) < v_settings.min_word_length THEN
    RAISE EXCEPTION 'sequence too short (minimum: %)', v_settings.min_word_length;
  END IF;

  -- Store sequence before it gets cleared by _start_new_round
  v_stored_sequence := v_round.current_sequence;

  -- Get next move order
  SELECT COALESCE(MAX(m.move_order), 0) + 1 INTO v_move_order
  FROM public.moves m
  WHERE m.round_id = v_round.id;

  -- Record the call_word move
  INSERT INTO public.moves (
    id, round_id, player_id, move_type, word_value, move_order, created_at
  )
  VALUES (
    gen_random_uuid(), v_round.id, v_player_id, 'call_word', v_round.current_sequence, v_move_order, now()
  );

  -- Check if word is valid in dictionary
  v_is_valid_word := public._is_valid_word(v_round.current_sequence, v_settings.language);

  -- Get previous player (who added the last letter)
  v_previous_player_id := public._get_previous_player(p_game_id, v_player_id);

  IF v_previous_player_id IS NULL THEN
    RAISE EXCEPTION 'no valid previous player found';
  END IF;

  -- Determine who gets the mark and who starts next round based on word validity
  IF v_is_valid_word THEN
    -- Word is valid: previous player gets mark
    v_player_with_mark := v_previous_player_id;
    v_resolution_type := 'word_valid'::public.resolution_type;
    v_next_round_starter := v_player_id;  -- Caller starts next round
  ELSE
    -- Word is invalid: current player gets mark
    v_player_with_mark := v_player_id;
    v_resolution_type := 'word_invalid'::public.resolution_type;
    v_next_round_starter := v_previous_player_id;  -- Previous player starts next round
  END IF;

  -- Award mark and check for elimination
  v_was_eliminated := public._award_mark_and_check_elimination(
    p_game_id,
    v_player_with_mark
  );

  -- Check if game is over (handles winner detection)
  v_game_ended := public._check_and_complete_game(p_game_id);

  -- If game continues, start new round with appropriate starting player
  IF NOT v_game_ended THEN
    PERFORM public._start_new_round(
      p_game_id,
      v_next_round_starter,
      v_resolution_type,
      v_player_with_mark
    );
  END IF;

  -- Return turn result with stored sequence
  RETURN public.__build_turn_result(
    p_game_id := p_game_id,
    p_sequence := v_stored_sequence,
    p_move_type := 'call_word'::public.move_type,
    p_marked_player_id := v_player_with_mark,
    p_eliminated_player_id := CASE WHEN v_was_eliminated THEN v_player_with_mark ELSE NULL END,
    p_resolution_type := v_resolution_type,
    p_round_status := 'completed'::public.round_status,
    p_next_round_starter_id := CASE WHEN v_game_ended THEN NULL ELSE v_next_round_starter END
  );
END;
$$;

-- Step 7: Update resolve_bluff to return turn_result
CREATE OR REPLACE FUNCTION public.resolve_bluff(p_game_id uuid, p_word text)
RETURNS public.turn_result
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_validation_result record;
  v_game public.games;
  v_round public.rounds;
  v_settings public.game_settings;
  v_player_id uuid;
  v_move_order int;
  v_last_move_type public.move_type;
  v_bluff_caller_id uuid;
  v_normalized_word text;
  v_is_valid_word boolean := false;
  v_word_is_valid boolean := false;
  v_player_with_mark uuid;
  v_resolution_type public.resolution_type;
  v_next_round_starter uuid;
  v_was_eliminated boolean;
  v_game_ended boolean;
  v_stored_sequence text;
BEGIN
  -- Validate player can act (locks game, verifies state)
  SELECT * FROM public._validate_player_can_act(p_game_id) INTO v_validation_result;
  v_game := v_validation_result.v_game;
  v_round := v_validation_result.v_round;
  v_settings := v_validation_result.v_settings;
  v_player_id := v_validation_result.v_player_id;

  -- Verify it's this player's turn (the challenged player)
  IF v_round.current_player_id <> v_player_id THEN
    RAISE EXCEPTION 'not your turn';
  END IF;

  -- Validate word parameter
  IF p_word IS NULL OR char_length(trim(p_word)) = 0 THEN
    RAISE EXCEPTION 'word parameter is required';
  END IF;

  -- Normalize word to uppercase for case-insensitive comparison
  v_normalized_word := upper(trim(p_word));

  -- Store sequence before it gets cleared by _start_new_round
  v_stored_sequence := v_round.current_sequence;

  -- Get the last move and validate it was 'call_bluff'
  SELECT m.move_type, m.player_id INTO v_last_move_type, v_bluff_caller_id
  FROM public.moves m
  WHERE m.round_id = v_round.id
  ORDER BY m.move_order DESC
  LIMIT 1;

  IF v_last_move_type IS NULL THEN
    RAISE EXCEPTION 'no previous move found';
  END IF;

  IF v_last_move_type <> 'call_bluff'::public.move_type THEN
    RAISE EXCEPTION 'can only resolve after a bluff was called (last move: %)', v_last_move_type;
  END IF;

  IF v_bluff_caller_id IS NULL THEN
    RAISE EXCEPTION 'bluff caller not found';
  END IF;

  -- Validate the word against all requirements
  -- All validations must pass for the word to be considered valid

  -- NOTE: By design, resolver can prompt with current sequence, hence length >= instead of >.

  -- Check 1: Word must start with current sequence
  IF NOT (v_normalized_word LIKE v_round.current_sequence || '%') THEN
    v_word_is_valid := false;
    RAISE NOTICE 'word validation failed: does not start with sequence (word: %, sequence: %)',
      v_normalized_word, v_round.current_sequence;
  ELSE
    -- Check 2: Word length must be >= sequence length
    IF char_length(v_normalized_word) < char_length(v_round.current_sequence) THEN
      v_word_is_valid := false;
      RAISE NOTICE 'word validation failed: shorter than sequence';
    ELSE
      -- Check 3: Word must meet minimum word length requirement
      IF char_length(v_normalized_word) < v_settings.min_word_length THEN
        v_word_is_valid := false;
        RAISE NOTICE 'word validation failed: below minimum length (min: %)', v_settings.min_word_length;
      ELSE
        -- Check 4: Word must be valid in dictionary
        v_is_valid_word := public._is_valid_word(v_normalized_word, v_settings.language);

        IF NOT v_is_valid_word THEN
          v_word_is_valid := false;
          RAISE NOTICE 'word validation failed: not in dictionary';
        ELSE
          -- All checks passed!
          v_word_is_valid := true;
          RAISE NOTICE 'word validation passed: % is valid', v_normalized_word;
        END IF;
      END IF;
    END IF;
  END IF;

  -- Get next move order
  SELECT COALESCE(MAX(m.move_order), 0) + 1 INTO v_move_order
  FROM public.moves m
  WHERE m.round_id = v_round.id;

  -- Record the resolve_bluff move with the word
  INSERT INTO public.moves (
    id, round_id, player_id, move_type, word_value, move_order, created_at
  )
  VALUES (
    gen_random_uuid(), v_round.id, v_player_id, 'resolve_bluff', v_normalized_word, v_move_order, now()
  );

  -- Determine resolution based on word validity
  IF v_word_is_valid THEN
    -- Word is valid: bluff call was wrong (bluff_false)
    -- Bluff caller gets the mark
    v_player_with_mark := v_bluff_caller_id;
    v_resolution_type := 'bluff_false'::public.resolution_type;
    v_next_round_starter := v_player_id;  -- Resolver (current player) starts next round

    RAISE NOTICE 'bluff was false: caller % gets mark, resolver % starts next round',
      v_bluff_caller_id, v_player_id;
  ELSE
    -- Word is invalid: bluff call was correct (bluff_true)
    -- Resolver (current player) gets the mark
    v_player_with_mark := v_player_id;
    v_resolution_type := 'bluff_true'::public.resolution_type;
    v_next_round_starter := v_bluff_caller_id;  -- Bluff caller starts next round

    RAISE NOTICE 'bluff was true: resolver % gets mark, caller % starts next round',
      v_player_id, v_bluff_caller_id;
  END IF;

  -- Award mark and check for elimination
  v_was_eliminated := public._award_mark_and_check_elimination(
    p_game_id,
    v_player_with_mark
  );

  -- Check if game is over (handles winner detection)
  v_game_ended := public._check_and_complete_game(p_game_id);

  -- If game continues, start new round with appropriate starting player
  IF NOT v_game_ended THEN
    PERFORM public._start_new_round(
      p_game_id,
      v_next_round_starter,
      v_resolution_type,
      v_player_with_mark
    );
  END IF;

  -- Return turn result with stored sequence
  RETURN public.__build_turn_result(
    p_game_id := p_game_id,
    p_sequence := v_stored_sequence,
    p_move_type := 'resolve_bluff'::public.move_type,
    p_marked_player_id := v_player_with_mark,
    p_eliminated_player_id := CASE WHEN v_was_eliminated THEN v_player_with_mark ELSE NULL END,
    p_resolution_type := v_resolution_type,
    p_round_status := 'completed'::public.round_status,
    p_next_round_starter_id := CASE WHEN v_game_ended THEN NULL ELSE v_next_round_starter END
  );
END;
$$;

-- Step 8: Update fold to return turn_result
CREATE OR REPLACE FUNCTION public.fold(p_game_id uuid)
RETURNS public.turn_result
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_validation_result record;
  v_game public.games;
  v_round public.rounds;
  v_settings public.game_settings;
  v_player_id uuid;
  v_move_order int;
  v_was_eliminated boolean;
  v_game_ended boolean;
  v_previous_player_id uuid;
  v_stored_sequence text;
BEGIN
  -- Validate player can act (locks game, verifies state)
  SELECT * FROM public._validate_player_can_act(p_game_id) INTO v_validation_result;
  v_game := v_validation_result.v_game;
  v_round := v_validation_result.v_round;
  v_settings := v_validation_result.v_settings;
  v_player_id := v_validation_result.v_player_id;

  -- Verify it's this player's turn
  IF v_round.current_player_id <> v_player_id THEN
    RAISE EXCEPTION 'not your turn';
  END IF;

  -- Store sequence before it gets cleared by _start_new_round
  v_stored_sequence := v_round.current_sequence;

  -- Get next move order
  SELECT COALESCE(MAX(m.move_order), 0) + 1 INTO v_move_order
  FROM public.moves m
  WHERE m.round_id = v_round.id;

  -- Record the fold move
  INSERT INTO public.moves (
    id, round_id, player_id, move_type, move_order, created_at
  )
  VALUES (
    gen_random_uuid(), v_round.id, v_player_id, 'fold', v_move_order, now()
  );

  -- Award mark to folding player and check elimination
  v_was_eliminated := public._award_mark_and_check_elimination(
    p_game_id,
    v_player_id
  );

  -- Check if game is over (handles winner detection)
  v_game_ended := public._check_and_complete_game(p_game_id);

  -- If game continues, start new round with previous player
  IF NOT v_game_ended THEN
    -- Get previous player in turn order
    v_previous_player_id := public._get_previous_player(
      p_game_id,
      v_player_id
    );

    IF v_previous_player_id IS NULL THEN
      RAISE EXCEPTION 'no valid previous player found';
    END IF;

    -- Start new round with previous player
    PERFORM public._start_new_round(
      p_game_id,
      v_previous_player_id,
      'fold'::public.resolution_type,
      v_player_id  -- player who received the mark
    );
  END IF;

  -- Return turn result with stored sequence
  RETURN public.__build_turn_result(
    p_game_id := p_game_id,
    p_sequence := v_stored_sequence,
    p_move_type := 'fold'::public.move_type,
    p_marked_player_id := v_player_id,
    p_eliminated_player_id := CASE WHEN v_was_eliminated THEN v_player_id ELSE NULL END,
    p_resolution_type := 'fold'::public.resolution_type,
    p_round_status := 'completed'::public.round_status,
    p_next_round_starter_id := CASE WHEN v_game_ended THEN NULL ELSE v_previous_player_id END
  );
END;
$$;

-- Step 9: Update call_in_game_timeout to return turn_result
CREATE OR REPLACE FUNCTION public.call_in_game_timeout(p_game_id uuid)
RETURNS public.turn_result
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_validation_result record;
  v_player_id uuid;
  v_round public.rounds;
  v_stored_sequence text;
  v_marked_player_id uuid;
  v_was_eliminated boolean;
  v_game_ended boolean;
  v_next_round_starter_id uuid;
  v_completed_round_resolution_type public.resolution_type;
BEGIN
  -- Validate player can act (locks game, verifies auth/state) and get current round
  SELECT * INTO v_validation_result FROM public._validate_player_can_act(p_game_id);
  v_player_id := v_validation_result.v_player_id;
  v_round := v_validation_result.v_round;

  -- Store sequence before it gets cleared by the new round created by __apply_game_timeout
  v_stored_sequence := v_round.current_sequence;

  -- Apply timeout using the shared, void-returning internal function
  PERFORM public.__apply_game_timeout(p_game_id, v_player_id);

  -- Now, correctly re-query the state to build the turn_result

  -- The player who timed out is always the one who gets the mark
  v_marked_player_id := v_player_id;

  -- Check if the mark resulted in an elimination
  SELECT gp.is_eliminated INTO v_was_eliminated
  FROM public.game_players gp
  WHERE gp.game_id = p_game_id
    AND gp.player_id = v_marked_player_id;

  -- Check if the game ended to determine if there's a next round starter
  SELECT g.status = 'completed' INTO v_game_ended
  FROM public.games g
  WHERE g.id = p_game_id;

  -- If the game is not over, find who starts the new active round
  IF NOT v_game_ended THEN
    SELECT r.current_player_id INTO v_next_round_starter_id
    FROM public.rounds r
    WHERE r.game_id = p_game_id
      AND r.status = 'active'
    LIMIT 1;
  END IF;

  -- Get the resolution type from the original round that was just completed
  SELECT r.resolution_type INTO v_completed_round_resolution_type
  FROM public.rounds r
  WHERE r.id = v_round.id;

  -- Return the fully constructed turn result
  RETURN public.__build_turn_result(
    p_game_id := p_game_id,
    p_sequence := v_stored_sequence,
    p_move_type := 'timeout'::public.move_type,
    p_marked_player_id := v_marked_player_id,
    p_eliminated_player_id := CASE WHEN v_was_eliminated THEN v_marked_player_id ELSE NULL END,
    p_resolution_type := v_completed_round_resolution_type,
    p_round_status := 'completed'::public.round_status,
    p_next_round_starter_id := v_next_round_starter_id
  );
END;
$$;

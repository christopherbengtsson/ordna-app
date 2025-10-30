--
-- PostgreSQL database dump
--

-- \restrict HsjqvLWLb5LsQBd0uF8H5a9Jk3ipgXqiBuOa78c3n9AIaOabuBbS7mJIqnGYffv

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
-- SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_cron; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";


--
-- Name: EXTENSION "pg_cron"; Type: COMMENT; Schema: -; Owner: 
--

-- COMMENT ON EXTENSION "pg_cron" IS 'Job scheduler for PostgreSQL';


--
-- Name: pg_net; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";


--
-- Name: EXTENSION "pg_net"; Type: COMMENT; Schema: -; Owner: 
--

-- COMMENT ON EXTENSION "pg_net" IS 'Async HTTP';


--
-- Name: SCHEMA "public"; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA "public" IS 'standard public schema';


--
-- Name: pg_graphql; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";


--
-- Name: EXTENSION "pg_graphql"; Type: COMMENT; Schema: -; Owner: 
--

-- COMMENT ON EXTENSION "pg_graphql" IS 'pg_graphql: GraphQL support';


--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";


--
-- Name: EXTENSION "pg_stat_statements"; Type: COMMENT; Schema: -; Owner: 
--

-- COMMENT ON EXTENSION "pg_stat_statements" IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";


--
-- Name: EXTENSION "pgcrypto"; Type: COMMENT; Schema: -; Owner: 
--

-- COMMENT ON EXTENSION "pgcrypto" IS 'cryptographic functions';


--
-- Name: supabase_vault; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";


--
-- Name: EXTENSION "supabase_vault"; Type: COMMENT; Schema: -; Owner: 
--

-- COMMENT ON EXTENSION "supabase_vault" IS 'Supabase Vault Extension';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

-- COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: game_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."game_status" AS ENUM (
    'pending',
    'active',
    'completed'
);


ALTER TYPE "public"."game_status" OWNER TO "postgres";

--
-- Name: move_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."move_type" AS ENUM (
    'add_letter',
    'call_word',
    'call_bluff',
    'fold',
    'timeout',
    'resolve_bluff'
);


ALTER TYPE "public"."move_type" OWNER TO "postgres";

--
-- Name: resolution_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."resolution_type" AS ENUM (
    'timeout',
    'bluff_true',
    'bluff_false',
    'word_valid',
    'word_invalid',
    'fold'
);


ALTER TYPE "public"."resolution_type" OWNER TO "postgres";

--
-- Name: round_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."round_status" AS ENUM (
    'active',
    'completed'
);


ALTER TYPE "public"."round_status" OWNER TO "postgres";

--
-- Name: __apply_game_timeout("uuid", "uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."__apply_game_timeout"("p_game_id" "uuid", "p_player_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_game public.games;
  v_round public.rounds;
  v_move_order int;
  v_was_eliminated boolean;
  v_game_ended boolean;
  v_previous_player_id uuid;
BEGIN
  -- Lock game row to prevent concurrent modifications
  SELECT g.* INTO v_game
  FROM public.games g
  WHERE g.id = p_game_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'game not found';
  END IF;

  -- Verify game is active
  IF v_game.status <> 'active' THEN
    RAISE EXCEPTION 'game is not active (status: %)', v_game.status;
  END IF;

  -- Get active round
  SELECT r.* INTO v_round
  FROM public.rounds r
  WHERE r.game_id = p_game_id
    AND r.status = 'active'
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'no active round found';
  END IF;

  -- Verify it's this player's turn
  IF v_round.current_player_id <> p_player_id THEN
    RAISE EXCEPTION 'not the current player''s turn';
  END IF;

  -- Get next move order
  SELECT COALESCE(MAX(m.move_order), 0) + 1 INTO v_move_order
  FROM public.moves m
  WHERE m.round_id = v_round.id;

  -- Record the timeout move
  INSERT INTO public.moves (
    id, round_id, player_id, move_type, move_order, created_at
  )
  VALUES (
    gen_random_uuid(),
    v_round.id,
    p_player_id,
    'timeout'::public.move_type,
    v_move_order,
    now()
  );

  -- Award mark to timed-out player and check elimination
  v_was_eliminated := public._award_mark_and_check_elimination(
    p_game_id,
    p_player_id
  );

  -- Check if game is over (handles winner detection)
  v_game_ended := public._check_and_complete_game(p_game_id);

  -- If game continues, start new round with previous player
  IF NOT v_game_ended THEN
    -- Get previous player in turn order
    v_previous_player_id := public._get_previous_player(
      p_game_id,
      p_player_id
    );

    IF v_previous_player_id IS NULL THEN
      RAISE EXCEPTION 'no valid previous player found';
    END IF;

    -- Start new round with previous player
    PERFORM public._start_new_round(
      p_game_id,
      v_previous_player_id,
      'timeout'::public.resolution_type,
      p_player_id  -- player who received the mark
    );
  END IF;
END;
$$;


ALTER FUNCTION "public"."__apply_game_timeout"("p_game_id" "uuid", "p_player_id" "uuid") OWNER TO "postgres";

--
-- Name: FUNCTION "__apply_game_timeout"("p_game_id" "uuid", "p_player_id" "uuid"); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION "public"."__apply_game_timeout"("p_game_id" "uuid", "p_player_id" "uuid") IS 'System function: Core timeout logic without auth checks. Called by both public RPC and pg_cron. Double underscore prefix indicates system-only access.';


--
-- Name: __handle_new_user(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."__handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  generated_nick text;
begin
  -- prefer a supplied nickname in raw_user_meta_data, then full_name, then fallback to email local-part
  generated_nick := coalesce(
    new.raw_user_meta_data->>'nickname',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, nickname)
  values (new.id, coalesce(generated_nick, 'Anonymous'))
  on conflict (id) do nothing;

  return new;
end;
$$;


ALTER FUNCTION "public"."__handle_new_user"() OWNER TO "postgres";

--
-- Name: FUNCTION "__handle_new_user"(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION "public"."__handle_new_user"() IS 'System-only function: Automatically creates user profile when new user signs up. Only called by auth.users trigger.';


--
-- Name: __process_expired_turns(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."__process_expired_turns"() RETURNS TABLE("processed_count" integer, "error_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_game_record record;
  v_processed int := 0;
  v_errors int := 0;
BEGIN
  -- Find games with expired turn deadlines
  -- Uses existing idx_rounds_turn_deadline partial index
  FOR v_game_record IN (
    SELECT DISTINCT
      g.id as game_id,
      r.turn_deadline,
      r.current_player_id
    FROM public.games g
    JOIN public.rounds r ON r.game_id = g.id
    WHERE g.status = 'active'
      AND r.status = 'active'
      AND r.turn_deadline < now()
    ORDER BY r.turn_deadline ASC  -- Process oldest deadlines first
    LIMIT 50  -- Safety limit: max 50 games per minute
  )
  LOOP
    BEGIN
      -- Process timeout using system function (no auth check)
      PERFORM public.__apply_game_timeout(
        v_game_record.game_id,
        v_game_record.current_player_id
      );

      v_processed := v_processed + 1;

      RAISE NOTICE 'processed timeout for game % (player: %)',
        v_game_record.game_id, v_game_record.current_player_id;

    EXCEPTION
      WHEN OTHERS THEN
        -- Log error but continue processing other games
        RAISE WARNING 'failed to process timeout for game %: %',
          v_game_record.game_id, SQLERRM;
        v_errors := v_errors + 1;
    END;
  END LOOP;

  RAISE NOTICE 'batch complete: processed % expired turns (% errors)',
    v_processed, v_errors;

  RETURN QUERY SELECT v_processed, v_errors;
END;
$$;


ALTER FUNCTION "public"."__process_expired_turns"() OWNER TO "postgres";

--
-- Name: FUNCTION "__process_expired_turns"(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION "public"."__process_expired_turns"() IS 'System function: Batch processes expired turn deadlines (called by pg_cron). Double underscore prefix indicates system-only access.';


--
-- Name: _award_mark_and_check_elimination("uuid", "uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."_award_mark_and_check_elimination"("p_game_id" "uuid", "p_player_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_marks_to_eliminate int;
  v_new_marks int;
  v_was_eliminated boolean := false;
begin
  -- Get elimination threshold from settings
  select gs.marks_to_eliminate into v_marks_to_eliminate
  from public.game_settings gs
  where gs.game_id = p_game_id;

  -- Increment marks and get new value
  update public.game_players
  set marks = marks + 1
  where game_id = p_game_id
    and player_id = p_player_id
  returning marks into v_new_marks;

  -- Check if player should be eliminated
  if v_new_marks >= v_marks_to_eliminate then
    update public.game_players
    set is_eliminated = true
    where game_id = p_game_id
      and player_id = p_player_id;

    v_was_eliminated := true;
  end if;

  return v_was_eliminated;
end;
$$;


ALTER FUNCTION "public"."_award_mark_and_check_elimination"("p_game_id" "uuid", "p_player_id" "uuid") OWNER TO "postgres";

--
-- Name: _check_and_complete_game("uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."_check_and_complete_game"("p_game_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_remaining_players_count int;
  v_winner_id uuid;
  v_game_completed boolean := false;
begin
  -- Count non-eliminated players
  select count(*) into v_remaining_players_count
  from public.game_players gp
  where gp.game_id = p_game_id
    and gp.is_eliminated = false;

  -- If 1 or fewer players remain, game is over
  if v_remaining_players_count <= 1 then
    -- Get the winner (if any)
    select gp.player_id into v_winner_id
    from public.game_players gp
    where gp.game_id = p_game_id
      and gp.is_eliminated = false
    limit 1;

    -- Mark game as completed
    update public.games
    set
      status = 'completed',
      completed_at = now(),
      winner_id = v_winner_id
    where id = p_game_id;

    -- Mark any active rounds as completed
    update public.rounds
    set
      status = 'completed',
      completed_at = now()
    where game_id = p_game_id
      and status = 'active';

    v_game_completed := true;
  end if;

  return v_game_completed;
end;
$$;


ALTER FUNCTION "public"."_check_and_complete_game"("p_game_id" "uuid") OWNER TO "postgres";

--
-- Name: _get_next_player("uuid", "uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."_get_next_player"("p_game_id" "uuid", "p_current_player_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_current_join_order int;
  v_next_player_id uuid;
begin
  -- Get current player's join_order
  select gp.join_order into v_current_join_order
  from public.game_players gp
  where gp.game_id = p_game_id
    and gp.player_id = p_current_player_id;

  if v_current_join_order is null then
    raise exception 'current player not found in game';
  end if;

  -- Try to find next player after current (wrapping around)
  select gp.player_id into v_next_player_id
  from public.game_players gp
  where gp.game_id = p_game_id
    and gp.is_eliminated = false
    and gp.join_order > v_current_join_order
  order by gp.join_order asc
  limit 1;

  -- If no player found after current, wrap around to first
  if v_next_player_id is null then
    select gp.player_id into v_next_player_id
    from public.game_players gp
    where gp.game_id = p_game_id
      and gp.is_eliminated = false
    order by gp.join_order asc
    limit 1;
  end if;

  return v_next_player_id;
end;
$$;


ALTER FUNCTION "public"."_get_next_player"("p_game_id" "uuid", "p_current_player_id" "uuid") OWNER TO "postgres";

--
-- Name: _get_previous_player("uuid", "uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."_get_previous_player"("p_game_id" "uuid", "p_current_player_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_current_join_order int;
  v_prev_player_id uuid;
begin
  -- Get current player's join_order
  select gp.join_order into v_current_join_order
  from public.game_players gp
  where gp.game_id = p_game_id
    and gp.player_id = p_current_player_id;

  if v_current_join_order is null then
    raise exception 'current player not found in game';
  end if;

  -- Try to find previous player before current (wrapping around)
  select gp.player_id into v_prev_player_id
  from public.game_players gp
  where gp.game_id = p_game_id
    and gp.is_eliminated = false
    and gp.join_order < v_current_join_order
  order by gp.join_order desc
  limit 1;

  -- If no player found before current, wrap around to last
  if v_prev_player_id is null then
    select gp.player_id into v_prev_player_id
    from public.game_players gp
    where gp.game_id = p_game_id
      and gp.is_eliminated = false
    order by gp.join_order desc
    limit 1;
  end if;

  return v_prev_player_id;
end;
$$;


ALTER FUNCTION "public"."_get_previous_player"("p_game_id" "uuid", "p_current_player_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";

--
-- Name: games; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."games" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "host_player_id" "uuid" NOT NULL,
    "status" "public"."game_status" DEFAULT 'pending'::"public"."game_status" NOT NULL,
    "current_player_id" "uuid",
    "current_round" integer DEFAULT 0 NOT NULL,
    "winner_id" "uuid",
    "invite_token" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone
);


ALTER TABLE "public"."games" OWNER TO "postgres";

--
-- Name: _internal_start_game("uuid", "public"."games"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."_internal_start_game"("p_game_id" "uuid", "p_game_record" "public"."games") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_settings record;
  v_player_count int;
  v_starting_player_id uuid;
  v_round_id uuid;
  v_turn_deadline timestamptz;
BEGIN
  -- Validate game status
  IF p_game_record.status <> 'pending' THEN
    RAISE EXCEPTION 'game already started (status: %)', p_game_record.status;
  END IF;

  -- Load game settings
  SELECT gs.* INTO v_settings
  FROM public.game_settings gs
  WHERE gs.game_id = p_game_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'game settings not found';
  END IF;

  -- Count players
  SELECT count(*) INTO v_player_count
  FROM public.game_players gp
  WHERE gp.game_id = p_game_id;

  IF v_player_count < 2 THEN
    RAISE EXCEPTION 'not enough players (have: %, need: 2)', v_player_count;
  END IF;

  -- Use host as starting player
  v_starting_player_id := p_game_record.host_player_id;

  -- Calculate turn deadline
  v_turn_deadline := now() + (v_settings.complete_move_timeout_seconds * interval '1 second');

  -- Update game to active status
  UPDATE public.games
  SET
    status = 'active',
    started_at = now(),
    current_round = 1,
    current_player_id = v_starting_player_id,
    invite_token = null
  WHERE id = p_game_id;

  -- Create first round
  INSERT INTO public.rounds (
    id, game_id, round_number, starting_player_id, current_player_id,
    current_sequence, status, turn_deadline, started_at
  )
  VALUES (
    gen_random_uuid(), p_game_id, 1, v_starting_player_id, v_starting_player_id,
    '', 'active', v_turn_deadline, now()
  )
  RETURNING id INTO v_round_id;

  RETURN v_starting_player_id;
END;
$$;


ALTER FUNCTION "public"."_internal_start_game"("p_game_id" "uuid", "p_game_record" "public"."games") OWNER TO "postgres";

--
-- Name: FUNCTION "_internal_start_game"("p_game_id" "uuid", "p_game_record" "public"."games"); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION "public"."_internal_start_game"("p_game_id" "uuid", "p_game_record" "public"."games") IS 'Internal helper: Starts a game without authorization checks. Host is always the starting player. Called by both start_game and accept_invite (auto-start).';


--
-- Name: _is_valid_word("text", "text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."_is_valid_word"("p_word" "text", "p_language" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1 from public.word_dictionary wd
    where wd.language = p_language
      and lower(wd.word) = lower(p_word)
  );
$$;


ALTER FUNCTION "public"."_is_valid_word"("p_word" "text", "p_language" "text") OWNER TO "postgres";

--
-- Name: FUNCTION "_is_valid_word"("p_word" "text", "p_language" "text"); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION "public"."_is_valid_word"("p_word" "text", "p_language" "text") IS 'Internal helper: Checks if a word exists in the dictionary for the given language. Only called by backend game logic functions.';


--
-- Name: _start_new_round("uuid", "uuid", "public"."resolution_type", "uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."_start_new_round"("p_game_id" "uuid", "p_starting_player_id" "uuid", "p_resolution_type" "public"."resolution_type", "p_player_with_mark" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_new_round_id uuid;
  v_current_round_number int;
  v_turn_deadline timestamptz;
  v_timeout_seconds int;
begin
  -- Get current round number
  select g.current_round into v_current_round_number
  from public.games g
  where g.id = p_game_id;

  -- Complete the current active round
  update public.rounds
  set
    status = 'completed',
    completed_at = now(),
    resolution_type = p_resolution_type,
    player_with_mark = p_player_with_mark
  where game_id = p_game_id
    and status = 'active';

  -- Get timeout setting
  select gs.complete_move_timeout_seconds into v_timeout_seconds
  from public.game_settings gs
  where gs.game_id = p_game_id;

  -- Calculate turn deadline
  v_turn_deadline := now() + (v_timeout_seconds * interval '1 second');

  -- Create new round
  insert into public.rounds (
    id, game_id, round_number, starting_player_id, current_player_id,
    current_sequence, status, turn_deadline, started_at
  )
  values (
    gen_random_uuid(), p_game_id, v_current_round_number + 1,
    p_starting_player_id, p_starting_player_id,
    '', 'active', v_turn_deadline, now()
  )
  returning id into v_new_round_id;

  -- Update game state
  update public.games
  set
    current_round = v_current_round_number + 1,
    current_player_id = p_starting_player_id
  where id = p_game_id;

  return v_new_round_id;
end;
$$;


ALTER FUNCTION "public"."_start_new_round"("p_game_id" "uuid", "p_starting_player_id" "uuid", "p_resolution_type" "public"."resolution_type", "p_player_with_mark" "uuid") OWNER TO "postgres";

--
-- Name: game_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."game_settings" (
    "game_id" "uuid" NOT NULL,
    "language" "text" DEFAULT 'en'::"text" NOT NULL,
    "min_word_length" integer DEFAULT 1 NOT NULL,
    "max_players" integer DEFAULT 4 NOT NULL,
    "marks_to_eliminate" integer DEFAULT 3 NOT NULL,
    "complete_move_timeout_seconds" integer DEFAULT 86400 NOT NULL,
    CONSTRAINT "game_settings_complete_move_timeout_seconds_check" CHECK (("complete_move_timeout_seconds" >= 3600)),
    CONSTRAINT "game_settings_language_check" CHECK (("language" = ANY (ARRAY['en'::"text", 'sv'::"text"]))),
    CONSTRAINT "game_settings_marks_to_eliminate_check" CHECK (("marks_to_eliminate" >= 1)),
    CONSTRAINT "game_settings_max_players_check" CHECK ((("max_players" >= 2) AND ("max_players" <= 20))),
    CONSTRAINT "game_settings_min_word_length_check" CHECK ((("min_word_length" >= 1) AND ("min_word_length" <= 20)))
);


ALTER TABLE "public"."game_settings" OWNER TO "postgres";

--
-- Name: rounds; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."rounds" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "game_id" "uuid" NOT NULL,
    "round_number" integer NOT NULL,
    "starting_player_id" "uuid" NOT NULL,
    "current_sequence" "text" DEFAULT ''::"text" NOT NULL,
    "current_player_id" "uuid",
    "status" "public"."round_status" DEFAULT 'active'::"public"."round_status" NOT NULL,
    "player_with_mark" "uuid",
    "resolution_type" "public"."resolution_type",
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "turn_deadline" timestamp with time zone
);


ALTER TABLE "public"."rounds" OWNER TO "postgres";

--
-- Name: _validate_player_can_act("uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."_validate_player_can_act"("p_game_id" "uuid", OUT "v_game" "public"."games", OUT "v_round" "public"."rounds", OUT "v_settings" "public"."game_settings", OUT "v_player_id" "uuid") RETURNS "record"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
  v_is_player boolean;
  v_is_eliminated boolean;
begin
  -- Authentication check
  if v_uid is null then
    raise exception 'authentication required';
  end if;

  -- Lock game row to prevent concurrent modifications
  select g.* into v_game
  from public.games g
  where g.id = p_game_id
  for update;

  if not found then
    raise exception 'game not found';
  end if;

  -- Verify game is active
  if v_game.status <> 'active' then
    raise exception 'game is not active (status: %)', v_game.status;
  end if;

  -- Verify user is a player in this game (single query optimization)
  select gp.is_eliminated
  into v_is_eliminated
  from public.game_players gp
  where gp.game_id = p_game_id and gp.player_id = v_uid;

  if found then
    v_is_player := true;
    -- v_is_eliminated already set from query
  else
    v_is_player := false;
    v_is_eliminated := true;  -- Treat non-existent player as eliminated
  end if;

  if not v_is_player then
    raise exception 'access denied: not a player in this game';
  end if;

  if v_is_eliminated then
    raise exception 'you have been eliminated from this game';
  end if;

  -- Load active round
  select r.* into v_round
  from public.rounds r
  where r.game_id = p_game_id
    and r.status = 'active'
  limit 1;

  if not found then
    raise exception 'no active round found';
  end if;

  -- Load game settings
  select gs.* into v_settings
  from public.game_settings gs
  where gs.game_id = p_game_id;

  if not found then
    raise exception 'game settings not found';
  end if;

  v_player_id := v_uid;
end;
$$;


ALTER FUNCTION "public"."_validate_player_can_act"("p_game_id" "uuid", OUT "v_game" "public"."games", OUT "v_round" "public"."rounds", OUT "v_settings" "public"."game_settings", OUT "v_player_id" "uuid") OWNER TO "postgres";

--
-- Name: accept_invite("text", "text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."accept_invite"("p_invite_token" "text", "p_nickname" "text" DEFAULT NULL::"text") RETURNS TABLE("game_id" "uuid", "auto_started" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_user uuid := auth.uid();
  v_game public.games;
  v_settings record;
  v_exists boolean;
  v_new_join_order int;
  v_player_token text := gen_random_uuid()::text;
  v_player_count int;
  v_auto_started boolean := false;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  -- Find game by invite token and lock it to avoid races
  SELECT g.* INTO v_game
  FROM public.games g
  WHERE g.invite_token = p_invite_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid invite token';
  END IF;

  -- Load settings
  SELECT gs.* INTO v_settings
  FROM public.game_settings gs
  WHERE gs.game_id = v_game.id;

  -- Validate state
  IF v_game.status <> 'pending' THEN
    RAISE EXCEPTION 'cannot join: game not pending';
  END IF;

  -- Validate nickname if provided
  IF p_nickname IS NOT NULL THEN
    IF char_length(p_nickname) < 3 OR char_length(p_nickname) > 20 THEN
      RAISE EXCEPTION 'nickname must be 3..20 chars';
    END IF;
  END IF;

  -- Already participant?
  SELECT exists (
    SELECT 1
    FROM public.game_players gp_check
    WHERE gp_check.game_id = v_game.id
      AND gp_check.player_id = v_user
  ) INTO v_exists;

  IF v_exists THEN
    -- Optionally update nickname for existing participant
    IF p_nickname IS NOT NULL THEN
      UPDATE public.profiles p
      SET nickname = p_nickname
      WHERE p.id = v_user;
    END IF;

    -- Return game_id with auto_started = false
    RETURN QUERY SELECT v_game.id, false;
    RETURN;
  END IF;

  -- Capacity check
  SELECT count(*) INTO v_player_count
  FROM public.game_players gp_count
  WHERE gp_count.game_id = v_game.id;

  IF coalesce(v_settings.max_players, 4) <= v_player_count THEN
    RAISE EXCEPTION 'game full';
  END IF;

  -- Compute join_order
  SELECT coalesce(max(gp_join.join_order), 0) + 1
  INTO v_new_join_order
  FROM public.game_players gp_join
  WHERE gp_join.game_id = v_game.id;

  -- Insert player
  INSERT INTO public.game_players (
    id, game_id, player_id, player_token, marks, is_eliminated, join_order, joined_at
  )
  VALUES (
    gen_random_uuid(), v_game.id, v_user, v_player_token, 0, false, v_new_join_order, now()
  );

  -- Optionally set nickname for new player
  IF p_nickname IS NOT NULL THEN
    UPDATE public.profiles p
    SET nickname = p_nickname
    WHERE p.id = v_user;
  END IF;

  -- Check if we've reached max players (after insertion)
  v_player_count := v_player_count + 1;

  IF v_player_count >= coalesce(v_settings.max_players, 4) THEN
    -- Auto-start the game
    PERFORM public._internal_start_game(v_game.id, v_game);
    v_auto_started := true;

    RAISE NOTICE 'game % auto-started with % players',
      v_game.id, v_player_count;
  END IF;

  -- Return game_id and auto_started flag
  RETURN QUERY SELECT v_game.id, v_auto_started;
END;
$$;


ALTER FUNCTION "public"."accept_invite"("p_invite_token" "text", "p_nickname" "text") OWNER TO "postgres";

--
-- Name: FUNCTION "accept_invite"("p_invite_token" "text", "p_nickname" "text"); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION "public"."accept_invite"("p_invite_token" "text", "p_nickname" "text") IS 'Public RPC: Accept game invitation. Automatically starts game if max_players is reached after joining. Returns game_id and auto_started flag.';


--
-- Name: call_bluff("uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."call_bluff"("p_game_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
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

  -- Note: No marks awarded, no round ended yet
  -- The challenged player must now call resolve_bluff with their intended word
  -- That function will determine if the bluff was valid/invalid and award marks accordingly
END;
$$;


ALTER FUNCTION "public"."call_bluff"("p_game_id" "uuid") OWNER TO "postgres";

--
-- Name: FUNCTION "call_bluff"("p_game_id" "uuid"); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION "public"."call_bluff"("p_game_id" "uuid") IS 'Public RPC: Current player challenges previous player''s letter, claiming they cannot form a valid word. Turn switches to challenged player who must call resolve_bluff with a valid word to defend themselves.';


--
-- Name: call_in_game_timeout("uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."call_in_game_timeout"("p_game_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_player_id uuid;
BEGIN
  -- Validate player can act (locks game, verifies auth/state)
  SELECT (public._validate_player_can_act(p_game_id)).v_player_id INTO v_player_id;

  -- Player turn validation happens in __apply_game_timeout

  -- Apply timeout using system function
  PERFORM public.__apply_game_timeout(p_game_id, v_player_id);
END;
$$;


ALTER FUNCTION "public"."call_in_game_timeout"("p_game_id" "uuid") OWNER TO "postgres";

--
-- Name: FUNCTION "call_in_game_timeout"("p_game_id" "uuid"); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION "public"."call_in_game_timeout"("p_game_id" "uuid") IS 'Public RPC: Current player voluntarily times out themselves when unable to make a move';


--
-- Name: call_word("uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."call_word"("p_game_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
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
END;
$$;


ALTER FUNCTION "public"."call_word"("p_game_id" "uuid") OWNER TO "postgres";

--
-- Name: FUNCTION "call_word"("p_game_id" "uuid"); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION "public"."call_word"("p_game_id" "uuid") IS 'Public RPC: Current player claims the sequence is a complete valid word. If valid, previous player gets mark and caller starts next round. If invalid, caller gets mark and previous player starts next round.';


--
-- Name: create_game("text", integer, integer, integer, integer, "text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."create_game"("p_language" "text" DEFAULT 'en'::"text", "p_min_word_length" integer DEFAULT 3, "p_max_players" integer DEFAULT 4, "p_marks_to_eliminate" integer DEFAULT 3, "p_complete_move_timeout_seconds" integer DEFAULT 86400, "p_nickname" "text" DEFAULT NULL::"text") RETURNS TABLE("game_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_game_id uuid;
  v_host_id uuid := auth.uid();
  v_host_token text := gen_random_uuid()::text;
  v_inv_token text := gen_random_uuid()::text;
begin
  if v_host_id is null then
    raise exception 'authentication required';
  end if;

  -- validate inputs
  if p_min_word_length < 1 or p_min_word_length > 20 then
    raise exception 'min_word_length out of range (1..20)';
  end if;
  if p_max_players < 2 or p_max_players > 20 then
    raise exception 'max_players out of range (2..20)';
  end if;
  if p_marks_to_eliminate < 1 then
    raise exception 'marks_to_eliminate must be >= 1';
  end if;
  if p_complete_move_timeout_seconds < 3600 then
    raise exception 'complete_move_timeout_seconds must be >= 3600';
  end if;

  -- optional nickname update for host
  if p_nickname is not null then
    if char_length(p_nickname) < 3 or char_length(p_nickname) > 20 then
      raise exception 'nickname must be 3..20 chars';
    end if;
    update public.profiles set nickname = p_nickname where id = v_host_id;
  end if;

  -- create game
  insert into public.games (id, host_player_id, status, created_at, invite_token)
  values (gen_random_uuid(), v_host_id, 'pending', now(), v_inv_token)
  returning id into v_game_id;

  -- create settings
  insert into public.game_settings (game_id, language, min_word_length, max_players, marks_to_eliminate, complete_move_timeout_seconds)
  values (v_game_id, p_language, p_min_word_length, p_max_players, p_marks_to_eliminate, p_complete_move_timeout_seconds);

  -- insert host as first player
  insert into public.game_players (id, game_id, player_id, player_token, marks, is_eliminated, join_order, joined_at)
  values (gen_random_uuid(), v_game_id, v_host_id, v_host_token, 0, false, 1, now());

  return query select v_game_id;
end;
$$;


ALTER FUNCTION "public"."create_game"("p_language" "text", "p_min_word_length" integer, "p_max_players" integer, "p_marks_to_eliminate" integer, "p_complete_move_timeout_seconds" integer, "p_nickname" "text") OWNER TO "postgres";

--
-- Name: fold("uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."fold"("p_game_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
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
END;
$$;


ALTER FUNCTION "public"."fold"("p_game_id" "uuid") OWNER TO "postgres";

--
-- Name: FUNCTION "fold"("p_game_id" "uuid"); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION "public"."fold"("p_game_id" "uuid") IS 'Public RPC: Current player voluntarily folds (gives up). Player receives a mark and previous player starts next round.';


--
-- Name: get_game_by_id("uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."get_game_by_id"("p_game_id" "uuid") RETURNS TABLE("game_id" "uuid", "status" "public"."game_status", "current_player_id" "uuid", "winner_id" "uuid", "host_player_id" "uuid", "started_at" timestamp with time zone, "completed_at" timestamp with time zone, "current_round" integer, "players" "jsonb", "active_round" "jsonb", "settings" "jsonb", "is_current_player" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
  v_is_player boolean;
begin
  -- authentication check
  if v_uid is null then
    raise exception 'authentication required';
  end if;

  -- verify user is a player in this game
  select exists(
    select 1 from public.game_players gp
    where gp.game_id = p_game_id
      and gp.player_id = v_uid
  ) into v_is_player;

  if not v_is_player then
    raise exception 'access denied: not a player in this game';
  end if;

  return query
  select
    g.id as game_id,
    g.status,
    g.current_player_id,
    g.winner_id,
    g.host_player_id,
    g.started_at,
    g.completed_at,
    g.current_round,

    -- players array
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'nickname', p.nickname,
          'marks', gp.marks,
          'is_eliminated', gp.is_eliminated,
          'join_order', gp.join_order,
          'is_host', (p.id = g.host_player_id)
        ) order by gp.join_order
      )
      from public.game_players gp
      join public.profiles p on p.id = gp.player_id
      where gp.game_id = g.id
    ) as players,

    -- active round info (conditional sequence)
    (
      select jsonb_build_object(
        'id', r.id,
        'round_number', r.round_number,
        'starting_player_id', r.starting_player_id,
        'current_player_id', r.current_player_id,
        'current_sequence', case
          when g.status = 'completed' then r.current_sequence
          when g.status = 'active' and r.current_player_id = v_uid then r.current_sequence
          else null
        end,
        'status', r.status,
        'turn_deadline', r.turn_deadline,
        'resolution_type', r.resolution_type,
        'player_with_mark', r.player_with_mark,
        'started_at', r.started_at,
        'completed_at', r.completed_at,
        'last_move_type', (
          select m.move_type
          from public.moves m
          where m.round_id = r.id
          order by m.move_order desc
          limit 1
        )
      )
      from public.rounds r
      where r.game_id = g.id
        and r.status = 'active'
      limit 1
    ) as active_round,

    -- game settings
    (
      select jsonb_build_object(
        'language', gs.language,
        'min_word_length', gs.min_word_length,
        'max_players', gs.max_players,
        'marks_to_eliminate', gs.marks_to_eliminate,
        'complete_move_timeout_seconds', gs.complete_move_timeout_seconds
      )
      from public.game_settings gs
      where gs.game_id = g.id
    ) as settings,

    -- helper: is current player
    (g.current_player_id = v_uid) as is_current_player

  from public.games g
  where g.id = p_game_id;
end;
$$;


ALTER FUNCTION "public"."get_game_by_id"("p_game_id" "uuid") OWNER TO "postgres";

--
-- Name: get_games(integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."get_games"("p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "status" "public"."game_status", "current_player_id" "uuid", "winner_id" "uuid", "players" "text"[], "active_round_number" integer, "active_turn_deadline" timestamp with time zone, "is_host" boolean, "is_current_player" boolean, "last_move_type" "public"."move_type", "completed_word" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
select
  g.id,
  g.status,
  g.current_player_id,
  g.winner_id,
  (
    select array_agg(prof.nickname order by gp.join_order)
    from public.game_players gp
    join public.profiles prof on prof.id = gp.player_id
    where gp.game_id = g.id
  ) as players,
  ar.round_number as active_round_number,
  ar.turn_deadline as active_turn_deadline,
  (g.host_player_id = auth.uid()) as is_host,
  (g.current_player_id = auth.uid()) as is_current_player,
  (
    select m.move_type
    from public.moves m
    where m.round_id = ar.id
    order by m.move_order desc
    limit 1
  ) as last_move_type,
  (
    -- Return the completed sequence when game is finished
    case
      when g.status = 'completed' then (
        select r.current_sequence
        from public.rounds r
        where r.game_id = g.id
          and r.status = 'completed'
        order by r.round_number desc
        limit 1
      )
      else null
    end
  ) as completed_word
from public.games g
join public.game_players gp_filter
  on gp_filter.game_id = g.id and gp_filter.player_id = auth.uid()
left join public.rounds ar on ar.game_id = g.id and ar.status = 'active'
order by
  case when g.status = 'active' then 0 when g.status = 'pending' then 1 else 2 end,
  g.created_at desc
limit p_limit offset p_offset;
$$;


ALTER FUNCTION "public"."get_games"("p_limit" integer, "p_offset" integer) OWNER TO "postgres";

--
-- Name: FUNCTION "get_games"("p_limit" integer, "p_offset" integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION "public"."get_games"("p_limit" integer, "p_offset" integer) IS 'Public RPC: Returns list of games for current user. Includes completed_word field showing the final sequence when game is completed.';


--
-- Name: get_lobby_by_game_id("uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."get_lobby_by_game_id"("p_game_id" "uuid") RETURNS TABLE("game_id" "uuid", "invite_code" "text", "host_player_id" "uuid", "players" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;

  return query
  select
    g.id as game_id,
    g.invite_token as invite_code,
    g.host_player_id,
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'nickname', p.nickname,
        'is_host', (p.id = g.host_player_id)
      ) order by gp.join_order
    ) as players
  from public.games g
  join public.game_players gp on gp.game_id = g.id
  join public.profiles p on p.id = gp.player_id
  where g.id = p_game_id
  group by g.id, g.invite_token, g.host_player_id;
end;
$$;


ALTER FUNCTION "public"."get_lobby_by_game_id"("p_game_id" "uuid") OWNER TO "postgres";

--
-- Name: resolve_bluff("uuid", "text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."resolve_bluff"("p_game_id" "uuid", "p_word" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
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
END;
$$;


ALTER FUNCTION "public"."resolve_bluff"("p_game_id" "uuid", "p_word" "text") OWNER TO "postgres";

--
-- Name: FUNCTION "resolve_bluff"("p_game_id" "uuid", "p_word" "text"); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION "public"."resolve_bluff"("p_game_id" "uuid", "p_word" "text") IS 'Public RPC: Challenged player responds to a bluff call by providing a valid word. If word is valid (starts with sequence, in dictionary, meets min length), the bluff caller gets a mark and resolver starts next round. If word is invalid, resolver gets a mark and caller starts next round.';


--
-- Name: start_game("uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."start_game"("p_game_id" "uuid") RETURNS TABLE("game_id" "uuid", "starting_player_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_user uuid := auth.uid();
  v_game public.games;
  v_starting_player_id uuid;
BEGIN
  -- Authentication check
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  -- Find game and lock it to avoid races
  SELECT g.* INTO v_game
  FROM public.games g
  WHERE g.id = p_game_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'game not found';
  END IF;

  -- Authorization: only host can start
  IF v_game.host_player_id <> v_user THEN
    RAISE EXCEPTION 'only host can start game';
  END IF;

  -- Start game using internal helper
  v_starting_player_id := public._internal_start_game(p_game_id, v_game);

  -- Return game_id and starting_player_id
  RETURN QUERY SELECT p_game_id, v_starting_player_id;
END;
$$;


ALTER FUNCTION "public"."start_game"("p_game_id" "uuid") OWNER TO "postgres";

--
-- Name: FUNCTION "start_game"("p_game_id" "uuid"); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION "public"."start_game"("p_game_id" "uuid") IS 'Public RPC: Host manually starts the game. Host becomes the starting player. Requires at least 2 players.';


--
-- Name: submit_letter("uuid", "text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."submit_letter"("p_game_id" "uuid", "p_letter" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
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

  -- Convert to uppercase and validate A-Z
  v_letter := upper(p_letter);
  if v_letter !~ '^[A-Z]$' then
    raise exception 'letter must be A-Z';
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

--
-- Name: game_players; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."game_players" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "game_id" "uuid" NOT NULL,
    "player_id" "uuid" NOT NULL,
    "player_token" "text" NOT NULL,
    "marks" integer DEFAULT 0 NOT NULL,
    "is_eliminated" boolean DEFAULT false NOT NULL,
    "join_order" integer NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "game_players_marks_check" CHECK (("marks" >= 0))
);


ALTER TABLE "public"."game_players" OWNER TO "postgres";

--
-- Name: moves; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."moves" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "round_id" "uuid" NOT NULL,
    "player_id" "uuid" NOT NULL,
    "move_type" "public"."move_type" NOT NULL,
    "letter_value" "text",
    "word_value" "text",
    "move_order" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."moves" OWNER TO "postgres";

--
-- Name: profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "nickname" "text" DEFAULT 'Anonymous'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_seen" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "profiles_nickname_check" CHECK ((("char_length"("nickname") >= 3) AND ("char_length"("nickname") <= 20)))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";

--
-- Name: word_dictionary; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."word_dictionary" (
    "language" "text" NOT NULL,
    "word" "text" NOT NULL
)
PARTITION BY LIST ("language");


ALTER TABLE "public"."word_dictionary" OWNER TO "postgres";

--
-- Name: word_dictionary_en; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."word_dictionary_en" (
    "language" "text" NOT NULL,
    "word" "text" NOT NULL
);


ALTER TABLE "public"."word_dictionary_en" OWNER TO "postgres";

--
-- Name: word_dictionary_sv; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."word_dictionary_sv" (
    "language" "text" NOT NULL,
    "word" "text" NOT NULL
);


ALTER TABLE "public"."word_dictionary_sv" OWNER TO "postgres";

--
-- Name: word_dictionary_en; Type: TABLE ATTACH; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."word_dictionary" ATTACH PARTITION "public"."word_dictionary_en" FOR VALUES IN ('en');


--
-- Name: word_dictionary_sv; Type: TABLE ATTACH; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."word_dictionary" ATTACH PARTITION "public"."word_dictionary_sv" FOR VALUES IN ('sv');


--
-- Name: game_players game_players_game_id_join_order_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."game_players"
    ADD CONSTRAINT "game_players_game_id_join_order_key" UNIQUE ("game_id", "join_order");


--
-- Name: game_players game_players_game_id_player_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."game_players"
    ADD CONSTRAINT "game_players_game_id_player_id_key" UNIQUE ("game_id", "player_id");


--
-- Name: game_players game_players_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."game_players"
    ADD CONSTRAINT "game_players_pkey" PRIMARY KEY ("id");


--
-- Name: game_players game_players_player_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."game_players"
    ADD CONSTRAINT "game_players_player_token_key" UNIQUE ("player_token");


--
-- Name: game_settings game_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."game_settings"
    ADD CONSTRAINT "game_settings_pkey" PRIMARY KEY ("game_id");


--
-- Name: games games_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."games"
    ADD CONSTRAINT "games_pkey" PRIMARY KEY ("id");


--
-- Name: moves moves_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."moves"
    ADD CONSTRAINT "moves_pkey" PRIMARY KEY ("id");


--
-- Name: moves moves_round_id_move_order_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."moves"
    ADD CONSTRAINT "moves_round_id_move_order_key" UNIQUE ("round_id", "move_order");


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");


--
-- Name: rounds rounds_game_id_round_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."rounds"
    ADD CONSTRAINT "rounds_game_id_round_number_key" UNIQUE ("game_id", "round_number");


--
-- Name: rounds rounds_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."rounds"
    ADD CONSTRAINT "rounds_pkey" PRIMARY KEY ("id");


--
-- Name: word_dictionary word_dictionary_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."word_dictionary"
    ADD CONSTRAINT "word_dictionary_pkey" PRIMARY KEY ("language", "word");


--
-- Name: word_dictionary_en word_dictionary_en_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."word_dictionary_en"
    ADD CONSTRAINT "word_dictionary_en_pkey" PRIMARY KEY ("language", "word");


--
-- Name: word_dictionary_sv word_dictionary_sv_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."word_dictionary_sv"
    ADD CONSTRAINT "word_dictionary_sv_pkey" PRIMARY KEY ("language", "word");


--
-- Name: idx_game_players_game_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_game_players_game_id" ON "public"."game_players" USING "btree" ("game_id");


--
-- Name: idx_game_players_game_id_join_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_game_players_game_id_join_order" ON "public"."game_players" USING "btree" ("game_id", "join_order");


--
-- Name: idx_game_players_player_game; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_game_players_player_game" ON "public"."game_players" USING "btree" ("player_id", "game_id");


--
-- Name: idx_game_players_player_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_game_players_player_id" ON "public"."game_players" USING "btree" ("player_id");


--
-- Name: idx_game_settings_game_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_game_settings_game_id" ON "public"."game_settings" USING "btree" ("game_id");


--
-- Name: idx_game_settings_language; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_game_settings_language" ON "public"."game_settings" USING "btree" ("language");


--
-- Name: idx_games_current_player; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_games_current_player" ON "public"."games" USING "btree" ("current_player_id");


--
-- Name: idx_games_host; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_games_host" ON "public"."games" USING "btree" ("host_player_id");


--
-- Name: idx_games_invite_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "idx_games_invite_token" ON "public"."games" USING "btree" ("invite_token") WHERE ("invite_token" IS NOT NULL);


--
-- Name: idx_games_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_games_status" ON "public"."games" USING "btree" ("status");


--
-- Name: idx_games_winner; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_games_winner" ON "public"."games" USING "btree" ("winner_id");


--
-- Name: idx_moves_player; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_moves_player" ON "public"."moves" USING "btree" ("player_id");


--
-- Name: idx_moves_round; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_moves_round" ON "public"."moves" USING "btree" ("round_id", "move_order");


--
-- Name: idx_rounds_current_player; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_rounds_current_player" ON "public"."rounds" USING "btree" ("current_player_id");


--
-- Name: idx_rounds_game; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_rounds_game" ON "public"."rounds" USING "btree" ("game_id", "round_number");


--
-- Name: idx_rounds_game_player; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_rounds_game_player" ON "public"."rounds" USING "btree" ("game_id", "current_player_id") WHERE ("status" = 'active'::"public"."round_status");


--
-- Name: idx_rounds_game_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_rounds_game_status" ON "public"."rounds" USING "btree" ("game_id", "status");


--
-- Name: idx_rounds_player_with_mark; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_rounds_player_with_mark" ON "public"."rounds" USING "btree" ("player_with_mark");


--
-- Name: idx_rounds_starting_player; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_rounds_starting_player" ON "public"."rounds" USING "btree" ("starting_player_id");


--
-- Name: idx_rounds_turn_deadline; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_rounds_turn_deadline" ON "public"."rounds" USING "btree" ("turn_deadline") WHERE ("status" = 'active'::"public"."round_status");


--
-- Name: idx_word_dictionary_en_word; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_word_dictionary_en_word" ON "public"."word_dictionary_en" USING "btree" ("word");


--
-- Name: idx_word_dictionary_sv_word; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_word_dictionary_sv_word" ON "public"."word_dictionary_sv" USING "btree" ("word");


--
-- Name: word_dictionary_en_pkey; Type: INDEX ATTACH; Schema: public; Owner: postgres
--

ALTER INDEX "public"."word_dictionary_pkey" ATTACH PARTITION "public"."word_dictionary_en_pkey";


--
-- Name: word_dictionary_sv_pkey; Type: INDEX ATTACH; Schema: public; Owner: postgres
--

ALTER INDEX "public"."word_dictionary_pkey" ATTACH PARTITION "public"."word_dictionary_sv_pkey";


--
-- Name: game_players game_players_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."game_players"
    ADD CONSTRAINT "game_players_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE CASCADE;


--
-- Name: game_players game_players_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."game_players"
    ADD CONSTRAINT "game_players_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: game_settings game_settings_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."game_settings"
    ADD CONSTRAINT "game_settings_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE CASCADE;


--
-- Name: games games_current_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."games"
    ADD CONSTRAINT "games_current_player_id_fkey" FOREIGN KEY ("current_player_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;


--
-- Name: games games_host_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."games"
    ADD CONSTRAINT "games_host_player_id_fkey" FOREIGN KEY ("host_player_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: games games_winner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."games"
    ADD CONSTRAINT "games_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;


--
-- Name: moves moves_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."moves"
    ADD CONSTRAINT "moves_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: moves moves_round_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."moves"
    ADD CONSTRAINT "moves_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: rounds rounds_current_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."rounds"
    ADD CONSTRAINT "rounds_current_player_id_fkey" FOREIGN KEY ("current_player_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;


--
-- Name: rounds rounds_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."rounds"
    ADD CONSTRAINT "rounds_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE CASCADE;


--
-- Name: rounds rounds_player_with_mark_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."rounds"
    ADD CONSTRAINT "rounds_player_with_mark_fkey" FOREIGN KEY ("player_with_mark") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;


--
-- Name: rounds rounds_starting_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."rounds"
    ADD CONSTRAINT "rounds_starting_player_id_fkey" FOREIGN KEY ("starting_player_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;


--
-- Name: word_dictionary Enable read access for all authenticated users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable read access for all authenticated users" ON "public"."word_dictionary" FOR SELECT TO "authenticated" USING (true);


--
-- Name: word_dictionary_en Enable read access for all authenticated users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable read access for all authenticated users" ON "public"."word_dictionary_en" FOR SELECT TO "authenticated" USING (true);


--
-- Name: word_dictionary_sv Enable read access for all authenticated users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable read access for all authenticated users" ON "public"."word_dictionary_sv" FOR SELECT TO "authenticated" USING (true);


--
-- Name: game_players Players can view game participants; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Players can view game participants" ON "public"."game_players" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."game_players" "gp"
  WHERE (("gp"."game_id" = "game_players"."game_id") AND ("gp"."player_id" = ( SELECT "auth"."uid"() AS "uid"))))));


--
-- Name: game_settings Players can view game settings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Players can view game settings" ON "public"."game_settings" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."game_players" "gp"
  WHERE (("gp"."game_id" = "game_settings"."game_id") AND ("gp"."player_id" = ( SELECT "auth"."uid"() AS "uid"))))));


--
-- Name: moves Players can view their moves; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Players can view their moves" ON "public"."moves" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."game_players" "gp"
     JOIN "public"."rounds" "r" ON (("gp"."game_id" = "r"."game_id")))
  WHERE (("r"."id" = "moves"."round_id") AND ("gp"."player_id" = ( SELECT "auth"."uid"() AS "uid"))))));


--
-- Name: games Players can view their own games; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Players can view their own games" ON "public"."games" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."game_players" "gp"
  WHERE (("gp"."game_id" = "games"."id") AND ("gp"."player_id" = ( SELECT "auth"."uid"() AS "uid"))))));


--
-- Name: rounds Players can view their rounds; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Players can view their rounds" ON "public"."rounds" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."game_players" "gp"
  WHERE (("gp"."game_id" = "rounds"."game_id") AND ("gp"."player_id" = ( SELECT "auth"."uid"() AS "uid"))))));


--
-- Name: profiles Profiles: owner can insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Profiles: owner can insert" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));


--
-- Name: profiles Profiles: owner can select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Profiles: owner can select" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id"));


--
-- Name: profiles Profiles: owner can update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Profiles: owner can update" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id"));


--
-- Name: game_players; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."game_players" ENABLE ROW LEVEL SECURITY;

--
-- Name: game_settings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."game_settings" ENABLE ROW LEVEL SECURITY;

--
-- Name: games; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."games" ENABLE ROW LEVEL SECURITY;

--
-- Name: moves; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."moves" ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

--
-- Name: rounds; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."rounds" ENABLE ROW LEVEL SECURITY;

--
-- Name: word_dictionary; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."word_dictionary" ENABLE ROW LEVEL SECURITY;

--
-- Name: word_dictionary_en; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."word_dictionary_en" ENABLE ROW LEVEL SECURITY;

--
-- Name: word_dictionary_sv; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."word_dictionary_sv" ENABLE ROW LEVEL SECURITY;

--
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: postgres
--

-- CREATE PUBLICATION "supabase_realtime" WITH (publish = 'insert, update, delete, truncate');


ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";

--
-- Name: SCHEMA "cron"; Type: ACL; Schema: -; Owner: supabase_admin
--

-- GRANT USAGE ON SCHEMA "cron" TO "postgres" WITH GRANT OPTION;


--
-- Name: SCHEMA "net"; Type: ACL; Schema: -; Owner: supabase_admin
--

-- GRANT USAGE ON SCHEMA "net" TO "supabase_functions_admin";
-- GRANT USAGE ON SCHEMA "net" TO "postgres";
-- GRANT USAGE ON SCHEMA "net" TO "anon";
-- GRANT USAGE ON SCHEMA "net" TO "authenticated";
-- GRANT USAGE ON SCHEMA "net" TO "service_role";


--
-- Name: SCHEMA "public"; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";


--
-- Name: FUNCTION "alter_job"("job_id" bigint, "schedule" "text", "command" "text", "database" "text", "username" "text", "active" boolean); Type: ACL; Schema: cron; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "cron"."alter_job"("job_id" bigint, "schedule" "text", "command" "text", "database" "text", "username" "text", "active" boolean) TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "job_cache_invalidate"(); Type: ACL; Schema: cron; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "cron"."job_cache_invalidate"() TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "schedule"("schedule" "text", "command" "text"); Type: ACL; Schema: cron; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "cron"."schedule"("schedule" "text", "command" "text") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "schedule"("job_name" "text", "schedule" "text", "command" "text"); Type: ACL; Schema: cron; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "cron"."schedule"("job_name" "text", "schedule" "text", "command" "text") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "schedule_in_database"("job_name" "text", "schedule" "text", "command" "text", "database" "text", "username" "text", "active" boolean); Type: ACL; Schema: cron; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "cron"."schedule_in_database"("job_name" "text", "schedule" "text", "command" "text", "database" "text", "username" "text", "active" boolean) TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "unschedule"("job_id" bigint); Type: ACL; Schema: cron; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "cron"."unschedule"("job_id" bigint) TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "unschedule"("job_name" "text"); Type: ACL; Schema: cron; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "cron"."unschedule"("job_name" "text") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "armor"("bytea"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."armor"("bytea") TO "dashboard_user";
-- GRANT ALL ON FUNCTION "extensions"."armor"("bytea") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "armor"("bytea", "text"[], "text"[]); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."armor"("bytea", "text"[], "text"[]) TO "dashboard_user";
-- GRANT ALL ON FUNCTION "extensions"."armor"("bytea", "text"[], "text"[]) TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "crypt"("text", "text"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."crypt"("text", "text") TO "dashboard_user";
-- GRANT ALL ON FUNCTION "extensions"."crypt"("text", "text") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "dearmor"("text"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."dearmor"("text") TO "dashboard_user";
-- GRANT ALL ON FUNCTION "extensions"."dearmor"("text") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "decrypt"("bytea", "bytea", "text"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."decrypt"("bytea", "bytea", "text") TO "dashboard_user";
-- GRANT ALL ON FUNCTION "extensions"."decrypt"("bytea", "bytea", "text") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "decrypt_iv"("bytea", "bytea", "bytea", "text"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."decrypt_iv"("bytea", "bytea", "bytea", "text") TO "dashboard_user";
-- GRANT ALL ON FUNCTION "extensions"."decrypt_iv"("bytea", "bytea", "bytea", "text") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "digest"("bytea", "text"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."digest"("bytea", "text") TO "dashboard_user";
-- GRANT ALL ON FUNCTION "extensions"."digest"("bytea", "text") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "digest"("text", "text"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."digest"("text", "text") TO "dashboard_user";
-- GRANT ALL ON FUNCTION "extensions"."digest"("text", "text") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "encrypt"("bytea", "bytea", "text"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."encrypt"("bytea", "bytea", "text") TO "dashboard_user";
-- GRANT ALL ON FUNCTION "extensions"."encrypt"("bytea", "bytea", "text") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "encrypt_iv"("bytea", "bytea", "bytea", "text"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."encrypt_iv"("bytea", "bytea", "bytea", "text") TO "dashboard_user";
-- GRANT ALL ON FUNCTION "extensions"."encrypt_iv"("bytea", "bytea", "bytea", "text") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "gen_random_bytes"(integer); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."gen_random_bytes"(integer) TO "dashboard_user";
-- GRANT ALL ON FUNCTION "extensions"."gen_random_bytes"(integer) TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "gen_random_uuid"(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."gen_random_uuid"() TO "dashboard_user";
-- GRANT ALL ON FUNCTION "extensions"."gen_random_uuid"() TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "gen_salt"("text"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."gen_salt"("text") TO "dashboard_user";
-- GRANT ALL ON FUNCTION "extensions"."gen_salt"("text") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "gen_salt"("text", integer); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."gen_salt"("text", integer) TO "dashboard_user";
-- GRANT ALL ON FUNCTION "extensions"."gen_salt"("text", integer) TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "hmac"("bytea", "bytea", "text"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."hmac"("bytea", "bytea", "text") TO "dashboard_user";
-- GRANT ALL ON FUNCTION "extensions"."hmac"("bytea", "bytea", "text") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "hmac"("text", "text", "text"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."hmac"("text", "text", "text") TO "dashboard_user";
-- GRANT ALL ON FUNCTION "extensions"."hmac"("text", "text", "text") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "pg_stat_statements"("showtext" boolean, OUT "userid" "oid", OUT "dbid" "oid", OUT "toplevel" boolean, OUT "queryid" bigint, OUT "query" "text", OUT "plans" bigint, OUT "total_plan_time" double precision, OUT "min_plan_time" double precision, OUT "max_plan_time" double precision, OUT "mean_plan_time" double precision, OUT "stddev_plan_time" double precision, OUT "calls" bigint, OUT "total_exec_time" double precision, OUT "min_exec_time" double precision, OUT "max_exec_time" double precision, OUT "mean_exec_time" double precision, OUT "stddev_exec_time" double precision, OUT "rows" bigint, OUT "shared_blks_hit" bigint, OUT "shared_blks_read" bigint, OUT "shared_blks_dirtied" bigint, OUT "shared_blks_written" bigint, OUT "local_blks_hit" bigint, OUT "local_blks_read" bigint, OUT "local_blks_dirtied" bigint, OUT "local_blks_written" bigint, OUT "temp_blks_read" bigint, OUT "temp_blks_written" bigint, OUT "shared_blk_read_time" double precision, OUT "shared_blk_write_time" double precision, OUT "local_blk_read_time" double precision, OUT "local_blk_write_time" double precision, OUT "temp_blk_read_time" double precision, OUT "temp_blk_write_time" double precision, OUT "wal_records" bigint, OUT "wal_fpi" bigint, OUT "wal_bytes" numeric, OUT "jit_functions" bigint, OUT "jit_generation_time" double precision, OUT "jit_inlining_count" bigint, OUT "jit_inlining_time" double precision, OUT "jit_optimization_count" bigint, OUT "jit_optimization_time" double precision, OUT "jit_emission_count" bigint, OUT "jit_emission_time" double precision, OUT "jit_deform_count" bigint, OUT "jit_deform_time" double precision, OUT "stats_since" timestamp with time zone, OUT "minmax_stats_since" timestamp with time zone); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."pg_stat_statements"("showtext" boolean, OUT "userid" "oid", OUT "dbid" "oid", OUT "toplevel" boolean, OUT "queryid" bigint, OUT "query" "text", OUT "plans" bigint, OUT "total_plan_time" double precision, OUT "min_plan_time" double precision, OUT "max_plan_time" double precision, OUT "mean_plan_time" double precision, OUT "stddev_plan_time" double precision, OUT "calls" bigint, OUT "total_exec_time" double precision, OUT "min_exec_time" double precision, OUT "max_exec_time" double precision, OUT "mean_exec_time" double precision, OUT "stddev_exec_time" double precision, OUT "rows" bigint, OUT "shared_blks_hit" bigint, OUT "shared_blks_read" bigint, OUT "shared_blks_dirtied" bigint, OUT "shared_blks_written" bigint, OUT "local_blks_hit" bigint, OUT "local_blks_read" bigint, OUT "local_blks_dirtied" bigint, OUT "local_blks_written" bigint, OUT "temp_blks_read" bigint, OUT "temp_blks_written" bigint, OUT "shared_blk_read_time" double precision, OUT "shared_blk_write_time" double precision, OUT "local_blk_read_time" double precision, OUT "local_blk_write_time" double precision, OUT "temp_blk_read_time" double precision, OUT "temp_blk_write_time" double precision, OUT "wal_records" bigint, OUT "wal_fpi" bigint, OUT "wal_bytes" numeric, OUT "jit_functions" bigint, OUT "jit_generation_time" double precision, OUT "jit_inlining_count" bigint, OUT "jit_inlining_time" double precision, OUT "jit_optimization_count" bigint, OUT "jit_optimization_time" double precision, OUT "jit_emission_count" bigint, OUT "jit_emission_time" double precision, OUT "jit_deform_count" bigint, OUT "jit_deform_time" double precision, OUT "stats_since" timestamp with time zone, OUT "minmax_stats_since" timestamp with time zone) TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "pg_stat_statements_info"(OUT "dealloc" bigint, OUT "stats_reset" timestamp with time zone); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."pg_stat_statements_info"(OUT "dealloc" bigint, OUT "stats_reset" timestamp with time zone) TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "pg_stat_statements_reset"("userid" "oid", "dbid" "oid", "queryid" bigint, "minmax_only" boolean); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."pg_stat_statements_reset"("userid" "oid", "dbid" "oid", "queryid" bigint, "minmax_only" boolean) TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "pgp_armor_headers"("text", OUT "key" "text", OUT "value" "text"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."pgp_armor_headers"("text", OUT "key" "text", OUT "value" "text") TO "dashboard_user";
-- GRANT ALL ON FUNCTION "extensions"."pgp_armor_headers"("text", OUT "key" "text", OUT "value" "text") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "pgp_key_id"("bytea"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."pgp_key_id"("bytea") TO "dashboard_user";
-- GRANT ALL ON FUNCTION "extensions"."pgp_key_id"("bytea") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "pgp_pub_decrypt"("bytea", "bytea"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_decrypt"("bytea", "bytea") TO "dashboard_user";
-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_decrypt"("bytea", "bytea") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "pgp_pub_decrypt"("bytea", "bytea", "text"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_decrypt"("bytea", "bytea", "text") TO "dashboard_user";
-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_decrypt"("bytea", "bytea", "text") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "pgp_pub_decrypt"("bytea", "bytea", "text", "text"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_decrypt"("bytea", "bytea", "text", "text") TO "dashboard_user";
-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_decrypt"("bytea", "bytea", "text", "text") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "pgp_pub_decrypt_bytea"("bytea", "bytea"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_decrypt_bytea"("bytea", "bytea") TO "dashboard_user";
-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_decrypt_bytea"("bytea", "bytea") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "pgp_pub_decrypt_bytea"("bytea", "bytea", "text"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_decrypt_bytea"("bytea", "bytea", "text") TO "dashboard_user";
-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_decrypt_bytea"("bytea", "bytea", "text") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "pgp_pub_decrypt_bytea"("bytea", "bytea", "text", "text"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_decrypt_bytea"("bytea", "bytea", "text", "text") TO "dashboard_user";
-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_decrypt_bytea"("bytea", "bytea", "text", "text") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "pgp_pub_encrypt"("text", "bytea"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_encrypt"("text", "bytea") TO "dashboard_user";
-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_encrypt"("text", "bytea") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "pgp_pub_encrypt"("text", "bytea", "text"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_encrypt"("text", "bytea", "text") TO "dashboard_user";
-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_encrypt"("text", "bytea", "text") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "pgp_pub_encrypt_bytea"("bytea", "bytea"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_encrypt_bytea"("bytea", "bytea") TO "dashboard_user";
-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_encrypt_bytea"("bytea", "bytea") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "pgp_pub_encrypt_bytea"("bytea", "bytea", "text"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_encrypt_bytea"("bytea", "bytea", "text") TO "dashboard_user";
-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_encrypt_bytea"("bytea", "bytea", "text") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "pgp_sym_decrypt"("bytea", "text"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."pgp_sym_decrypt"("bytea", "text") TO "dashboard_user";
-- GRANT ALL ON FUNCTION "extensions"."pgp_sym_decrypt"("bytea", "text") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "pgp_sym_decrypt"("bytea", "text", "text"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."pgp_sym_decrypt"("bytea", "text", "text") TO "dashboard_user";
-- GRANT ALL ON FUNCTION "extensions"."pgp_sym_decrypt"("bytea", "text", "text") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "pgp_sym_decrypt_bytea"("bytea", "text"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."pgp_sym_decrypt_bytea"("bytea", "text") TO "dashboard_user";
-- GRANT ALL ON FUNCTION "extensions"."pgp_sym_decrypt_bytea"("bytea", "text") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "pgp_sym_decrypt_bytea"("bytea", "text", "text"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."pgp_sym_decrypt_bytea"("bytea", "text", "text") TO "dashboard_user";
-- GRANT ALL ON FUNCTION "extensions"."pgp_sym_decrypt_bytea"("bytea", "text", "text") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "pgp_sym_encrypt"("text", "text"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."pgp_sym_encrypt"("text", "text") TO "dashboard_user";
-- GRANT ALL ON FUNCTION "extensions"."pgp_sym_encrypt"("text", "text") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "pgp_sym_encrypt"("text", "text", "text"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."pgp_sym_encrypt"("text", "text", "text") TO "dashboard_user";
-- GRANT ALL ON FUNCTION "extensions"."pgp_sym_encrypt"("text", "text", "text") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "pgp_sym_encrypt_bytea"("bytea", "text"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."pgp_sym_encrypt_bytea"("bytea", "text") TO "dashboard_user";
-- GRANT ALL ON FUNCTION "extensions"."pgp_sym_encrypt_bytea"("bytea", "text") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "pgp_sym_encrypt_bytea"("bytea", "text", "text"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."pgp_sym_encrypt_bytea"("bytea", "text", "text") TO "dashboard_user";
-- GRANT ALL ON FUNCTION "extensions"."pgp_sym_encrypt_bytea"("bytea", "text", "text") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "uuid_generate_v1"(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."uuid_generate_v1"() TO "dashboard_user";
-- GRANT ALL ON FUNCTION "extensions"."uuid_generate_v1"() TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "uuid_generate_v1mc"(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."uuid_generate_v1mc"() TO "dashboard_user";
-- GRANT ALL ON FUNCTION "extensions"."uuid_generate_v1mc"() TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "uuid_generate_v3"("namespace" "uuid", "name" "text"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."uuid_generate_v3"("namespace" "uuid", "name" "text") TO "dashboard_user";
-- GRANT ALL ON FUNCTION "extensions"."uuid_generate_v3"("namespace" "uuid", "name" "text") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "uuid_generate_v4"(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."uuid_generate_v4"() TO "dashboard_user";
-- GRANT ALL ON FUNCTION "extensions"."uuid_generate_v4"() TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "uuid_generate_v5"("namespace" "uuid", "name" "text"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."uuid_generate_v5"("namespace" "uuid", "name" "text") TO "dashboard_user";
-- GRANT ALL ON FUNCTION "extensions"."uuid_generate_v5"("namespace" "uuid", "name" "text") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "uuid_nil"(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."uuid_nil"() TO "dashboard_user";
-- GRANT ALL ON FUNCTION "extensions"."uuid_nil"() TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "uuid_ns_dns"(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."uuid_ns_dns"() TO "dashboard_user";
-- GRANT ALL ON FUNCTION "extensions"."uuid_ns_dns"() TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "uuid_ns_oid"(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."uuid_ns_oid"() TO "dashboard_user";
-- GRANT ALL ON FUNCTION "extensions"."uuid_ns_oid"() TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "uuid_ns_url"(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."uuid_ns_url"() TO "dashboard_user";
-- GRANT ALL ON FUNCTION "extensions"."uuid_ns_url"() TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "uuid_ns_x500"(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."uuid_ns_x500"() TO "dashboard_user";
-- GRANT ALL ON FUNCTION "extensions"."uuid_ns_x500"() TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "graphql"("operationName" "text", "query" "text", "variables" "jsonb", "extensions" "jsonb"); Type: ACL; Schema: graphql_public; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "graphql_public"."graphql"("operationName" "text", "query" "text", "variables" "jsonb", "extensions" "jsonb") TO "postgres";
-- GRANT ALL ON FUNCTION "graphql_public"."graphql"("operationName" "text", "query" "text", "variables" "jsonb", "extensions" "jsonb") TO "anon";
-- GRANT ALL ON FUNCTION "graphql_public"."graphql"("operationName" "text", "query" "text", "variables" "jsonb", "extensions" "jsonb") TO "authenticated";
-- GRANT ALL ON FUNCTION "graphql_public"."graphql"("operationName" "text", "query" "text", "variables" "jsonb", "extensions" "jsonb") TO "service_role";


--
-- Name: FUNCTION "http_get"("url" "text", "params" "jsonb", "headers" "jsonb", "timeout_milliseconds" integer); Type: ACL; Schema: net; Owner: supabase_admin
--

-- REVOKE ALL ON FUNCTION "net"."http_get"("url" "text", "params" "jsonb", "headers" "jsonb", "timeout_milliseconds" integer) FROM PUBLIC;
-- GRANT ALL ON FUNCTION "net"."http_get"("url" "text", "params" "jsonb", "headers" "jsonb", "timeout_milliseconds" integer) TO "supabase_functions_admin";
-- GRANT ALL ON FUNCTION "net"."http_get"("url" "text", "params" "jsonb", "headers" "jsonb", "timeout_milliseconds" integer) TO "postgres";
-- GRANT ALL ON FUNCTION "net"."http_get"("url" "text", "params" "jsonb", "headers" "jsonb", "timeout_milliseconds" integer) TO "anon";
-- GRANT ALL ON FUNCTION "net"."http_get"("url" "text", "params" "jsonb", "headers" "jsonb", "timeout_milliseconds" integer) TO "authenticated";
-- GRANT ALL ON FUNCTION "net"."http_get"("url" "text", "params" "jsonb", "headers" "jsonb", "timeout_milliseconds" integer) TO "service_role";


--
-- Name: FUNCTION "http_post"("url" "text", "body" "jsonb", "params" "jsonb", "headers" "jsonb", "timeout_milliseconds" integer); Type: ACL; Schema: net; Owner: supabase_admin
--

-- REVOKE ALL ON FUNCTION "net"."http_post"("url" "text", "body" "jsonb", "params" "jsonb", "headers" "jsonb", "timeout_milliseconds" integer) FROM PUBLIC;
-- GRANT ALL ON FUNCTION "net"."http_post"("url" "text", "body" "jsonb", "params" "jsonb", "headers" "jsonb", "timeout_milliseconds" integer) TO "supabase_functions_admin";
-- GRANT ALL ON FUNCTION "net"."http_post"("url" "text", "body" "jsonb", "params" "jsonb", "headers" "jsonb", "timeout_milliseconds" integer) TO "postgres";
-- GRANT ALL ON FUNCTION "net"."http_post"("url" "text", "body" "jsonb", "params" "jsonb", "headers" "jsonb", "timeout_milliseconds" integer) TO "anon";
-- GRANT ALL ON FUNCTION "net"."http_post"("url" "text", "body" "jsonb", "params" "jsonb", "headers" "jsonb", "timeout_milliseconds" integer) TO "authenticated";
-- GRANT ALL ON FUNCTION "net"."http_post"("url" "text", "body" "jsonb", "params" "jsonb", "headers" "jsonb", "timeout_milliseconds" integer) TO "service_role";


--
-- Name: FUNCTION "__apply_game_timeout"("p_game_id" "uuid", "p_player_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."__apply_game_timeout"("p_game_id" "uuid", "p_player_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."__apply_game_timeout"("p_game_id" "uuid", "p_player_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."__apply_game_timeout"("p_game_id" "uuid", "p_player_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."__apply_game_timeout"("p_game_id" "uuid", "p_player_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "__handle_new_user"(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."__handle_new_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."__handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."__handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."__handle_new_user"() TO "service_role";


--
-- Name: FUNCTION "__process_expired_turns"(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."__process_expired_turns"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."__process_expired_turns"() TO "anon";
GRANT ALL ON FUNCTION "public"."__process_expired_turns"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."__process_expired_turns"() TO "service_role";


--
-- Name: FUNCTION "_award_mark_and_check_elimination"("p_game_id" "uuid", "p_player_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."_award_mark_and_check_elimination"("p_game_id" "uuid", "p_player_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_award_mark_and_check_elimination"("p_game_id" "uuid", "p_player_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."_award_mark_and_check_elimination"("p_game_id" "uuid", "p_player_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_award_mark_and_check_elimination"("p_game_id" "uuid", "p_player_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "_check_and_complete_game"("p_game_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."_check_and_complete_game"("p_game_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_check_and_complete_game"("p_game_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."_check_and_complete_game"("p_game_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_check_and_complete_game"("p_game_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "_get_next_player"("p_game_id" "uuid", "p_current_player_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."_get_next_player"("p_game_id" "uuid", "p_current_player_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_get_next_player"("p_game_id" "uuid", "p_current_player_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."_get_next_player"("p_game_id" "uuid", "p_current_player_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_get_next_player"("p_game_id" "uuid", "p_current_player_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "_get_previous_player"("p_game_id" "uuid", "p_current_player_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."_get_previous_player"("p_game_id" "uuid", "p_current_player_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_get_previous_player"("p_game_id" "uuid", "p_current_player_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."_get_previous_player"("p_game_id" "uuid", "p_current_player_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_get_previous_player"("p_game_id" "uuid", "p_current_player_id" "uuid") TO "service_role";


--
-- Name: TABLE "games"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."games" TO "anon";
GRANT ALL ON TABLE "public"."games" TO "authenticated";
GRANT ALL ON TABLE "public"."games" TO "service_role";


--
-- Name: FUNCTION "_internal_start_game"("p_game_id" "uuid", "p_game_record" "public"."games"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."_internal_start_game"("p_game_id" "uuid", "p_game_record" "public"."games") TO "anon";
GRANT ALL ON FUNCTION "public"."_internal_start_game"("p_game_id" "uuid", "p_game_record" "public"."games") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_internal_start_game"("p_game_id" "uuid", "p_game_record" "public"."games") TO "service_role";


--
-- Name: FUNCTION "_is_valid_word"("p_word" "text", "p_language" "text"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."_is_valid_word"("p_word" "text", "p_language" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_is_valid_word"("p_word" "text", "p_language" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."_is_valid_word"("p_word" "text", "p_language" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_is_valid_word"("p_word" "text", "p_language" "text") TO "service_role";


--
-- Name: FUNCTION "_start_new_round"("p_game_id" "uuid", "p_starting_player_id" "uuid", "p_resolution_type" "public"."resolution_type", "p_player_with_mark" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."_start_new_round"("p_game_id" "uuid", "p_starting_player_id" "uuid", "p_resolution_type" "public"."resolution_type", "p_player_with_mark" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_start_new_round"("p_game_id" "uuid", "p_starting_player_id" "uuid", "p_resolution_type" "public"."resolution_type", "p_player_with_mark" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."_start_new_round"("p_game_id" "uuid", "p_starting_player_id" "uuid", "p_resolution_type" "public"."resolution_type", "p_player_with_mark" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_start_new_round"("p_game_id" "uuid", "p_starting_player_id" "uuid", "p_resolution_type" "public"."resolution_type", "p_player_with_mark" "uuid") TO "service_role";


--
-- Name: TABLE "game_settings"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."game_settings" TO "anon";
GRANT ALL ON TABLE "public"."game_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."game_settings" TO "service_role";


--
-- Name: TABLE "rounds"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."rounds" TO "anon";
GRANT ALL ON TABLE "public"."rounds" TO "authenticated";
GRANT ALL ON TABLE "public"."rounds" TO "service_role";


--
-- Name: FUNCTION "_validate_player_can_act"("p_game_id" "uuid", OUT "v_game" "public"."games", OUT "v_round" "public"."rounds", OUT "v_settings" "public"."game_settings", OUT "v_player_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."_validate_player_can_act"("p_game_id" "uuid", OUT "v_game" "public"."games", OUT "v_round" "public"."rounds", OUT "v_settings" "public"."game_settings", OUT "v_player_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_validate_player_can_act"("p_game_id" "uuid", OUT "v_game" "public"."games", OUT "v_round" "public"."rounds", OUT "v_settings" "public"."game_settings", OUT "v_player_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."_validate_player_can_act"("p_game_id" "uuid", OUT "v_game" "public"."games", OUT "v_round" "public"."rounds", OUT "v_settings" "public"."game_settings", OUT "v_player_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_validate_player_can_act"("p_game_id" "uuid", OUT "v_game" "public"."games", OUT "v_round" "public"."rounds", OUT "v_settings" "public"."game_settings", OUT "v_player_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "accept_invite"("p_invite_token" "text", "p_nickname" "text"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."accept_invite"("p_invite_token" "text", "p_nickname" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_invite"("p_invite_token" "text", "p_nickname" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_invite"("p_invite_token" "text", "p_nickname" "text") TO "service_role";


--
-- Name: FUNCTION "call_bluff"("p_game_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."call_bluff"("p_game_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."call_bluff"("p_game_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."call_bluff"("p_game_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "call_in_game_timeout"("p_game_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."call_in_game_timeout"("p_game_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."call_in_game_timeout"("p_game_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."call_in_game_timeout"("p_game_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "call_word"("p_game_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."call_word"("p_game_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."call_word"("p_game_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."call_word"("p_game_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "create_game"("p_language" "text", "p_min_word_length" integer, "p_max_players" integer, "p_marks_to_eliminate" integer, "p_complete_move_timeout_seconds" integer, "p_nickname" "text"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."create_game"("p_language" "text", "p_min_word_length" integer, "p_max_players" integer, "p_marks_to_eliminate" integer, "p_complete_move_timeout_seconds" integer, "p_nickname" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_game"("p_language" "text", "p_min_word_length" integer, "p_max_players" integer, "p_marks_to_eliminate" integer, "p_complete_move_timeout_seconds" integer, "p_nickname" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_game"("p_language" "text", "p_min_word_length" integer, "p_max_players" integer, "p_marks_to_eliminate" integer, "p_complete_move_timeout_seconds" integer, "p_nickname" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_game"("p_language" "text", "p_min_word_length" integer, "p_max_players" integer, "p_marks_to_eliminate" integer, "p_complete_move_timeout_seconds" integer, "p_nickname" "text") TO "service_role";


--
-- Name: FUNCTION "fold"("p_game_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."fold"("p_game_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fold"("p_game_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fold"("p_game_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "get_game_by_id"("p_game_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."get_game_by_id"("p_game_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_game_by_id"("p_game_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_game_by_id"("p_game_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_game_by_id"("p_game_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "get_games"("p_limit" integer, "p_offset" integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."get_games"("p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_games"("p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_games"("p_limit" integer, "p_offset" integer) TO "service_role";


--
-- Name: FUNCTION "get_lobby_by_game_id"("p_game_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."get_lobby_by_game_id"("p_game_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_lobby_by_game_id"("p_game_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_lobby_by_game_id"("p_game_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_lobby_by_game_id"("p_game_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "resolve_bluff"("p_game_id" "uuid", "p_word" "text"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."resolve_bluff"("p_game_id" "uuid", "p_word" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."resolve_bluff"("p_game_id" "uuid", "p_word" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolve_bluff"("p_game_id" "uuid", "p_word" "text") TO "service_role";


--
-- Name: FUNCTION "start_game"("p_game_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."start_game"("p_game_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."start_game"("p_game_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."start_game"("p_game_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."start_game"("p_game_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "submit_letter"("p_game_id" "uuid", "p_letter" "text"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."submit_letter"("p_game_id" "uuid", "p_letter" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."submit_letter"("p_game_id" "uuid", "p_letter" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."submit_letter"("p_game_id" "uuid", "p_letter" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_letter"("p_game_id" "uuid", "p_letter" "text") TO "service_role";


--
-- Name: FUNCTION "_crypto_aead_det_decrypt"("message" "bytea", "additional" "bytea", "key_id" bigint, "context" "bytea", "nonce" "bytea"); Type: ACL; Schema: vault; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "vault"."_crypto_aead_det_decrypt"("message" "bytea", "additional" "bytea", "key_id" bigint, "context" "bytea", "nonce" "bytea") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "vault"."_crypto_aead_det_decrypt"("message" "bytea", "additional" "bytea", "key_id" bigint, "context" "bytea", "nonce" "bytea") TO "service_role";


--
-- Name: FUNCTION "create_secret"("new_secret" "text", "new_name" "text", "new_description" "text", "new_key_id" "uuid"); Type: ACL; Schema: vault; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "vault"."create_secret"("new_secret" "text", "new_name" "text", "new_description" "text", "new_key_id" "uuid") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "vault"."create_secret"("new_secret" "text", "new_name" "text", "new_description" "text", "new_key_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "update_secret"("secret_id" "uuid", "new_secret" "text", "new_name" "text", "new_description" "text", "new_key_id" "uuid"); Type: ACL; Schema: vault; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "vault"."update_secret"("secret_id" "uuid", "new_secret" "text", "new_name" "text", "new_description" "text", "new_key_id" "uuid") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "vault"."update_secret"("secret_id" "uuid", "new_secret" "text", "new_name" "text", "new_description" "text", "new_key_id" "uuid") TO "service_role";


--
-- Name: TABLE "job"; Type: ACL; Schema: cron; Owner: supabase_admin
--

-- GRANT SELECT ON TABLE "cron"."job" TO "postgres" WITH GRANT OPTION;


--
-- Name: TABLE "job_run_details"; Type: ACL; Schema: cron; Owner: supabase_admin
--

-- GRANT ALL ON TABLE "cron"."job_run_details" TO "postgres" WITH GRANT OPTION;


--
-- Name: TABLE "pg_stat_statements"; Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON TABLE "extensions"."pg_stat_statements" TO "postgres" WITH GRANT OPTION;


--
-- Name: TABLE "pg_stat_statements_info"; Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON TABLE "extensions"."pg_stat_statements_info" TO "postgres" WITH GRANT OPTION;


--
-- Name: TABLE "game_players"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."game_players" TO "anon";
GRANT ALL ON TABLE "public"."game_players" TO "authenticated";
GRANT ALL ON TABLE "public"."game_players" TO "service_role";


--
-- Name: TABLE "moves"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."moves" TO "anon";
GRANT ALL ON TABLE "public"."moves" TO "authenticated";
GRANT ALL ON TABLE "public"."moves" TO "service_role";


--
-- Name: TABLE "profiles"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";


--
-- Name: TABLE "word_dictionary"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."word_dictionary" TO "anon";
GRANT ALL ON TABLE "public"."word_dictionary" TO "authenticated";
GRANT ALL ON TABLE "public"."word_dictionary" TO "service_role";


--
-- Name: TABLE "word_dictionary_en"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."word_dictionary_en" TO "anon";
GRANT ALL ON TABLE "public"."word_dictionary_en" TO "authenticated";
GRANT ALL ON TABLE "public"."word_dictionary_en" TO "service_role";


--
-- Name: TABLE "word_dictionary_sv"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."word_dictionary_sv" TO "anon";
GRANT ALL ON TABLE "public"."word_dictionary_sv" TO "authenticated";
GRANT ALL ON TABLE "public"."word_dictionary_sv" TO "service_role";


--
-- Name: TABLE "secrets"; Type: ACL; Schema: vault; Owner: supabase_admin
--

-- GRANT SELECT,REFERENCES,DELETE,TRUNCATE ON TABLE "vault"."secrets" TO "postgres" WITH GRANT OPTION;
-- GRANT SELECT,DELETE ON TABLE "vault"."secrets" TO "service_role";


--
-- Name: TABLE "decrypted_secrets"; Type: ACL; Schema: vault; Owner: supabase_admin
--

-- GRANT SELECT,REFERENCES,DELETE,TRUNCATE ON TABLE "vault"."decrypted_secrets" TO "postgres" WITH GRANT OPTION;
-- GRANT SELECT,DELETE ON TABLE "vault"."decrypted_secrets" TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";


--
-- Name: issue_graphql_placeholder; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

-- CREATE EVENT TRIGGER "issue_graphql_placeholder" ON "sql_drop"
--          WHEN TAG IN ('DROP EXTENSION')
--    EXECUTE FUNCTION "extensions"."set_graphql_placeholder"();


-- ALTER EVENT TRIGGER "issue_graphql_placeholder" OWNER TO "supabase_admin";

--
-- Name: issue_pg_cron_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

-- CREATE EVENT TRIGGER "issue_pg_cron_access" ON "ddl_command_end"
--          WHEN TAG IN ('CREATE EXTENSION')
--    EXECUTE FUNCTION "extensions"."grant_pg_cron_access"();


-- ALTER EVENT TRIGGER "issue_pg_cron_access" OWNER TO "supabase_admin";

--
-- Name: issue_pg_graphql_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

-- CREATE EVENT TRIGGER "issue_pg_graphql_access" ON "ddl_command_end"
--          WHEN TAG IN ('CREATE FUNCTION')
--    EXECUTE FUNCTION "extensions"."grant_pg_graphql_access"();


-- ALTER EVENT TRIGGER "issue_pg_graphql_access" OWNER TO "supabase_admin";

--
-- Name: issue_pg_net_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

-- CREATE EVENT TRIGGER "issue_pg_net_access" ON "ddl_command_end"
--          WHEN TAG IN ('CREATE EXTENSION')
--    EXECUTE FUNCTION "extensions"."grant_pg_net_access"();


-- ALTER EVENT TRIGGER "issue_pg_net_access" OWNER TO "supabase_admin";

--
-- Name: pgrst_ddl_watch; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

-- CREATE EVENT TRIGGER "pgrst_ddl_watch" ON "ddl_command_end"
--    EXECUTE FUNCTION "extensions"."pgrst_ddl_watch"();


-- ALTER EVENT TRIGGER "pgrst_ddl_watch" OWNER TO "supabase_admin";

--
-- Name: pgrst_drop_watch; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

-- CREATE EVENT TRIGGER "pgrst_drop_watch" ON "sql_drop"
--    EXECUTE FUNCTION "extensions"."pgrst_drop_watch"();


-- ALTER EVENT TRIGGER "pgrst_drop_watch" OWNER TO "supabase_admin";

--
-- PostgreSQL database dump complete
--

-- \unrestrict HsjqvLWLb5LsQBd0uF8H5a9Jk3ipgXqiBuOa78c3n9AIaOabuBbS7mJIqnGYffv

RESET ALL;

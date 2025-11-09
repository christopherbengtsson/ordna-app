--
-- Push Notifications with Visibility-Aware Suppression
--
-- This migration adds:
-- 1. FCM token storage and notification queue table
-- 2. Visibility tracking (is_app_visible flag)
-- 3. Automatic notification triggers for game events
-- 4. Smart suppression: only notify if app is hidden OR user hasn't been active for 5+ minutes
-- 5. Crash detection safety net via last_seen timestamps
--

--
-- Name: notification_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."notification_type" AS ENUM (
    'your_turn',
    'game_ended',
    'game_started'
);

ALTER TYPE "public"."notification_type" OWNER TO "postgres";

--
-- Name: profiles fcm_token; Type: COLUMN; Schema: public; Owner: postgres
--

ALTER TABLE "public"."profiles"
ADD COLUMN IF NOT EXISTS "fcm_token" "text";

--
-- Name: profiles is_app_visible; Type: COLUMN; Schema: public; Owner: postgres
--

ALTER TABLE "public"."profiles"
ADD COLUMN IF NOT EXISTS "is_app_visible" boolean DEFAULT false NOT NULL;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "notification_type" "public"."notification_type" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."notifications" OWNER TO "postgres";

--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");

--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

--
-- Name: notifications; Enable RLS
--

ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications Users can view own notifications; Type: POLICY; Schema: public; Owner: postgres
--
-- Note: Wrapping auth.uid() in a subquery ensures it's only evaluated once per query
-- instead of once per row, significantly improving performance at scale.
--

CREATE POLICY "Users can view own notifications" ON "public"."notifications"
    FOR SELECT
    USING (((SELECT "auth"."uid"()) = "user_id"));

--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX IF NOT EXISTS "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");

--
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX IF NOT EXISTS "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at" DESC);

--
-- Name: idx_profiles_app_visible; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX IF NOT EXISTS "idx_profiles_app_visible" ON "public"."profiles" USING "btree" ("is_app_visible");

--
-- Name: set_app_visibility(boolean); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."set_app_visibility"("visible" boolean)
RETURNS "void"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" TO ''
AS $$
BEGIN
  UPDATE public.profiles
  SET
    is_app_visible = visible,
    -- Update last_seen when app becomes visible (acts as heartbeat)
    last_seen = CASE WHEN visible = true THEN now() ELSE last_seen END
  WHERE id = auth.uid();
END;
$$;

ALTER FUNCTION "public"."set_app_visibility"("visible" boolean) OWNER TO "postgres";

--
-- Name: FUNCTION set_app_visibility(visible boolean); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION "public"."set_app_visibility"("visible" boolean) IS 'Public RPC: Updates whether the current user has the app visible. Called by Page Visibility API. Also updates last_seen when becoming visible.';

--
-- Name: _queue_turn_notification(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."_queue_turn_notification"(
  "p_player_id" "uuid",
  "p_game_id" "uuid",
  "p_current_sequence" "text"
)
RETURNS "void"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" TO ''
AS $$
DECLARE
  v_fcm_token text;
  v_game_host text;
  v_is_app_visible boolean;
  v_last_seen timestamptz;
BEGIN
  -- Get player's FCM token, visibility status, and last_seen
  SELECT fcm_token, is_app_visible, last_seen
  INTO v_fcm_token, v_is_app_visible, v_last_seen
  FROM public.profiles
  WHERE id = p_player_id;

  -- Only queue if player has FCM token AND (app is not visible OR last_seen is old)
  -- The last_seen check is a safety net for crash detection
  IF v_fcm_token IS NOT NULL AND
     (v_is_app_visible = false OR v_last_seen < now() - interval '5 minutes') THEN

    -- Get game host name for context
    SELECT p.nickname INTO v_game_host
    FROM public.games g
    JOIN public.profiles p ON g.host_player_id = p.id
    WHERE g.id = p_game_id;

    INSERT INTO public.notifications (
      user_id,
      notification_type,
      title,
      body,
      data
    )
    VALUES (
      p_player_id,
      'your_turn'::public.notification_type,
      'Your Turn!',
      CASE
        WHEN p_current_sequence = '' THEN 'It''s your turn to play'
        ELSE 'Current sequence: ' || p_current_sequence
      END,
      jsonb_build_object(
        'game_id', p_game_id,
        'sequence', p_current_sequence,
        'action', 'navigate_to_game'
      )
    );

    RAISE NOTICE 'Queued turn notification for player %', p_player_id;
  ELSE
    RAISE NOTICE 'Skipped notification for player % (app_visible: %, last_seen: %)',
      p_player_id, v_is_app_visible, v_last_seen;
  END IF;
END;
$$;

ALTER FUNCTION "public"."_queue_turn_notification"("p_player_id" "uuid", "p_game_id" "uuid", "p_current_sequence" "text") OWNER TO "postgres";

--
-- Name: FUNCTION _queue_turn_notification(p_player_id uuid, p_game_id uuid, p_current_sequence text); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION "public"."_queue_turn_notification"("p_player_id" "uuid", "p_game_id" "uuid", "p_current_sequence" "text") IS 'Internal helper: Queues a turn notification for a player if they have an FCM token registered and app is not visible. Only called by trigger functions.';

--
-- Name: _queue_game_end_notification(uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."_queue_game_end_notification"(
  "p_player_id" "uuid",
  "p_game_id" "uuid",
  "p_winner_id" "uuid"
)
RETURNS "void"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" TO ''
AS $$
DECLARE
  v_fcm_token text;
  v_winner_name text;
  v_is_winner boolean;
  v_is_app_visible boolean;
  v_last_seen timestamptz;
BEGIN
  -- Get player's FCM token, visibility status, and last_seen
  SELECT fcm_token, is_app_visible, last_seen
  INTO v_fcm_token, v_is_app_visible, v_last_seen
  FROM public.profiles
  WHERE id = p_player_id;

  -- Only queue if player has FCM token AND (app is not visible OR last_seen is old)
  IF v_fcm_token IS NOT NULL AND
     (v_is_app_visible = false OR v_last_seen < now() - interval '5 minutes') THEN

    v_is_winner := (p_player_id = p_winner_id);

    -- Get winner name
    SELECT nickname INTO v_winner_name
    FROM public.profiles
    WHERE id = p_winner_id;

    INSERT INTO public.notifications (
      user_id,
      notification_type,
      title,
      body,
      data
    )
    VALUES (
      p_player_id,
      'game_ended'::public.notification_type,
      CASE
        WHEN v_is_winner THEN 'You Won!'
        ELSE 'Game Over'
      END,
      CASE
        WHEN v_is_winner THEN 'Congratulations on your victory!'
        ELSE v_winner_name || ' won the game'
      END,
      jsonb_build_object(
        'game_id', p_game_id,
        'winner_id', p_winner_id,
        'action', 'navigate_to_game_over'
      )
    );

    RAISE NOTICE 'Queued game end notification for player %', p_player_id;
  ELSE
    RAISE NOTICE 'Skipped notification for player % (app_visible: %, last_seen: %)',
      p_player_id, v_is_app_visible, v_last_seen;
  END IF;
END;
$$;

ALTER FUNCTION "public"."_queue_game_end_notification"("p_player_id" "uuid", "p_game_id" "uuid", "p_winner_id" "uuid") OWNER TO "postgres";

--
-- Name: FUNCTION _queue_game_end_notification(p_player_id uuid, p_game_id uuid, p_winner_id uuid); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION "public"."_queue_game_end_notification"("p_player_id" "uuid", "p_game_id" "uuid", "p_winner_id" "uuid") IS 'Internal helper: Queues a game end notification for a player if they have an FCM token registered and app is not visible. Only called by trigger functions.';

--
-- Name: _queue_game_start_notification(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."_queue_game_start_notification"(
  "p_player_id" "uuid",
  "p_game_id" "uuid",
  "p_host_name" "text"
)
RETURNS "void"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" TO ''
AS $$
DECLARE
  v_fcm_token text;
  v_is_app_visible boolean;
  v_last_seen timestamptz;
BEGIN
  -- Get player's FCM token, visibility status, and last_seen
  SELECT fcm_token, is_app_visible, last_seen
  INTO v_fcm_token, v_is_app_visible, v_last_seen
  FROM public.profiles
  WHERE id = p_player_id;

  -- Only queue if player has FCM token AND (app is not visible OR last_seen is old)
  IF v_fcm_token IS NOT NULL AND
     (v_is_app_visible = false OR v_last_seen < now() - interval '5 minutes') THEN

    INSERT INTO public.notifications (
      user_id,
      notification_type,
      title,
      body,
      data
    )
    VALUES (
      p_player_id,
      'game_started'::public.notification_type,
      'Game Started!',
      p_host_name || ' started the game',
      jsonb_build_object(
        'game_id', p_game_id,
        'action', 'navigate_to_game'
      )
    );

    RAISE NOTICE 'Queued game start notification for player %', p_player_id;
  ELSE
    RAISE NOTICE 'Skipped notification for player % (app_visible: %, last_seen: %)',
      p_player_id, v_is_app_visible, v_last_seen;
  END IF;
END;
$$;

ALTER FUNCTION "public"."_queue_game_start_notification"("p_player_id" "uuid", "p_game_id" "uuid", "p_host_name" "text") OWNER TO "postgres";

--
-- Name: FUNCTION _queue_game_start_notification(p_player_id uuid, p_game_id uuid, p_host_name text); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION "public"."_queue_game_start_notification"("p_player_id" "uuid", "p_game_id" "uuid", "p_host_name" "text") IS 'Internal helper: Queues a game start notification for a player if they have an FCM token registered and app is not visible. Only called by trigger functions.';

--
-- Name: _notify_on_turn_change(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."_notify_on_turn_change"()
RETURNS "trigger"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" TO ''
AS $$
BEGIN
  -- Only notify if current_player_id changed and is not null
  IF NEW.current_player_id IS NOT NULL AND
     (TG_OP = 'INSERT' OR OLD.current_player_id IS DISTINCT FROM NEW.current_player_id) THEN

    -- Queue notification for the new current player
    PERFORM public._queue_turn_notification(
      NEW.current_player_id,
      NEW.game_id,
      NEW.current_sequence
    );
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."_notify_on_turn_change"() OWNER TO "postgres";

--
-- Name: FUNCTION _notify_on_turn_change(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION "public"."_notify_on_turn_change"() IS 'Internal trigger function: Automatically queues turn notifications when a round''s current_player_id changes.';

--
-- Name: _notify_on_game_end(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."_notify_on_game_end"()
RETURNS "trigger"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" TO ''
AS $$
DECLARE
  v_player record;
BEGIN
  -- Only notify when game becomes completed
  IF NEW.status = 'completed' AND
     (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN

    -- Queue notification for all players in the game
    FOR v_player IN
      SELECT gp.player_id
      FROM public.game_players gp
      WHERE gp.game_id = NEW.id
    LOOP
      PERFORM public._queue_game_end_notification(
        v_player.player_id,
        NEW.id,
        NEW.winner_id
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."_notify_on_game_end"() OWNER TO "postgres";

--
-- Name: FUNCTION _notify_on_game_end(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION "public"."_notify_on_game_end"() IS 'Internal trigger function: Automatically queues game end notifications for all players when a game is completed.';

--
-- Name: _notify_on_game_start(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."_notify_on_game_start"()
RETURNS "trigger"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" TO ''
AS $$
DECLARE
  v_player record;
  v_host_name text;
BEGIN
  -- Only notify when game becomes active (started)
  IF NEW.status = 'active' AND
     (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN

    -- Get host name
    SELECT nickname INTO v_host_name
    FROM public.profiles
    WHERE id = NEW.host_player_id;

    -- Queue notification for all players except the host
    FOR v_player IN
      SELECT gp.player_id
      FROM public.game_players gp
      WHERE gp.game_id = NEW.id
        AND gp.player_id != NEW.host_player_id
    LOOP
      PERFORM public._queue_game_start_notification(
        v_player.player_id,
        NEW.id,
        v_host_name
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."_notify_on_game_start"() OWNER TO "postgres";

--
-- Name: FUNCTION _notify_on_game_start(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION "public"."_notify_on_game_start"() IS 'Internal trigger function: Automatically queues game start notifications for all players (except host) when a game becomes active.';

--
-- Name: _validate_player_can_act(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION public._validate_player_can_act(
  p_game_id uuid,
  OUT v_game public.games,
  OUT v_round public.rounds,
  OUT v_settings public.game_settings,
  OUT v_player_id uuid
)
RETURNS record
LANGUAGE "plpgsql"
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_player boolean;
  v_is_eliminated boolean;
BEGIN
  -- Authentication check
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  -- Update last_seen for crash detection safety net
  -- This ensures all game actions touch last_seen automatically
  UPDATE public.profiles
  SET last_seen = now()
  WHERE id = v_uid;

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

  -- Verify user is a player in this game (single query optimization)
  SELECT gp.is_eliminated
  INTO v_is_eliminated
  FROM public.game_players gp
  WHERE gp.game_id = p_game_id AND gp.player_id = v_uid;

  IF FOUND THEN
    v_is_player := true;
    -- v_is_eliminated already set from query
  ELSE
    v_is_player := false;
    v_is_eliminated := true;  -- Treat non-existent player as eliminated
  END IF;

  IF NOT v_is_player THEN
    RAISE EXCEPTION 'access denied: not a player in this game';
  END IF;

  IF v_is_eliminated THEN
    RAISE EXCEPTION 'you have been eliminated from this game';
  END IF;

  -- Load active round
  SELECT r.* INTO v_round
  FROM public.rounds r
  WHERE r.game_id = p_game_id
    AND r.status = 'active'
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'no active round found';
  END IF;

  -- Load game settings
  SELECT gs.* INTO v_settings
  FROM public.game_settings gs
  WHERE gs.game_id = p_game_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'game settings not found';
  END IF;

  v_player_id := v_uid;
END;
$$;

ALTER FUNCTION public._validate_player_can_act(p_game_id uuid, OUT v_game public.games, OUT v_round public.rounds, OUT v_settings public.game_settings, OUT v_player_id uuid) OWNER TO "postgres";

--
-- Name: FUNCTION _validate_player_can_act(p_game_id uuid, OUT v_game games, OUT v_round rounds, OUT v_settings game_settings, OUT v_player_id uuid); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public._validate_player_can_act(p_game_id uuid, OUT v_game public.games, OUT v_round public.rounds, OUT v_settings public.game_settings, OUT v_player_id uuid) IS 'Internal helper: Validates player can act in a game and updates last_seen. Called by all game action RPCs (submit_letter, call_word, etc.). Also serves as crash detection safety net.';

--
-- Name: rounds trigger_notify_turn_change; Type: TRIGGER; Schema: public; Owner: postgres
--

DROP TRIGGER IF EXISTS "trigger_notify_turn_change" ON "public"."rounds";
CREATE TRIGGER "trigger_notify_turn_change"
  AFTER INSERT OR UPDATE OF "current_player_id"
  ON "public"."rounds"
  FOR EACH ROW
  EXECUTE FUNCTION "public"."_notify_on_turn_change"();

--
-- Name: games trigger_notify_game_end; Type: TRIGGER; Schema: public; Owner: postgres
--

DROP TRIGGER IF EXISTS "trigger_notify_game_end" ON "public"."games";
CREATE TRIGGER "trigger_notify_game_end"
  AFTER INSERT OR UPDATE OF "status"
  ON "public"."games"
  FOR EACH ROW
  EXECUTE FUNCTION "public"."_notify_on_game_end"();

--
-- Name: games trigger_notify_game_start; Type: TRIGGER; Schema: public; Owner: postgres
--

DROP TRIGGER IF EXISTS "trigger_notify_game_start" ON "public"."games";
CREATE TRIGGER "trigger_notify_game_start"
  AFTER INSERT OR UPDATE OF "status"
  ON "public"."games"
  FOR EACH ROW
  EXECUTE FUNCTION "public"."_notify_on_game_start"();

--
-- Name: update_fcm_token(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."update_fcm_token"("token" "text")
RETURNS "void"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" TO ''
AS $$
BEGIN
  UPDATE public.profiles
  SET fcm_token = token
  WHERE id = auth.uid();
END;
$$;

ALTER FUNCTION "public"."update_fcm_token"("token" "text") OWNER TO "postgres";

--
-- Name: FUNCTION update_fcm_token(token text); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION "public"."update_fcm_token"("token" "text") IS 'Public RPC: Updates the current user''s FCM token for push notifications.';

--
-- Name: clear_fcm_token(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."clear_fcm_token"()
RETURNS "void"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" TO ''
AS $$
BEGIN
  UPDATE public.profiles
  SET fcm_token = NULL
  WHERE id = auth.uid();
END;
$$;

ALTER FUNCTION "public"."clear_fcm_token"() OWNER TO "postgres";

--
-- Name: FUNCTION clear_fcm_token(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION "public"."clear_fcm_token"() IS 'Public RPC: Clears the current user''s FCM token (for logout or unsubscribe).';

--
-- Name: COLUMN profiles.is_app_visible; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."profiles"."is_app_visible" IS 'Tracks if user currently has the app visible. Updated by Page Visibility API via set_app_visibility(). Used to suppress notifications when user is actively using the app.';

--
-- Name: COLUMN profiles.last_seen; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."profiles"."last_seen" IS 'Last time user was active. Updated when app becomes visible and on game actions (submit_letter, call_word, etc.). Used as safety net to detect crashes - if last_seen is old but is_app_visible is true, assume crash and send notifications anyway.';

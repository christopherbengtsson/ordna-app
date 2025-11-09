--
-- Refactor Push Notifications for Client-Side i18n
--
-- This migration removes title and body columns from the notifications table
-- and updates queue functions to only store notification_type and data.
-- Title and body will be generated client-side using browser locale.
--

-- Step 1: Create notification_action enum for type safety
CREATE TYPE "public"."notification_action" AS ENUM (
  'navigate_to_game',
  'navigate_to_game_over',
  'navigate_to_lobby',
  'navigate_to_waiting_room'
);

ALTER TYPE "public"."notification_action" OWNER TO "postgres";

-- Step 2: Remove title and body columns from notifications table
ALTER TABLE "public"."notifications"
DROP COLUMN IF EXISTS "title",
DROP COLUMN IF EXISTS "body";

-- Step 3: Update _queue_turn_notification to remove title/body and sequence
CREATE OR REPLACE FUNCTION "public"."_queue_turn_notification"(
  "p_player_id" "uuid",
  "p_game_id" "uuid"
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
      data
    )
    VALUES (
      p_player_id,
      'your_turn'::public.notification_type,
      jsonb_build_object(
        'game_id', p_game_id,
        'action', 'navigate_to_game'::public.notification_action
      )
    );

    RAISE NOTICE 'Queued turn notification for player %', p_player_id;
  ELSE
    RAISE NOTICE 'Skipped notification for player % (app_visible: %, last_seen: %)',
      p_player_id, v_is_app_visible, v_last_seen;
  END IF;
END;
$$;

COMMENT ON FUNCTION "public"."_queue_turn_notification"("p_player_id" "uuid", "p_game_id" "uuid") IS 'Internal helper: Queues a turn notification for a player if they have an FCM token registered and app is not visible. Title and body are generated client-side using i18n.';

-- Step 4: Update _queue_game_end_notification to remove title/body
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

    -- Get winner name (only needed if player is not the winner)
    IF p_player_id != p_winner_id THEN
      SELECT nickname INTO v_winner_name
      FROM public.profiles
      WHERE id = p_winner_id;
    END IF;

    INSERT INTO public.notifications (
      user_id,
      notification_type,
      data
    )
    VALUES (
      p_player_id,
      'game_ended'::public.notification_type,
      jsonb_build_object(
        'game_id', p_game_id,
        'winner_id', p_winner_id,
        'winner_name', v_winner_name,
        'action', 'navigate_to_game_over'::public.notification_action
      )
    );

    RAISE NOTICE 'Queued game end notification for player %', p_player_id;
  ELSE
    RAISE NOTICE 'Skipped notification for player % (app_visible: %, last_seen: %)',
      p_player_id, v_is_app_visible, v_last_seen;
  END IF;
END;
$$;

COMMENT ON FUNCTION "public"."_queue_game_end_notification"("p_player_id" "uuid", "p_game_id" "uuid", "p_winner_id" "uuid") IS 'Internal helper: Queues a game end notification for a player if they have an FCM token registered and app is not visible. Title and body are generated client-side using i18n.';

-- Step 5: Update _queue_game_start_notification to remove title/body
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
      data
    )
    VALUES (
      p_player_id,
      'game_started'::public.notification_type,
      jsonb_build_object(
        'game_id', p_game_id,
        'host_name', p_host_name,
        'action', 'navigate_to_game'::public.notification_action
      )
    );

    RAISE NOTICE 'Queued game start notification for player %', p_player_id;
  ELSE
    RAISE NOTICE 'Skipped notification for player % (app_visible: %, last_seen: %)',
      p_player_id, v_is_app_visible, v_last_seen;
  END IF;
END;
$$;

COMMENT ON FUNCTION "public"."_queue_game_start_notification"("p_player_id" "uuid", "p_game_id" "uuid", "p_host_name" "text") IS 'Internal helper: Queues a game start notification for a player if they have an FCM token registered and app is not visible. Title and body are generated client-side using i18n.';

-- Step 6: Update _notify_on_turn_change trigger to not pass sequence
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
      NEW.game_id
    );
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION "public"."_notify_on_turn_change"() IS 'Internal trigger function: Automatically queues turn notifications when a round''s current_player_id changes.';

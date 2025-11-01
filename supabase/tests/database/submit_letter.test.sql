-- Test suite for submit_letter function
-- Tests letter submission validation, authorization, game state, and turn progression

begin;

-- Enable pgTAP extension for testing
create extension if not exists pgtap;

select plan(18);

-- ============================================================================
-- TEST SETUP HELPERS
-- ============================================================================

-- Create test users in auth.users and profiles
do $$
declare
  test_user_1 uuid := '00000000-0000-0000-0000-000000000001';
  test_user_2 uuid := '00000000-0000-0000-0000-000000000002';
  test_user_3 uuid := '00000000-0000-0000-0000-000000000003';
begin
  -- Insert test users into auth.users first
  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at
  ) values
    (test_user_1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'test1@example.com', crypt('password', gen_salt('bf')), now(), now(), now()),
    (test_user_2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'test2@example.com', crypt('password', gen_salt('bf')), now(), now(), now()),
    (test_user_3, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'test3@example.com', crypt('password', gen_salt('bf')), now(), now(), now())
  on conflict (id) do nothing;

  -- Insert test profiles (these will be auto-created by trigger, but we'll ensure they exist)
  insert into public.profiles (id, nickname) values
    (test_user_1, 'TestPlayer1'),
    (test_user_2, 'TestPlayer2'),
    (test_user_3, 'TestPlayer3')
  on conflict (id) do nothing;
end $$;

-- Create test game with players
do $$
declare
  test_game_id uuid := '10000000-0000-0000-0000-000000000001';
  test_round_id uuid := '20000000-0000-0000-0000-000000000001';
  test_user_1 uuid := '00000000-0000-0000-0000-000000000001';
  test_user_2 uuid := '00000000-0000-0000-0000-000000000002';
begin
  -- Create game
  insert into public.games (id, host_player_id, status, current_player_id, current_round, started_at)
  values (test_game_id, test_user_1, 'active', test_user_1, 1, now());

  -- Create game settings
  insert into public.game_settings (game_id, language, min_word_length, max_players, marks_to_eliminate, complete_move_timeout_seconds)
  values (test_game_id, 'sv', 3, 4, 3, 86400);

  -- Add players
  insert into public.game_players (id, game_id, player_id, player_token, marks, is_eliminated, join_order, joined_at)
  values
    (gen_random_uuid(), test_game_id, test_user_1, gen_random_uuid()::text, 0, false, 1, now()),
    (gen_random_uuid(), test_game_id, test_user_2, gen_random_uuid()::text, 0, false, 2, now());

  -- Create active round
  insert into public.rounds (
    id, game_id, round_number, starting_player_id, current_player_id,
    current_sequence, status, turn_deadline, started_at
  )
  values (
    test_round_id, test_game_id, 1, test_user_1, test_user_1,
    '', 'active', now() + interval '24 hours', now()
  );
end $$;

-- ============================================================================
-- VALIDATION TESTS
-- ============================================================================

-- Test 1: Valid ASCII letter
-- Set authentication context
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000001')::text, true);

prepare test_valid_ascii as
  select public.submit_letter(
    '10000000-0000-0000-0000-000000000001'::uuid,
    'A'
  );

select lives_ok(
  'test_valid_ascii',
  'Should accept valid ASCII letter (A)'
);

-- Verify the letter was added to sequence
select is(
  (select current_sequence from public.rounds where game_id = '10000000-0000-0000-0000-000000000001' and status = 'active'),
  'A',
  'Sequence should contain the submitted letter'
);

-- Test 2: Valid Swedish letter Ö
prepare test_valid_swedish_o as
  select public.submit_letter(
    '10000000-0000-0000-0000-000000000001'::uuid,
    'ö'
  );

-- Reset sequence for next test
update public.rounds set current_sequence = '', current_player_id = '00000000-0000-0000-0000-000000000001'
where game_id = '10000000-0000-0000-0000-000000000001';

select lives_ok(
  'test_valid_swedish_o',
  'Should accept Swedish letter (ö)'
);

-- Test 3: Valid Swedish letter Ä
prepare test_valid_swedish_a as
  select public.submit_letter(
    '10000000-0000-0000-0000-000000000001'::uuid,
    'ä'
  );

update public.rounds set current_sequence = '', current_player_id = '00000000-0000-0000-0000-000000000001'
where game_id = '10000000-0000-0000-0000-000000000001';

select lives_ok(
  'test_valid_swedish_a',
  'Should accept Swedish letter (ä)'
);

-- Test 4: Valid Swedish letter Å
prepare test_valid_swedish_aa as
  select public.submit_letter(
    '10000000-0000-0000-0000-000000000001'::uuid,
    'å'
  );

update public.rounds set current_sequence = '', current_player_id = '00000000-0000-0000-0000-000000000001'
where game_id = '10000000-0000-0000-0000-000000000001';

select lives_ok(
  'test_valid_swedish_aa',
  'Should accept Swedish letter (å)'
);

-- Test 5: Null input
-- Reset game state for validation tests
update public.rounds set current_sequence = '', current_player_id = '00000000-0000-0000-0000-000000000001'
where game_id = '10000000-0000-0000-0000-000000000001';

prepare test_null_input as
  select public.submit_letter(
    '10000000-0000-0000-0000-000000000001'::uuid,
    null
  );

select throws_ok(
  'test_null_input',
  'letter must be exactly one character',
  'Should reject null input'
);

-- Test 6: Empty string
prepare test_empty_string as
  select public.submit_letter(
    '10000000-0000-0000-0000-000000000001'::uuid,
    ''
  );

select throws_ok(
  'test_empty_string',
  'letter must be exactly one character',
  'Should reject empty string'
);

-- Test 7: Multiple characters
prepare test_multiple_chars as
  select public.submit_letter(
    '10000000-0000-0000-0000-000000000001'::uuid,
    'AB'
  );

select throws_ok(
  'test_multiple_chars',
  'letter must be exactly one character',
  'Should reject multiple characters'
);

-- Test 8: Number (should be blocked)
prepare test_number as
  select public.submit_letter(
    '10000000-0000-0000-0000-000000000001'::uuid,
    '5'
  );

select throws_ok(
  'test_number',
  'letter must be an alphabetic character',
  'Should reject numbers'
);

-- ============================================================================
-- AUTHORIZATION TESTS
-- ============================================================================

-- Test 9: Not current player's turn
-- Reset game state to ensure player 1 is current
update public.rounds set current_player_id = '00000000-0000-0000-0000-000000000001'
where game_id = '10000000-0000-0000-0000-000000000001';

-- Switch to player 2 (not their turn)
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000002')::text, true);

prepare test_wrong_turn as
  select public.submit_letter(
    '10000000-0000-0000-0000-000000000001'::uuid,
    'B'
  );

select throws_ok(
  'test_wrong_turn',
  'not your turn',
  'Should reject when not current player''s turn'
);

-- Test 10: Not a player in the game
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000003')::text, true);

prepare test_not_player as
  select public.submit_letter(
    '10000000-0000-0000-0000-000000000001'::uuid,
    'B'
  );

select throws_ok(
  'test_not_player',
  'access denied: not a player in this game',
  'Should reject when user is not a player in the game'
);

-- Test 11: Not authenticated
select set_config('request.jwt.claims', null, true);

prepare test_not_authenticated as
  select public.submit_letter(
    '10000000-0000-0000-0000-000000000001'::uuid,
    'B'
  );

select throws_ok(
  'test_not_authenticated',
  'authentication required',
  'Should reject when user is not authenticated'
);

-- ============================================================================
-- GAME STATE TESTS
-- ============================================================================

-- Test 12: Game not active (pending)
do $$
declare
  pending_game_id uuid := '10000000-0000-0000-0000-000000000002';
  test_user_1 uuid := '00000000-0000-0000-0000-000000000001';
begin
  -- Create pending game
  insert into public.games (id, host_player_id, status, invite_token)
  values (pending_game_id, test_user_1, 'pending', gen_random_uuid()::text);

  insert into public.game_settings (game_id)
  values (pending_game_id);

  insert into public.game_players (id, game_id, player_id, player_token, join_order)
  values (gen_random_uuid(), pending_game_id, test_user_1, gen_random_uuid()::text, 1);
end $$;

select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000001')::text, true);

prepare test_pending_game as
  select public.submit_letter(
    '10000000-0000-0000-0000-000000000002'::uuid,
    'A'
  );

select throws_like(
  'test_pending_game',
  '%game is not active%',
  'Should reject when game is not active'
);

-- Test 13: Game completed
do $$
declare
  completed_game_id uuid := '10000000-0000-0000-0000-000000000003';
  test_user_1 uuid := '00000000-0000-0000-0000-000000000001';
begin
  -- Create completed game
  insert into public.games (id, host_player_id, status, completed_at)
  values (completed_game_id, test_user_1, 'completed', now());

  insert into public.game_settings (game_id)
  values (completed_game_id);

  insert into public.game_players (id, game_id, player_id, player_token, join_order)
  values (gen_random_uuid(), completed_game_id, test_user_1, gen_random_uuid()::text, 1);
end $$;

prepare test_completed_game as
  select public.submit_letter(
    '10000000-0000-0000-0000-000000000003'::uuid,
    'A'
  );

select throws_like(
  'test_completed_game',
  '%game is not active%',
  'Should reject when game is completed'
);

-- ============================================================================
-- SEQUENCE & TURN PROGRESSION TESTS
-- ============================================================================

-- Test 14: Sequence builds correctly
update public.rounds set current_sequence = 'TEST', current_player_id = '00000000-0000-0000-0000-000000000001'
where game_id = '10000000-0000-0000-0000-000000000001';

select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000001')::text, true);

prepare test_sequence_build as
  select public.submit_letter(
    '10000000-0000-0000-0000-000000000001'::uuid,
    'X'
  );

select lives_ok(
  'test_sequence_build',
  'Should build sequence correctly'
);

select is(
  (select current_sequence from public.rounds where game_id = '10000000-0000-0000-0000-000000000001' and status = 'active'),
  'TESTX',
  'Sequence should contain previous letters plus new letter'
);

-- Test 15: Turn progresses to next player
select is(
  (select current_player_id from public.rounds where game_id = '10000000-0000-0000-0000-000000000001' and status = 'active'),
  '00000000-0000-0000-0000-000000000002'::uuid,
  'Current player should switch to next player after move'
);

-- Test 16: Sequence length limit (45 characters)
update public.rounds set current_sequence = repeat('A', 45), current_player_id = '00000000-0000-0000-0000-000000000001'
where game_id = '10000000-0000-0000-0000-000000000001';

select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000001')::text, true);

prepare test_sequence_limit as
  select public.submit_letter(
    '10000000-0000-0000-0000-000000000001'::uuid,
    'Z'
  );

select throws_ok(
  'test_sequence_limit',
  'sequence cannot exceed 45 characters',
  'Should reject when sequence would exceed 45 characters'
);

-- ============================================================================
-- CLEANUP & FINISH
-- ============================================================================

select * from finish();
rollback;

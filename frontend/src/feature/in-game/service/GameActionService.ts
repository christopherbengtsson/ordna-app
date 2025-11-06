import { supabaseClient } from '@/lib/supabase/client/supabaseClient';
import type { Database } from '@/common/model/generated/Database';
import { TurnResultMapper } from '../../turn-result/mapper/TurnResultMapper';

const submitLetter = async (
  args: Database['public']['Functions']['submit_letter']['Args'],
) => {
  const { data } = await supabaseClient
    .rpc('submit_letter', args)
    .throwOnError();

  return TurnResultMapper.fromRpc(data);
};

const callWord = async (
  args: Database['public']['Functions']['call_word']['Args'],
) => {
  const { data } = await supabaseClient.rpc('call_word', args).throwOnError();

  return TurnResultMapper.fromRpc(data);
};

const callBluff = async (
  args: Database['public']['Functions']['call_bluff']['Args'],
) => {
  const { data } = await supabaseClient.rpc('call_bluff', args).throwOnError();

  return TurnResultMapper.fromRpc(data);
};

const resolveBluff = async (
  args: Database['public']['Functions']['resolve_bluff']['Args'],
) => {
  const { data } = await supabaseClient
    .rpc('resolve_bluff', args)
    .throwOnError();

  return TurnResultMapper.fromRpc(data);
};

const fold = async (args: Database['public']['Functions']['fold']['Args']) => {
  const { data } = await supabaseClient.rpc('fold', args).throwOnError();

  return TurnResultMapper.fromRpc(data);
};

const callMoveTimeout = async (
  args: Database['public']['Functions']['call_in_game_timeout']['Args'],
) => {
  const { data } = await supabaseClient
    .rpc('call_in_game_timeout', args)
    .throwOnError();

  return TurnResultMapper.fromRpc(data);
};

export const GameActionService = {
  submitLetter,
  callWord,
  callBluff,
  resolveBluff,
  fold,
  callMoveTimeout,
};

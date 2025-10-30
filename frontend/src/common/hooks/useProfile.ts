import { useQuery } from '@tanstack/react-query';
import { QUERY_KEY } from '../util/constant/queryKey';
import { supabaseClient } from '../../lib/supabase/client/supabaseClient';

const ONE_HOUR_MS = 3_600_000;

const getProfile = async () => {
  const { data } = await supabaseClient
    .from('profiles')
    .select('*')
    .single()
    .throwOnError();

  return data;
};

export const useProfile = (userId: string | undefined) => {
  const { data } = useQuery({
    queryFn: getProfile,
    queryKey: [QUERY_KEY.PROFILE(userId ?? '')],
    enabled: !!userId,
    staleTime: ONE_HOUR_MS,
  });

  return {
    profile: data,
  };
};

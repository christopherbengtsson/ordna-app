import { useQuery } from '@tanstack/react-query';
import { supabaseClient } from '@/lib/supabase/client/supabaseClient';
import { FetchUtil } from '../util/constant/FetchUtil';

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
    queryKey: [FetchUtil.QUERY_KEY.PROFILE(userId ?? '')],
    enabled: !!userId,
    staleTime: ONE_HOUR_MS,
  });

  return {
    profile: data,
  };
};

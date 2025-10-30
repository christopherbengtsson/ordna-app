import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../../common/model/generated/Database';

// TODO: type client from db
export const supabaseClient = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

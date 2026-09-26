import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://uyrcahtnftskxiowpime.supabase.co';

const supabaseKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_umKvgwurcfZLVEae5x-Dow_VX86EHpi';

declare global {
  // eslint-disable-next-line no-var
  var __SUPABASE_CLIENT__: SupabaseClient | undefined;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseKey);
}

export function getSupabaseClient(): SupabaseClient {
  if (!globalThis.__SUPABASE_CLIENT__) {
    globalThis.__SUPABASE_CLIENT__ = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return globalThis.__SUPABASE_CLIENT__;
}

export const supabase = getSupabaseClient();

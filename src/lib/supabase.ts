import { createClient } from "@supabase/supabase-js";

const env = import.meta.env;
const url = env["VITE_SUPABASE_URL"] as string | undefined;
const anonKey = (env["VITE_SUPABASE_ANON_KEY"] ??
  env["VITE_SUPABASE_PUBLISHABLE_KEY"]) as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

const browser = typeof window !== "undefined";

export const supabase = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: {
        persistSession: browser,
        autoRefreshToken: browser,
        detectSessionInUrl: browser,
        flowType: "pkce",
      },
    })
  : null;

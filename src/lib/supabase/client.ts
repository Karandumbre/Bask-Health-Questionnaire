import { requireSupabaseConfig } from "./config";
import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a browser-side Supabase client for client components.
 * Public keys only - safe for client-side usage.
 */
export function createClient() {
  const { url: supabaseUrl, key: supabaseKey } = requireSupabaseConfig();

  return createBrowserClient(supabaseUrl, supabaseKey);
}

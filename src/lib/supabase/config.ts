import { APP_MESSAGES } from "@/lib/constants/messages";
import { getPublicSupabaseConfig } from "../../../config/environment.mjs";
export const getSupabaseConfig = getPublicSupabaseConfig;

export function requireSupabaseConfig() {
  const config = getSupabaseConfig();
  if (!config)
    throw new Error(APP_MESSAGES.SUPABASE_PUBLIC_URL_AND_KEY_ARE_REQUIRED);
  return config;
}

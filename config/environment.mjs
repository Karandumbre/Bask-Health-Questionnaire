import {
  CONFIGURATION_MESSAGES,
  ENVIRONMENT_DEFAULTS,
  ENVIRONMENT_KEYS,
  ENVIRONMENT_NAMES,
  ENVIRONMENT_VALUES,
} from "./constants.mjs";
export {
  ENVIRONMENT_KEYS,
  ENVIRONMENT_NAMES,
  ENVIRONMENT_VALUES,
  ENVIRONMENT_DEFAULTS,
} from "./constants.mjs";
/** Environment names live here. Read lazily so test overrides and runtime changes work. */

/** @param {keyof typeof ENVIRONMENT_NAMES} key */
export function readEnvironment(key) {
  if (typeof window !== "undefined")
    throw new Error(CONFIGURATION_MESSAGES.PRIVATE_ENVIRONMENT);
  if (key === ENVIRONMENT_KEYS.DATABASE_DIRECT_URL) {
    return process.env[ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.DATABASE_DIRECT_URL]];
  }
  return process.env[ENVIRONMENT_NAMES[key]];
}
export function getDatabaseConfig() {
  const url =
    readEnvironment(ENVIRONMENT_KEYS.DATABASE_URL) ||
    ENVIRONMENT_DEFAULTS.EMPTY;
  return {
    url,
    directUrl: readEnvironment(ENVIRONMENT_KEYS.DATABASE_DIRECT_URL) || url,
  };
}
export function getRuntimeConfig() {
  return {
    nodeEnv:
      readEnvironment(ENVIRONMENT_KEYS.NODE_ENV) || ENVIRONMENT_DEFAULTS.EMPTY,
    appEnv:
      readEnvironment(ENVIRONMENT_KEYS.APP_ENV) || ENVIRONMENT_DEFAULTS.EMPTY,
    vercelEnv:
      readEnvironment(ENVIRONMENT_KEYS.VERCEL_ENV) ||
      ENVIRONMENT_DEFAULTS.EMPTY,
    isProduction:
      readEnvironment(ENVIRONMENT_KEYS.NODE_ENV) ===
      ENVIRONMENT_VALUES.PRODUCTION,
    isCi: Boolean(readEnvironment(ENVIRONMENT_KEYS.CI)),
    playwrightBaseUrl:
      readEnvironment(ENVIRONMENT_KEYS.PLAYWRIGHT_BASE_URL) ||
      ENVIRONMENT_DEFAULTS.PLAYWRIGHT_BASE_URL,
  };
}
/** Next.js requires literal public references for build-time browser replacement. */
export function getPublicSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
}

import {
  readEnvironment,
  ENVIRONMENT_DEFAULTS,
  ENVIRONMENT_KEYS,
  ENVIRONMENT_VALUES,
} from "@/lib/config/environment";
import "server-only";

/**
 * Explicit test project / database allowlist.
 * Prevents automated integration or destructive tests from accidentally
 * executing against a shared development, staging, or production database.
 */
export const APPROVED_TEST_PROJECT_REFS = Object.freeze([
  "vjstbqhzfnwrkksgavfv", // Bask Health designated disposable test project
]);

export const APPROVED_TEST_HOSTS = Object.freeze([
  "localhost",
  "127.0.0.1",
  "::1",
]);

/**
 * Extracts the Supabase project reference or hostname from a PostgreSQL connection string.
 */
export function extractDatabaseIdentity(dbUrl: string): {
  projectRef: string | null;
  host: string;
  isLocal: boolean;
} {
  try {
    const parsed = new URL(dbUrl);
    const host = parsed.hostname.toLowerCase();
    const isLocal =
      APPROVED_TEST_HOSTS.includes(host) ||
      host.endsWith(".local") ||
      host === "postgres";

    // Supabase pooler username format: postgres.<project-ref>
    let projectRef: string | null = null;
    const username = decodeURIComponent(parsed.username || "");
    if (username.startsWith("postgres.")) {
      projectRef = username.slice("postgres.".length);
    } else if (host.endsWith(".supabase.co")) {
      projectRef = host.split(".")[0] || null;
    }

    return { projectRef, host, isLocal };
  } catch {
    return { projectRef: null, host: "unknown", isLocal: false };
  }
}

/**
 * Checks whether a database URL belongs to the approved disposable test allowlist.
 */
export function isDatabaseAllowlistedForTesting(dbUrl?: string): boolean {
  const url =
    dbUrl ||
    readEnvironment(ENVIRONMENT_KEYS.DATABASE_URL) ||
    ENVIRONMENT_DEFAULTS.EMPTY;
  if (!url) return false;

  const { projectRef, isLocal } = extractDatabaseIdentity(url);

  // 1. Local loopback databases are permitted for testing
  if (isLocal) return true;

  // 2. Explicit project allowlist
  if (projectRef && APPROVED_TEST_PROJECT_REFS.includes(projectRef)) {
    return true;
  }

  return false;
}

/**
 * Asserts that the current runtime environment and database target are positively
 * verified as disposable testing targets. Throws a fatal safety abort if violated.
 */
export function assertTestDatabaseIsolation(dbUrl?: string): {
  projectRef: string | null;
  host: string;
} {
  // Guard 1: Must explicitly opt-in with IS_TEST_DATABASE=true
  if (
    readEnvironment(ENVIRONMENT_KEYS.IS_TEST_DATABASE) !==
    ENVIRONMENT_VALUES.ENABLED
  ) {
    throw new Error(
      "CRITICAL SAFETY ABORT: Integration tests require IS_TEST_DATABASE=true. Never run destructive tests without explicit confirmation.",
    );
  }

  // Guard 2: Prohibited in production application environments
  const appEnv = (
    readEnvironment(ENVIRONMENT_KEYS.APP_ENV) ||
    readEnvironment(ENVIRONMENT_KEYS.NODE_ENV) ||
    ENVIRONMENT_DEFAULTS.EMPTY
  ).toLowerCase();
  if (
    appEnv === ENVIRONMENT_VALUES.PRODUCTION ||
    appEnv === ENVIRONMENT_VALUES.PRODUCTION_ALIAS
  ) {
    throw new Error(
      "CRITICAL SAFETY ABORT: Destructive test execution is strictly forbidden against production environments!",
    );
  }

  // Guard 3: Prohibited on Vercel deployments
  if (
    readEnvironment(ENVIRONMENT_KEYS.VERCEL) ===
      ENVIRONMENT_VALUES.VERCEL_ENABLED ||
    Boolean(readEnvironment(ENVIRONMENT_KEYS.VERCEL_ENV))
  ) {
    throw new Error(
      "CRITICAL SAFETY ABORT: Destructive test execution is prohibited on Vercel deployments!",
    );
  }

  // Guard 4: Explicit database allowlist check
  const url =
    dbUrl ||
    readEnvironment(ENVIRONMENT_KEYS.DATABASE_URL) ||
    ENVIRONMENT_DEFAULTS.EMPTY;
  const identity = extractDatabaseIdentity(url);

  if (!isDatabaseAllowlistedForTesting(url)) {
    throw new Error(
      `CRITICAL SAFETY ABORT: Database target (host: "${identity.host}", project: "${identity.projectRef ?? "none"}") is NOT in the approved disposable test database allowlist! Refusing to run tests.`,
    );
  }

  return identity;
}

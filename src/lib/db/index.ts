import { APP_MESSAGES } from "@/lib/constants/messages";
import {
  readEnvironment,
  ENVIRONMENT_DEFAULTS,
  ENVIRONMENT_KEYS,
  ENVIRONMENT_VALUES,
} from "@/lib/config/environment";
import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Global cache for connection pooling across hot-reloads in development
 * and serverless function invocations.
 */
declare global {
  var __postgresClient: postgres.Sql | undefined;
  var __drizzleDb: ReturnType<typeof drizzle<typeof schema>> | undefined;
}

const connectionString =
  readEnvironment(ENVIRONMENT_KEYS.DATABASE_URL) || ENVIRONMENT_DEFAULTS.EMPTY;

if (
  !connectionString &&
  readEnvironment(ENVIRONMENT_KEYS.NODE_ENV) !== ENVIRONMENT_VALUES.TEST
) {
  throw new Error(APP_MESSAGES.DATABASE_URL_ENVIRONMENT_VARIABLE_IS_MISSING);
}

/**
 * Serverless-optimized PostgreSQL client configuration:
 * - prepare: false is mandatory for Supabase Supavisor / PgBouncer transaction mode (port 6543)
 * - idle_timeout prevents stale pooled connections
 * - max: small pool size prevents database connection starvation in serverless environments
 */
function createPooledClient(): postgres.Sql {
  return postgres(connectionString, {
    prepare: false, // Required for transaction pooler mode
    max:
      readEnvironment(ENVIRONMENT_KEYS.NODE_ENV) ===
      ENVIRONMENT_VALUES.PRODUCTION
        ? 10
        : 3,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
    connect_timeout: 10,
  });
}

const client: postgres.Sql =
  globalThis.__postgresClient ??
  (globalThis.__postgresClient = createPooledClient());

export const db =
  globalThis.__drizzleDb ??
  (globalThis.__drizzleDb = drizzle(client, { schema }));

/**
 * Creates a dedicated direct/session-pooler client for DDL, migrations,
 * or long-running transactional operations that require session-level state.
 */
export function getDirectClient(): postgres.Sql {
  const directUrl =
    readEnvironment(ENVIRONMENT_KEYS.DIRECT_DATABASE_URL) ||
    readEnvironment(ENVIRONMENT_KEYS.DATABASE_URL) ||
    ENVIRONMENT_DEFAULTS.EMPTY;
  if (!directUrl) {
    throw new Error(
      APP_MESSAGES.DATABASE_DIRECT_URL_AND_DATABASE_URL_ARE_BOTH_MISSING,
    );
  }
  return postgres(directUrl, {
    max: 1,
    idle_timeout: 10,
    connect_timeout: 10,
  });
}

export type Database = typeof db;

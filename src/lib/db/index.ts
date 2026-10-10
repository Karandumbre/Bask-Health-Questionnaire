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

const connectionString = process.env.DATABASE_URL || "";

if (!connectionString && process.env.NODE_ENV !== "test") {
  throw new Error("DATABASE_URL environment variable is missing.");
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
    max: process.env.NODE_ENV === "production" ? 10 : 3,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
    connect_timeout: 10,
  });
}

export const client: postgres.Sql =
  globalThis.__postgresClient ?? (globalThis.__postgresClient = createPooledClient());

export const db =
  globalThis.__drizzleDb ?? (globalThis.__drizzleDb = drizzle(client, { schema }));

/**
 * Creates a dedicated direct/session-pooler client for DDL, migrations,
 * or long-running transactional operations that require session-level state.
 */
export function getDirectClient(): postgres.Sql {
  const directUrl =
    process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL || "";
  if (!directUrl) {
    throw new Error("DATABASE_DIRECT_URL and DATABASE_URL are both missing.");
  }
  return postgres(directUrl, {
    max: 1,
    idle_timeout: 10,
    connect_timeout: 10,
  });
}

export { schema };
export type Database = typeof db;

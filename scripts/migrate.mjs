import { readEnvironment, ENVIRONMENT_KEYS } from "../config/environment.mjs";
import postgres from "postgres";
import { loadLocalEnv } from "./lib/load-env.mjs";
import { runMigrationEngine } from "./lib/migration-engine.mjs";

loadLocalEnv();
const url =
  readEnvironment(ENVIRONMENT_KEYS.DIRECT_DATABASE_URL) ||
  readEnvironment(ENVIRONMENT_KEYS.DATABASE_URL);
if (!url) throw new Error("DATABASE_DIRECT_URL or DATABASE_URL is required.");
try {
  const result = await runMigrationEngine(
    postgres(url, { max: 1, idle_timeout: 10, connect_timeout: 10 }),
  );
  console.log(
    `Migrations complete: ${result.applied.length} applied, ${result.skipped.length} skipped.`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : "Migration failed.");
  process.exitCode = 1;
}

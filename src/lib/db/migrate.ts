import "server-only";
import { getDirectClient } from "./index";
import { runMigrationEngine } from "../../../scripts/lib/migration-engine.mjs";

export function runMigrations() {
  return runMigrationEngine(getDirectClient());
}

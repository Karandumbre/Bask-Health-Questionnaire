import {
  readEnvironment,
  ENVIRONMENT_DEFAULTS,
  ENVIRONMENT_KEYS,
} from "./config/environment.mjs";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url:
      readEnvironment(ENVIRONMENT_KEYS.DIRECT_DATABASE_URL) ||
      readEnvironment(ENVIRONMENT_KEYS.DATABASE_URL) ||
      ENVIRONMENT_DEFAULTS.EMPTY,
  },
});

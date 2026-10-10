import { existsSync } from "node:fs";
import { resolve } from "node:path";

/** Node 22's dotenv parser preserves environment variables already set by CI. */
export function loadLocalEnv() {
  for (const name of [".env.local", ".env"]) {
    const path = resolve(process.cwd(), name);
    if (existsSync(path)) process.loadEnvFile(path);
  }
}

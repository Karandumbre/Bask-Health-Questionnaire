import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import postgres from "postgres";

// Load environment variables from .env.local or .env
function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const envPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const idx = trimmed.indexOf("=");
          if (idx !== -1) {
            const key = trimmed.slice(0, idx).trim();
            const val = trimmed.slice(idx + 1).trim();
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      }
    }
  }
}

loadEnv();

const directUrl = process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL;
if (!directUrl) {
  console.error("Error: DATABASE_DIRECT_URL and DATABASE_URL are not set.");
  process.exit(1);
}

// Extract target host safely for logging without leaking credentials
let sanitizedHost = "unknown";
let sanitizedDb = "unknown";
try {
  const parsed = new URL(directUrl);
  sanitizedHost = `${parsed.hostname}:${parsed.port || 5432}`;
  sanitizedDb = parsed.pathname.replace(/^\//, "");
} catch {
  // Ignore URL parse errors
}

// Advisory lock ID to prevent concurrent migration execution
const MIGRATION_ADVISORY_LOCK_ID = 8493021;

async function main() {
  console.log(
    `Connecting to database at ${sanitizedHost} (db: ${sanitizedDb})...`,
  );
  const sql = postgres(directUrl, { max: 1, idle_timeout: 10 });

  try {
    // 1. Acquire PostgreSQL session-level advisory lock
    console.log("Acquiring migration advisory lock...");
    await sql`SELECT pg_advisory_lock(${MIGRATION_ADVISORY_LOCK_ID});`;

    // 2. Ensure migrations tracking table exists with checksum column
    await sql`
      CREATE TABLE IF NOT EXISTS "_schema_migrations" (
        "id" SERIAL PRIMARY KEY,
        "name" TEXT NOT NULL UNIQUE,
        "checksum" TEXT,
        "applied_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    await sql`
      ALTER TABLE "_schema_migrations" ADD COLUMN IF NOT EXISTS "checksum" TEXT;
    `;

    // 3. Fetch existing migration records
    const existing =
      await sql`SELECT "name", "checksum" FROM "_schema_migrations";`;
    const existingMap = new Map(existing.map((r) => [r.name, r.checksum]));

    const migrationsDir = path.resolve(process.cwd(), "db/migrations");
    if (!fs.existsSync(migrationsDir)) {
      console.log("No db/migrations directory found.");
      return;
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    let appliedCount = 0;
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sqlContent = fs.readFileSync(filePath, "utf8");
      const currentChecksum = crypto
        .createHash("sha256")
        .update(sqlContent)
        .digest("hex");

      if (existingMap.has(file)) {
        const storedChecksum = existingMap.get(file);
        if (storedChecksum && storedChecksum !== currentChecksum) {
          throw new Error(
            `Migration integrity error: Checksum mismatch for already applied migration "${file}". ` +
              `Stored: ${storedChecksum}, Current: ${currentChecksum}. ` +
              `Migrations must be append-only and never modified after deployment.`,
          );
        } else if (!storedChecksum) {
          // Backfill checksum for migrations applied prior to checksum tracking
          await sql`UPDATE "_schema_migrations" SET "checksum" = ${currentChecksum} WHERE "name" = ${file};`;
        }

        console.log(`[SKIPPED] ${file} (already applied, checksum verified)`);
        continue;
      }

      console.log(
        `[APPLYING] ${file} (checksum: ${currentChecksum.slice(0, 8)}...)...`,
      );

      // Transactional migration application
      await sql.begin(async (tx) => {
        await tx.unsafe(sqlContent);
        await tx`
          INSERT INTO "_schema_migrations" ("name", "checksum") 
          VALUES (${file}, ${currentChecksum});
        `;
      });

      console.log(`[APPLIED] ${file} successfully.`);
      appliedCount++;
    }

    console.log(
      `Migration execution completed. ${appliedCount} new migration(s) applied.`,
    );
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    try {
      await sql`SELECT pg_advisory_unlock(${MIGRATION_ADVISORY_LOCK_ID});`;
    } catch {
      // Ignore unlock error on connection teardown
    }
    await sql.end();
  }
}

main();

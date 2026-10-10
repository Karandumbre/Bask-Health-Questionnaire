import "server-only";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { getDirectClient } from "./index";

const MIGRATION_ADVISORY_LOCK_ID = 8493021;

/**
 * Programmatic migration runner that executes SQL migration files in sequence
 * against the direct database / session pooler connection and tracks applied migrations
 * with SHA-256 checksums and session-level advisory locks.
 */
export async function runMigrations(): Promise<{ applied: string[]; skipped: string[] }> {
  const sql = getDirectClient();
  const applied: string[] = [];
  const skipped: string[] = [];

  try {
    // 1. Acquire advisory lock
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

    // 3. Fetch already applied migrations
    const existing = await sql<{ name: string; checksum: string | null }[]>`
      SELECT "name", "checksum" FROM "_schema_migrations";
    `;
    const existingMap = new Map(existing.map((row) => [row.name, row.checksum]));

    // 4. Locate migration files
    const migrationsDir = path.resolve(process.cwd(), "db/migrations");
    if (!fs.existsSync(migrationsDir)) {
      return { applied, skipped };
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    // 5. Apply each unapplied migration inside a transaction
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sqlContent = fs.readFileSync(filePath, "utf8");
      const currentChecksum = crypto.createHash("sha256").update(sqlContent).digest("hex");

      if (existingMap.has(file)) {
        const storedChecksum = existingMap.get(file);
        if (storedChecksum && storedChecksum !== currentChecksum) {
          throw new Error(
            `Migration checksum mismatch for "${file}". Stored: ${storedChecksum}, Current: ${currentChecksum}.`
          );
        } else if (!storedChecksum) {
          await sql`UPDATE "_schema_migrations" SET "checksum" = ${currentChecksum} WHERE "name" = ${file};`;
        }

        skipped.push(file);
        continue;
      }

      await sql.begin(async (tx) => {
        await tx.unsafe(sqlContent);
        await tx`
          INSERT INTO "_schema_migrations" ("name", "checksum") 
          VALUES (${file}, ${currentChecksum});
        `;
      });

      applied.push(file);
    }

    return { applied, skipped };
  } finally {
    try {
      await sql`SELECT pg_advisory_unlock(${MIGRATION_ADVISORY_LOCK_ID});`;
    } catch {
      // Ignore unlock failure on connection end
    }
    await sql.end();
  }
}

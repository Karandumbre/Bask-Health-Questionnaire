import "server-only";
import fs from "node:fs";
import path from "node:path";
import { getDirectClient } from "./index";

/**
 * Migration runner that executes SQL migration files in sequence
 * against the direct database / session pooler connection and tracks applied migrations.
 */
export async function runMigrations(): Promise<{ applied: string[]; skipped: string[] }> {
  const sql = getDirectClient();
  const applied: string[] = [];
  const skipped: string[] = [];

  try {
    // 1. Ensure migrations tracking table exists
    await sql`
      CREATE TABLE IF NOT EXISTS "_schema_migrations" (
        "id" SERIAL PRIMARY KEY,
        "name" TEXT NOT NULL UNIQUE,
        "applied_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    // 2. Fetch already applied migrations
    const existing = await sql<{ name: string }[]>`
      SELECT "name" FROM "_schema_migrations";
    `;
    const appliedSet = new Set(existing.map((row) => row.name));

    // 3. Locate migration files
    const migrationsDir = path.resolve(process.cwd(), "db/migrations");
    if (!fs.existsSync(migrationsDir)) {
      return { applied, skipped };
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    // 4. Apply each unapplied migration inside a transaction
    for (const file of files) {
      if (appliedSet.has(file)) {
        skipped.push(file);
        continue;
      }

      const filePath = path.join(migrationsDir, file);
      const sqlContent = fs.readFileSync(filePath, "utf8");

      await sql.begin(async (tx) => {
        await tx.unsafe(sqlContent);
        await tx`
          INSERT INTO "_schema_migrations" ("name") VALUES (${file});
        `;
      });

      applied.push(file);
    }

    return { applied, skipped };
  } finally {
    await sql.end();
  }
}


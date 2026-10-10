import fs from "node:fs";
import path from "node:path";
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

async function main() {
  console.log("Connecting to database for migrations...");
  const sql = postgres(directUrl, { max: 1, idle_timeout: 10 });

  try {
    // 1. Ensure migrations tracking table
    await sql`
      CREATE TABLE IF NOT EXISTS "_schema_migrations" (
        "id" SERIAL PRIMARY KEY,
        "name" TEXT NOT NULL UNIQUE,
        "applied_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    const existing = await sql`SELECT "name" FROM "_schema_migrations";`;
    const appliedSet = new Set(existing.map((r) => r.name));

    const migrationsDir = path.resolve(process.cwd(), "db/migrations");
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    let appliedCount = 0;
    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`[SKIPPED] ${file} (already applied)`);
        continue;
      }

      console.log(`[APPLYING] ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sqlContent = fs.readFileSync(filePath, "utf8");

      await sql.begin(async (tx) => {
        await tx.unsafe(sqlContent);
        await tx`INSERT INTO "_schema_migrations" ("name") VALUES (${file});`;
      });

      console.log(`[APPLIED] ${file} successfully.`);
      appliedCount++;
    }

    console.log(`Migration complete. ${appliedCount} migration(s) applied.`);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();


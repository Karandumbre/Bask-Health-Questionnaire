import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

describe("Database Privacy & RLS Migration (0002)", () => {
  const migrationPath = resolve(
    process.cwd(),
    "db/migrations/0002_enable_rls_and_revoke_grants.sql",
  );

  it("exists in the db/migrations directory", () => {
    expect(existsSync(migrationPath)).toBe(true);
  });

  it("enables default-deny row-level security on all clinical and administrative tables", () => {
    const sql = readFileSync(migrationPath, "utf-8");

    const requiredTables = [
      "workspaces",
      "admin_memberships",
      "forms",
      "form_drafts",
      "published_versions",
      "publication_operations",
      "patient_sessions",
      "submissions",
      "audit_events",
    ];

    for (const table of requiredTables) {
      const rlsRegex = new RegExp(
        `ALTER TABLE (?:IF EXISTS )?"${table}" ENABLE ROW LEVEL SECURITY;`,
        "i",
      );
      expect(sql).toMatch(rlsRegex);
    }
  });

  it("revokes all permissions from anon and authenticated roles", () => {
    const sql = readFileSync(migrationPath, "utf-8");

    // Anon revocation
    expect(sql).toMatch(/REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;/i);
    expect(sql).toMatch(/REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;/i);
    expect(sql).toMatch(/REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon;/i);

    // Authenticated revocation
    expect(sql).toMatch(
      /REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;/i,
    );
    expect(sql).toMatch(
      /REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;/i,
    );
    expect(sql).toMatch(
      /REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM authenticated;/i,
    );
  });
});

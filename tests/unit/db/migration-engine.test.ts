import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import type { Sql } from "postgres";
import { runMigrationEngine } from "../../../scripts/lib/migration-engine.mjs";

const folders: string[] = [];
function fixture(
  existing: Array<{ name: string; checksum: string | null }> = [],
) {
  const root = mkdtempSync(join(tmpdir(), "bask-migrations-"));
  folders.push(root);
  const directory = join(root, "db", "migrations");
  mkdirSync(directory, { recursive: true });
  vi.spyOn(process, "cwd").mockReturnValue(root);
  const unsafe = vi.fn(async () => []);
  const end = vi.fn(async () => {});
  const query = vi.fn(async (parts: TemplateStringsArray) =>
    parts.join("").includes('SELECT "name", "checksum"') ? existing : [],
  );
  const tx = Object.assign(query, { unsafe });
  const begin = vi.fn(async (callback: (sql: Sql) => Promise<void>) =>
    callback(tx as unknown as Sql),
  );
  const sql = Object.assign(query, { begin, unsafe, end }) as unknown as Sql;
  return { directory, sql, query, begin, unsafe, end };
}

describe("Shared migration engine", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    folders
      .splice(0)
      .forEach((folder) => rmSync(folder, { recursive: true, force: true }));
  });
  it("applies migrations in filename order through transactions and closes the client", async () => {
    const f = fixture();
    writeFileSync(join(f.directory, "0002.sql"), "SELECT 2;");
    writeFileSync(join(f.directory, "0001.sql"), "SELECT 1;");
    expect(await runMigrationEngine(f.sql)).toEqual({
      applied: ["0001.sql", "0002.sql"],
      skipped: [],
    });
    expect(f.begin).toHaveBeenCalledTimes(2);
    expect(f.unsafe.mock.calls).toEqual([["SELECT 1;"], ["SELECT 2;"]]);
    expect(f.end).toHaveBeenCalledOnce();
  });
  it("skips an already applied migration with the same checksum", async () => {
    const text = "SELECT 1;";
    const f = fixture([
      {
        name: "0001.sql",
        checksum: createHash("sha256").update(text).digest("hex"),
      },
    ]);
    writeFileSync(join(f.directory, "0001.sql"), text);
    expect(await runMigrationEngine(f.sql)).toEqual({
      applied: [],
      skipped: ["0001.sql"],
    });
    expect(f.unsafe).not.toHaveBeenCalled();
  });
  it("rejects a changed migration before executing it and still closes the client", async () => {
    const f = fixture([{ name: "0001.sql", checksum: "old-checksum" }]);
    writeFileSync(join(f.directory, "0001.sql"), "SELECT 2;");
    await expect(runMigrationEngine(f.sql)).rejects.toThrow(
      "checksum mismatch",
    );
    expect(f.unsafe).not.toHaveBeenCalled();
    expect(f.end).toHaveBeenCalledOnce();
  });
});

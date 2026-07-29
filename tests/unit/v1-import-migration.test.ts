import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260729_003_v1_snapshot_import.sql",
  ),
  "utf8",
).toLowerCase();

describe("v0.1 snapshot import transaction", () => {
  it("runs the complete import inside one authenticated transaction", () => {
    expect(migration).toContain("begin;");
    expect(migration).toContain("security invoker");
    expect(migration).toContain("auth.uid()");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("grant execute on function");
    expect(migration).toContain("to authenticated");
    expect(migration).toContain("from public, anon");
  });

  it("checks for a previous success before inserting any business rows", () => {
    const successCheck = migration.indexOf("v_existing_summary");
    const projectInsert = migration.indexOf("insert into public.projects");
    expect(successCheck).toBeGreaterThan(-1);
    expect(projectInsert).toBeGreaterThan(successCheck);
    expect(migration).toContain("'alreadyimported', true");
  });

  it("records running and success states and creates conflict copies", () => {
    expect(migration).toContain("'running'");
    expect(migration).toContain("set status = 'success'");
    expect(migration).toContain("gen_random_uuid()");
    expect(migration).toContain("'conflictcopies'");
  });
});

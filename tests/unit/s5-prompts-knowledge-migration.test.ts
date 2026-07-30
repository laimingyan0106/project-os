import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260730_004_prompts_knowledge.sql",
  ),
  "utf8",
).toLowerCase();

describe("S5 Prompt and Knowledge migration", () => {
  it("publishes Prompt versions transactionally with an account-scoped lock", () => {
    expect(migration).toContain("publish_prompt_version");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("max(version)");
    expect(migration).toContain("set current_version_id = v_version.id");
  });

  it("does not grant update or delete access to historical versions", () => {
    expect(migration).toContain(
      "revoke update, delete on table public.prompt_versions",
    );
    expect(migration).not.toContain(
      'create policy "update own rows" on public.prompt_versions',
    );
  });

  it("uses authenticated RLS and indexed substring search", () => {
    expect(migration).toContain("to authenticated");
    expect(migration).toContain("(select auth.uid()) = user_id");
    expect(migration).toContain("gin_trgm_ops");
    expect(migration).toContain("search_knowledge_items");
  });
});

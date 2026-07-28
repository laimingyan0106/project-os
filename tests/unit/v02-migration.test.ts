import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260727_001_v02_core.sql"),
  "utf8",
).toLowerCase();

describe("v0.2 core migration contract", () => {
  it("creates every v0.2 business table", () => {
    const tables = [
      "profiles",
      "projects",
      "workflows",
      "workflow_nodes",
      "workflow_edges",
      "agents",
      "inbox_items",
      "prompts",
      "prompt_versions",
      "knowledge_items",
      "skills",
      "skill_events",
      "resources",
      "activity_logs",
      "migration_runs",
    ];
    for (const table of tables) {
      expect(migration).toContain(`public.${table}`);
    }
  });

  it("uses split owner policies instead of a for-all policy", () => {
    expect(migration).toContain('create policy "select own rows"');
    expect(migration).toContain('create policy "insert own rows"');
    expect(migration).toContain('create policy "update own rows"');
    expect(migration).toContain('create policy "delete own rows"');
    expect(migration).not.toMatch(/create policy[\s\S]{0,160}\sfor all\s/);
  });

  it("enforces owned legacy rows and idempotent migration success", () => {
    expect(migration).toContain("alter column user_id set not null");
    expect(migration).toContain("migration_runs_one_success_per_source");
    expect(migration).toContain("where status = 'success'");
  });
});

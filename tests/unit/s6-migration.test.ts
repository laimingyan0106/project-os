import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260730_005_skills_resources_activity.sql"),
  "utf8",
).toLowerCase();

describe("S6 migration", () => {
  it("changes experience through an authenticated transactional RPC", () => {
    expect(migration).toContain("add_skill_experience");
    expect(migration).toContain("for update");
    expect(migration).toContain("experience = experience + p_delta");
    expect(migration).toContain("grant execute");
  });

  it("records safe activity summaries without copying content fields", () => {
    expect(migration).toContain("capture_project_os_activity");
    expect(migration).toContain("left(v_title, 240)");
    expect(migration).not.toContain("v_row ->> 'content'");
    expect(migration).not.toContain("v_row ->> 'notes'");
  });

  it("guards hierarchy, deltas, and metadata shape", () => {
    expect(migration).toContain("parent_id <> id");
    expect(migration).toContain("delta <> 0");
    expect(migration).toContain("jsonb_typeof(metadata) = 'object'");
  });
});

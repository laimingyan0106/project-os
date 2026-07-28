import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260729_002_workflow_graph_rpc.sql",
  ),
  "utf8",
).toLowerCase();

describe("v0.2 workflow graph transaction contract", () => {
  it("locks the owned workflow and checks the expected version", () => {
    expect(migration).toContain("for update");
    expect(migration).toContain("w.user_id = v_user_id");
    expect(migration).toContain("v_current_version <> p_expected_version");
    expect(migration).toContain("errcode = '40001'");
  });

  it("replaces edges before nodes in one forward transaction", () => {
    const edgeDelete = migration.indexOf("delete from public.workflow_edges");
    const nodeDelete = migration.indexOf("delete from public.workflow_nodes");
    const nodeInsert = migration.indexOf("insert into public.workflow_nodes");
    const edgeInsert = migration.indexOf("insert into public.workflow_edges");

    expect(migration).toContain("begin;");
    expect(migration).toContain("commit;");
    expect(edgeDelete).toBeGreaterThan(-1);
    expect(edgeDelete).toBeLessThan(nodeDelete);
    expect(nodeDelete).toBeLessThan(nodeInsert);
    expect(nodeInsert).toBeLessThan(edgeInsert);
  });

  it("keeps the RPC authenticated and invoker-scoped", () => {
    expect(migration).toContain("security invoker");
    expect(migration).toContain("revoke all on function");
    expect(migration).toContain("from public, anon");
    expect(migration).toContain("to authenticated");
  });
});

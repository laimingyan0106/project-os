import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260731_006_data_lifecycle.sql"),
  "utf8",
).toLowerCase();
const accountDeletionGuard = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260731_007_account_deletion_activity_guard.sql",
  ),
  "utf8",
).toLowerCase();
const settingsActions = readFileSync(
  resolve(process.cwd(), "src/app/(workspace)/settings/settings-actions.ts"),
  "utf8",
).toLowerCase();
const exportRoute = readFileSync(
  resolve(process.cwd(), "src/app/api/export/route.ts"),
  "utf8",
).toLowerCase();
const nextConfig = readFileSync(
  resolve(process.cwd(), "next.config.ts"),
  "utf8",
).toLowerCase();

describe("S7 data lifecycle and security boundaries", () => {
  it("scopes transactional workspace deletion to auth.uid", () => {
    expect(migration).toContain("delete_all_workspace_data");
    expect(migration).toContain("p_confirmation is distinct from 'delete data'");
    expect(migration).toContain("v_user_id uuid := auth.uid()");
    expect(migration).toMatch(
      /delete from public\.projects where user_id = v_user_id/,
    );
    expect(migration).toMatch(
      /delete from public\.activity_logs where user_id = v_user_id/,
    );
    expect(migration).not.toContain("truncate ");
  });

  it("requires a recent authenticated token before deleting auth.users", () => {
    expect(migration).toContain("delete_own_account");
    expect(migration).toContain("p_confirmation is distinct from 'delete'");
    expect(migration).toContain("auth.jwt() ->> 'iat'");
    expect(migration).toContain("interval '5 minutes'");
    expect(migration).toContain("delete from auth.users where id = v_user_id");
    expect(settingsActions).toContain("signinwithpassword");
    expect(settingsActions).toContain(
      "authorization: `bearer ${reauthenticated.session.access_token}`",
    );
    expect(settingsActions).toContain("persistSession: false".toLowerCase());
    expect(settingsActions).not.toContain("service_role");
    expect(settingsActions).not.toContain("console.log");
  });

  it("does not recreate activity rows during the account deletion cascade", () => {
    expect(accountDeletionGuard).toContain(
      "current_setting('project_os.suppress_activity', true) = 'on'",
    );
    expect(accountDeletionGuard).toContain(
      "set_config('project_os.suppress_activity', 'on', true)",
    );
    expect(accountDeletionGuard).toContain(
      "delete from auth.users where id = v_user_id",
    );
    expect(accountDeletionGuard).not.toContain("session_replication_role");
  });

  it("exports every table through current-user RLS filters", () => {
    for (const table of [
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
    ]) {
      expect(exportRoute).toContain(`"${table}"`);
    }
    expect(exportRoute).toContain('.eq("user_id", user.id)');
    expect(exportRoute).toContain('"cache-control": "private, no-store');
    expect(exportRoute).not.toContain("service_role");
  });

  it("adds browser security headers without exposing a secret", () => {
    expect(nextConfig).toContain("content-security-policy");
    expect(nextConfig).toContain("frame-ancestors 'none'");
    expect(nextConfig).toContain("x-content-type-options");
    expect(nextConfig).toContain("permissions-policy");
    expect(nextConfig).not.toContain("service_role");
  });
});

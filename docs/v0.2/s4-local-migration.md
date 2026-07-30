# S4 local migration

Status: Complete. The hosted acceptance run passed initial import and repeated
submission of the same snapshot without duplicate business rows.

## Delivered

- Strict parser for the historical `project-os:v1` JSON shape.
- Untouched seed-data detection with an explicit opt-in before import.
- UUID preservation for valid v0.1 identifiers and safe remapping for legacy
  short identifiers such as `p1`, `a1` and `w1`.
- Authenticated `import_v1_snapshot` RPC that imports Projects, Agents, Inbox,
  the default Workflow, nodes and edges in one transaction.
- Per-account advisory lock and `migration_runs` success check for idempotency.
- Conflict-copy behavior when a same-account cloud row already uses an incoming
  UUID; existing cloud data is not overwritten.
- Automatic post-login detection for the current origin.
- Manual JSON file and paste entry point for Preview deployments, because
  browser localStorage is isolated by origin.
- A 30-day `project-os:v1:migrated-backup` record written before the original
  current-origin key is removed.

## Database prerequisite

Apply `supabase/migrations/20260729_003_v1_snapshot_import.sql` before testing
the migration UI. The RPC is granted only to `authenticated`; `anon` and
`public` execution are revoked.

## Acceptance

1. Put a valid v0.1 snapshot under `project-os:v1` and sign in.
2. Confirm the import dialog reports the expected entity counts.
3. Import and verify that Projects, Agents, Inbox and the Workflow survive a
   refresh and a second browser.
4. Verify `project-os:v1:migrated-backup` contains `expiresAt` 30 days after
   `migratedAt`.
5. Repeat the import action and verify no duplicate business rows are created.
6. Skip an import and verify the original `project-os:v1` key remains intact.

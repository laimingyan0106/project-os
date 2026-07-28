# Project OS v0.2 execution index

This directory tracks the incremental implementation defined by
`Project_OS_v0.2_增量开发文档_Codex执行版.docx`.

## Non-negotiable constraints

- Preserve the v0.1 dark UI, navigation, CRUD dialogs and React Flow editing.
- Implement in Sprint order and keep every Sprint independently buildable.
- Treat Supabase PostgreSQL as the production source of truth.
- Keep `project-os:v1` only as a migration source, temporary draft cache and
  30-day migrated backup.
- Never expose a service-role key to the browser or disable RLS to bypass an
  authorization bug.
- Never silently fall back to seed or local data in production.
- Use forward-only files in `supabase/migrations`; do not rewrite the v0.1
  schema history.
- Run `lint`, `build`, `typecheck` and the relevant tests before every Sprint
  commit.

## Sprint order

| Sprint | Scope | Status |
| --- | --- | --- |
| S0 | Baseline, test harness, ADRs, migration directory | Complete |
| S1 | Auth, session refresh, protected routes, profile | Complete |
| S2 | Repository layer and cloud Projects/Inbox/Agents | Complete |
| S3 | Workflow list, normalized graph and save states | In progress |
| S4 | Idempotent v0.1 local migration | Pending |
| S5 | Prompt Library and Knowledge Base | Pending |
| S6 | Skill Tree, Resources and Activity Log | Pending |
| S7 | Security, accessibility, export and account deletion | Pending |

## Release gates

- Anonymous users cannot access workspace routes.
- Authenticated users can only read and mutate their own rows.
- v0.1 data migration is explicit, idempotent and recoverable.
- Loading, empty and error states exist on every workspace page.
- P0 browser tests pass and production does not depend on `seedState`.

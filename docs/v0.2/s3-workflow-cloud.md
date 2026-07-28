# S3 - Workflow cloud

Date: 2026-07-29

## Scope

- Replace the transitional singleton local workflow with cloud workflow lists.
- Add independent `/workflows/[id]` graph editor routes.
- Persist nodes and edges as normalized rows.
- Save a complete graph in one short database transaction.
- Use the workflow version as an optimistic concurrency boundary.
- Show saving, saved, offline, conflict and failure states truthfully.
- Support create, duplicate and delete from the workflow list.

## Acceptance

- A user can create multiple workflows and associate one with a project.
- Node positions, node edits and edges survive refresh and another browser.
- A stale editor receives a visible conflict instead of overwriting newer data.
- A failed save keeps the local draft visible and provides retry/reload paths.
- Anonymous and cross-tenant access remain blocked by RLS.

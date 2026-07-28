# S2 — Cloud core

Date: 2026-07-29

## Implemented

- Forward-only `20260727_001_v02_core.sql` migration with profiles, all v0.2
  business tables, constraints, indexes, timestamp triggers and split RLS
  policies.
- Repository contracts and Supabase implementations for Projects, Inbox and
  Agents.
- Authenticated Server Actions with input validation and a shared
  `ActionResult` error contract.
- Server-loaded cloud state; production no longer reads Projects, Inbox or
  Agents from `seedState` or localStorage.
- Refocus/online refresh, visible synced/syncing/offline/error state and retry.
- Cloud-backed create, edit, process/archive and delete operations.
- Project detail route, default project archive behavior and explicit permanent
  deletion in the detail danger zone.
- Agent model, tools, project association, paused and error states.
- Workspace loading and error states.

## Transitional boundary

- The v0.1 Workflow editor remains local until S3 normalizes workflows, nodes
  and edges. Existing `project-os:v1` data is preserved untouched for the S4
  migration wizard.

## Live acceptance

- Core migration applied to the configured Supabase project.
- Projects, Inbox and Agents passed create, refresh and second-browser
  persistence verification on 2026-07-29.
- Anonymous REST probes returned empty collections for all core tables under
  RLS.

## Deferred security regression

- A dedicated second-user cross-tenant UUID test remains part of the S7
  hardening suite. Current owner filters and database RLS remain enabled.

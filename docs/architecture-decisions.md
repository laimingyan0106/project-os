# Architecture decisions

## ADR-001: Supabase is the production source of truth

**Status:** Accepted for v0.2

Authenticated production reads and writes use Supabase PostgreSQL behind RLS.
The browser store is not a long-term database. Development may expose an
explicit local-demo mode, but production must show a configuration error rather
than silently render seed data.

## ADR-002: Views depend on repositories through feature hooks

**Status:** Accepted for v0.2

Existing `components/project-os` views remain the visual foundation. Data access
moves behind feature hooks and repository interfaces. Views do not import or
query Supabase directly. This keeps authorization, error mapping, refetching and
future offline work out of presentation components.

## ADR-003: v0.1 migration is explicit and recoverable

**Status:** Accepted for v0.2

After first login, the user chooses whether to import `project-os:v1`. The
migration records a unique run, executes atomically and keeps the original
snapshot until success. On success it writes a 30-day
`project-os:v1:migrated-backup`. Seed-equivalent data is not imported by
default.

## ADR-004: Workflow graphs use normalized rows

**Status:** Accepted for v0.2

Workflows, nodes and edges use separate tables. Graph saves are validated and
committed as a transaction. Dragging is debounced; structural changes wait for
server confirmation. The UI reports `saving`, `saved` and `error` truthfully.

## ADR-005: Server actions return a shared result contract

**Status:** Accepted for v0.2

Product mutations return:

```ts
type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
        details?: unknown;
      };
    };
```

Authorization failures are never translated into empty collections. User-facing
messages remain actionable while logs exclude prompt bodies, knowledge bodies,
tokens and secrets.

## ADR-006: Experience and activity are append-only facts

**Status:** Accepted for v0.2

Skill experience changes use one authenticated database transaction that writes
an event and updates the cached total. The UI cannot directly overwrite total
experience. Workspace activity is captured by database triggers so Dashboard
metrics are based on persisted facts rather than client assumptions.

Activity summaries contain only entity type, identifier, action and a short
title/name. Prompt and Knowledge bodies, resource notes, tokens and secrets are
never copied into the activity stream.

## ADR-007: Destructive lifecycle operations are database transactions

**Status:** Accepted for v0.2

Workspace deletion and account deletion execute in PostgreSQL functions rather
than client-side loops. Both functions derive ownership from `auth.uid()` and
require exact confirmation text. Account deletion additionally rejects JWTs
older than five minutes; the Server Action obtains a fresh token by verifying
the current password immediately before the RPC call.

Exports use an authenticated Route Handler because they are bulk downloads.
Every table query includes the current user identifier and still passes through
RLS. Export responses are private, no-store attachments.

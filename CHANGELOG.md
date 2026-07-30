# Changelog

## 0.2.0 - Unreleased

### S1 - Supabase authentication

- Added Supabase SSR cookie sessions and Next.js 16 route protection.
- Added email/password signup, login, Magic Link, password reset, and sign out.
- Added a universal Supabase email callback for PKCE, token-hash and fragment flows.
- Switched password recovery to server-side token-hash verification for cross-device reliability.
- Separated public authentication pages from the protected Project OS workspace.
- Updated settings to distinguish cloud identity from the pending data migration.

### S2 - Cloud core

- Added the forward-only v0.2 database migration, profile trigger, constraints,
  indexes and split per-user RLS policies.
- Added Repository contracts and Supabase implementations for Projects, Inbox
  and Agents.
- Replaced localStorage-backed core CRUD with authenticated cloud Server
  Actions and visible synchronization states.
- Added project details, default archiving, permanent deletion and `?new=1`
  create behavior.
- Added Agent model, tools, project association, paused and error states.

### S3 - Workflow cloud

- Added multi-workflow cloud lists and independent workflow detail routes.
- Normalized graph reads across workflow, node and edge rows.
- Added an authenticated transactional graph-save RPC with optimistic version
  conflict detection.
- Added debounced position saves, serialized structural saves and visible
  saved, saving, offline, error and conflict states.
- Added workflow create, duplicate, project association and permanent delete.

### S4 - Local migration

- Added explicit detection and manual import for historical
  `project-os:v1` browser snapshots.
- Added strict snapshot validation, untouched seed-data confirmation and safe
  UUID remapping for legacy short identifiers.
- Added an authenticated, transactional and idempotent snapshot-import RPC with
  conflict-copy behavior.
- Added `migration_runs` success/failure reporting and a 30-day recoverable
  browser backup after successful import.
- Updated Settings with cloud refresh status and a Preview-compatible JSON
  file/paste migration entry point.
- Kept the migration entry available after success so the same snapshot can
  be resubmitted to verify server-side idempotency.
- Reset the migration dialog result when it is reopened, while retaining the
  completed-import summary on Settings.
- Added a credential-free v0.1 test snapshot for migration acceptance checks.

### S5 - Prompt Library and Knowledge Base

- Added searchable Prompt assets with project links, tags, detected
  `{{variable}}` placeholders, copy actions and version-aware editing.
- Added transactional Prompt version publishing with immutable historical
  versions and account-scoped concurrency control.
- Added a searchable Knowledge Base for notes, decisions, lessons and
  references, including source URLs, project links, archiving and deletion.
- Added hardened authenticated RLS, trigram content indexes and array GIN tag
  indexes for the two new modules.

### S6 - Skills, Resources and Activity

- Added a hierarchical Skill Tree with levels and transactional, immutable
  experience events instead of direct experience overwrites.
- Added Resource Center search, type filtering, Project links, metadata and
  Secret Ref guidance with plaintext-secret rejection.
- Added a safe Activity Log generated from database mutations without storing
  Prompt bodies, Knowledge bodies, resource notes, tokens or secrets.
- Replaced the Dashboard hard-coded weekly percentage with real weekly Project
  completions and processed Inbox activity.
- Dashboard weekly completion now counts unique entities that are still in a
  completed/processed state, so reverting a Project to active removes it from
  the current completion total while preserving its Activity history.
- Added deterministic priority/status/update sorting, empty states and a
  six-Agent limit on the Dashboard relay.

### S7 - Hardening and data lifecycle

- Added account profile editing for display name and an HTTPS avatar URL.
- Added a no-store JSON export route that queries every collection through the
  current authenticated user's RLS session.
- Added transaction-based workspace deletion guarded by `DELETE DATA`.
- Added account deletion guarded by `DELETE`, current-password
  reauthentication and a five-minute JWT freshness check.
- Added CSP, anti-framing, MIME-sniffing, referrer, permissions, opener and
  HSTS response headers.
- Overrode Next.js transitive PostCSS and Sharp packages to patched versions
  without applying npm audit's incompatible Next.js downgrade.
- Added accessible destructive dialogs, labeled form errors, mobile navigation
  labeling and the small-screen Workflow editing recommendation.

### Added

- S0 baseline documentation, architecture decisions and incremental delivery constraints.
- Vitest unit-test harness and Playwright browser-test harness.
- Initial v0.1 regression coverage for seed graph integrity and core routes.
- Supabase migration directory for forward-only v0.2 database changes.

## 0.1.0 - 2026-07-27

- 初始化 Next.js 16 App Router、TypeScript、Tailwind CSS 与 shadcn/ui。
- 新增响应式深色工作台、全局导航和命令搜索。
- 新增 Dashboard 概览与项目、收件箱、代理状态汇总。
- 新增 Projects、Agent Center、Inbox 的本地 CRUD、搜索和删除确认。
- 新增基于 React Flow 的工作流画布、节点编辑、连线与本地持久化。
- 新增 Supabase 惰性客户端、环境变量模板、PostgreSQL Schema 与 RLS 策略。
- 为包含中文字符的 Windows 工作区固定使用 Webpack，规避 Turbopack CSS 子进程崩溃。

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

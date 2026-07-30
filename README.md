# Project OS

Project OS 是面向 AI 创作者与独立开发者的个人工作操作系统。v0.2 将项目、Inbox、Agent、工作流、Prompt、知识、技能、资源和活动记录统一到一个受账户隔离的云端工作区。

## 技术栈

- Next.js 16 App Router、React 19、TypeScript、Tailwind CSS
- Supabase Auth、PostgreSQL、RLS
- React Flow
- Vitest、Playwright
- Vercel

## 本地启动

```bash
npm install
copy .env.example .env.local
npm run dev
```

访问 `http://127.0.0.1:3000`。

Windows 环境固定使用仓库脚本中的 Webpack 模式。请不要将生产环境静默降级到 seed 数据或 localStorage。

## 环境变量

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

浏览器仅使用 Supabase URL 与 publishable/anon key。项目不需要在前端配置 service role key。

## Supabase 配置

在 Supabase SQL Editor 中按顺序执行：

1. `supabase/migrations/20260727_001_v02_core.sql`
2. `supabase/migrations/20260729_002_workflow_graph_rpc.sql`
3. `supabase/migrations/20260729_003_v1_snapshot_import.sql`
4. `supabase/migrations/20260730_004_prompts_knowledge.sql`
5. `supabase/migrations/20260730_005_skills_resources_activity.sql`
6. `supabase/migrations/20260731_006_data_lifecycle.sql`

在 Supabase Auth 中配置站点 URL、允许的 Redirect URLs、邮件登录、密码登录和恢复邮件模板。所有业务表都启用 RLS。

## v0.1 数据迁移

登录后可以从 Settings 导入旧站 `localStorage` 中的 `project-os:v1` JSON。迁移具备：

- 明确确认，不静默覆盖
- 服务端事务与幂等记录
- 冲突副本
- 成功后 30 天浏览器备份

## 数据与账户

Settings 支持：

- 下载当前账户完整 JSON
- 输入 `DELETE DATA` 删除工作区数据并保留账户
- 输入 `DELETE` 并使用当前密码重新认证后永久删除账户

危险操作必须等待服务端成功确认。账户删除会通过 `auth.users` 外键级联清理业务数据。

## 验证

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

## 分支与发布

v0.2 增量开发位于 `codex/v0.2`。每个 Sprint 先部署 Vercel Preview；生产发布前必须先执行对应数据库迁移。

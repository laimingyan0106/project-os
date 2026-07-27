# Project OS

面向 AI 创作者与独立开发者的 Personal Operating System。第一版覆盖 Dashboard、Inbox、Projects、Workflow Editor 和 Agent Center。

## 启动

```bash
npm install
npm run dev
```

访问 `http://127.0.0.1:3000`。首版默认使用浏览器 `localStorage`，无需账号或云服务即可体验完整交互。

## Supabase

1. 复制 `.env.example` 为 `.env.local` 并填写项目 URL 与 anon key。
2. 在 Supabase SQL Editor 执行 `supabase/schema.sql`。
3. `src/lib/supabase.ts` 提供构建安全的惰性客户端；云端读写与 Auth 作为下一迭代接入。

## 验证

```bash
npm run lint
npm run typecheck
npm run build
```

## 数据边界

当前浏览器数据不会自动同步到其他设备。删除操作带确认，但清除浏览器站点数据仍会移除本地记录。

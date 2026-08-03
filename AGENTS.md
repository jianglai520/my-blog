<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 项目约定（jianglai520 博客）

> 全栈个人博客：https://jianglai520.com ｜ AI 助手进入本项目请遵守以下规则。

## 技术栈

- **Next.js 16**（App Router + Turbopack）+ **React 19** + **TypeScript** + **Tailwind CSS 4**
- **Drizzle ORM**（公开读，直连 Postgres）+ **Supabase**（Auth + 写操作 + Storage）
- 部署：**Vercel**（Git push 自动部署）；测试：**Vitest** + **Playwright**；CI：**GitHub Actions**

## 数据访问（安全约定，必须遵守）

- **公开读**：`lib/posts.ts` 用 Drizzle 直连（绕过 RLS），**必须显式过滤 `status = 'published'`**（草稿永不公开）；评论只返回 `approved`
- **写操作**：一律走 **Server Actions**（`app/actions/`），服务端 `requireAdmin()` 鉴权 + 数据库 RLS 双保险
- **浏览器端零数据库写权限**；**绝不使用 `service_role` key**（会绕过 RLS）
- 连接池：`lib/db.ts` 用 `pg` 驱动 + globalThis 缓存（生产模式也必须复用）

## 常用命令

```bash
npm run dev        # 开发（localhost:3000）
npm run build      # 生产构建
npm run start      # 生产服务器
npm run lint       # ESLint
npm test           # Vitest 单测
npm run test:e2e   # Playwright E2E（生产模式，需先 build）
```

## 数据库迁移

- 迁移脚本在 `supabase/migrations/`（0001~0008，幂等），**手动在 Supabase SQL Editor 执行**
- **新表必须同时配「表级 GRANT + RLS 策略」**；公开读/写路径要用 **anon（未登录）身份**测试，不能只用登录态
- 旧表结构变更：`create table if not exists` 不补已存在表，需显式 `ALTER TABLE`

## 设计系统

- 颜色/字体用**语义变量**（`--color-ink-*` / `--color-fg-*` / `--color-brand-*`，Tailwind `@theme`），支持深浅色主题（`[data-theme="light"]` 覆盖变量）
- 新样式**优先用语义类**（`bg-ink-900`/`text-fg`），**不要写死 hex 色值**（否则浅色模式不适配）
- 图标用 `lucide-react`（注意品牌图标已移除，如 `Github` → 用 `GitFork`）

## 测试

- 单测聚焦**纯逻辑 + 权限分支**（mock `@/lib/server/supabase`；mock 清理用 `vi.resetAllMocks()`）
- E2E **必须用生产模式**（`build + start`，不用 dev）；登录测试凭据走 `TEST_EMAIL`/`TEST_PASSWORD` 环境变量（未配置跳过）

## 文档

- `README.md`：使用/部署；`supabase/migrations/`：数据库档案；桌面 `my-blog搭建/` 文件夹：优化方案/面试/经验文档
- 每次功能或修复后，同步更新对应文档（工程化可交付）

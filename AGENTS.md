<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 项目约定（jianglai520 博客）

> 全栈个人博客：https://jianglai520.com ｜ AI 助手进入本项目请遵守以下规则。

## 技术栈

- **Next.js 16.4.6**（App Router + Turbopack）+ **React 19** + **TypeScript** + **Tailwind CSS 4**
- 编辑器：**TipTap 3.34**（默认源码模式，保存 Markdown）
- **Drizzle ORM**（公开读，直连 Postgres）+ **Supabase**（Auth + 写操作 + Storage）
- AI：**BGE-M3**（1024 维 embedding）+ **pgvector** + **pg_trgm** + **DeepSeek**（流式）
- 部署：**Vercel**；测试：**Vitest** + **Playwright**；CI：**GitHub Actions**

## 数据访问（安全约定，必须遵守）

- **公开读**：`lib/posts.ts` / `lib/rag.ts` 用 Drizzle 直连（绕过 RLS），**必须显式过滤 `status = 'published'`**（草稿永不公开）；评论只返回 `approved`
- **写操作**：一律走 **Server Actions**（`app/actions/`），服务端 `requireAdmin()` 鉴权 + 数据库 RLS 双保险
- **浏览器端零数据库写权限**；**绝不使用 `service_role` key**（会绕过 RLS）
- 连接池：`lib/db.ts` 用 `pg` 驱动 + globalThis 缓存（生产模式也必须复用）；`next build` 默认多 worker，构建期连接池 `max=2`，并在 `next.config.ts` 限制 `experimental.cpus=4`，避免并发静态页打满 Supabase 连接池
- **列表/搜索不要查整篇正文**：只 select 必要列；无摘要时的兜底用 `left(content, 500)`；阅读时长读 `posts.reading_minutes`、字数读 `posts.word_count`（发布/编辑时写入，历史数据用 `scripts/backfill-reading-time.mjs` 回填）
- **后台列表只传文章元数据**：编辑时通过 `getPostContent` Server Action 按需取正文；后台 Tab 用客户端状态即时切换，文章/评论/留言/私信首次并行加载，切换不再走服务端导航
- **页面默认用 ISR**（`export const revalidate = 60`）；只有必须读取 cookie / 实时请求数据时才用 `force-dynamic`。不要为了“数据最新”滥用 `force-dynamic`，否则每次访问都要服务端重新渲染
- **分页优先用路径参数**（`/page/N`）；不要让根路由 `/` 读取 `searchParams`，否则首页会失去静态化与预取，点击导航比别的页面慢
- **外部字体 CSS 不得阻塞渲染**：等页面 `load` 后再异步注入（`media="print"` → `onload` 切 `all`），不要把 Google Fonts 的 `<link rel="stylesheet">` 直接放 `<head>`
- **列表卡片固定内容槽位**：封面统一 2:1，标题预留 2 行、摘要预留 1 行，标签最多 3 个且单行（元信息行不换行），网格用 `auto-rows-fr`；避免字体切换或内容长度导致卡片高度跳动
- **后台数据用 Drizzle 一次查询**：不要为文章/评论/留言/私信分别走多次 Supabase REST；鉴权与数据查询并行；`profiles.is_admin` 缓存 30 秒
- **正文图片必须懒加载**：Markdown 图片统一补 `loading="lazy"` + `decoding="async"`
- **重服务端渲染必须缓存**：Markdown + Shiki 的 HTML 用 `unstable_cache` 按正文内容缓存（tag `posts`），文章/评论查询各加 60s 缓存（tag `posts` / `comments`）
- **IP 不落明文**：统一 `sha256(IP | salt)`（`lib/server/ip.ts`），用于限流、浏览量、访客统计
- **限流**：`rate_limit_events` 表 + `lib/server/rate-limit.ts`；不要用进程内 Map（Vercel 多实例失效）
- **浏览量**：`record_post_view` RPC + `post_views` 表，同一访客每天每篇只计一次
- **访客 UV**：`site_visits` + `/api/visit`，按天去重；站长登录态与爬虫不计入

## 前端加载与草稿

- **重组件按需加载**：文章页的 TOC / 图片灯箱 / AI 按钮统一从 `app/components/ArticleClientWidgets.tsx` 导入（内部 `next/dynamic` + `ssr:false`）；后台 `PostForm` / `ProjectManager` / `SkillManager` 用 `next/dynamic`。不要再把它们静态 import 进 Server Component（Server Component 不支持 `ssr:false`）。
- **草稿自动保存**：`app/admin/PostForm.tsx` 以 1 秒防抖写 localStorage（`draft:new` / `draft:edit:<id>`）；发布成功、主动丢弃、手动清除时必须删除；恢复提示未处理前禁止写入，避免覆盖旧草稿。
- **Markdown 渲染管线**：渲染逻辑在 `lib/markdown.ts`（纯函数，可单测，含 `remark-math` + `rehype-katex`、单行 `$$...$$` 规范化、图片 `no-referrer`）；`app/components/Markdown.tsx` 只负责 `unstable_cache`，管线变化时必须递增其 key 前缀（当前 `markdown-html-v4`）。
- **图片优化**：Vercel Hobby 的 Image Optimization 额度（5K/月）已用满，`next.config.ts` 设了 `images.unoptimized = true`，`next/image` 直接输出 Supabase 原图；新上传图片在 `lib/browser/upload.ts` 浏览器端压缩（最长边 1600px、WebP q=0.82）。重新开启优化前先确认额度或改用自托管 + sharp。

## AI / RAG 约定

- 检索：**向量 Top8 + 关键词 Top8 → 融合 0.7/0.3 → 单篇最多 2 段 → Top5**
- 关键词提取：英文术语整词 + 中文双字滑窗（`lib/rag.ts → extractKeywords`），不要整句 ILIKE
- 生成：DeepSeek `stream: true`，API 返回 **SSE**（`citations → delta → done`）
- 检索内容视为**不可信数据**：`<untrusted_articles>` 包裹、清洗边界标签、System Prompt 明确忽略资料内指令
- 改动检索逻辑后必须跑 `npm run eval:rag`，并在文档中更新 Recall@5 / MRR / P95
- 索引异步：发布只标记 `index_status='pending'`，由 `scripts/index-posts.mjs` / GitHub Actions 补偿

## 常用命令

```bash
npm run dev            # 开发（localhost:3000）
npm run build          # 生产构建
npm run start          # 生产服务器
npm run lint           # ESLint
npx tsc --noEmit       # 类型检查（CI 门禁，必须保持全绿）
npm test               # Vitest 单测
npm run test:coverage  # 单测 + 覆盖率阈值（CI 门禁）
npm run test:e2e       # Playwright E2E（生产模式，需先 build）
npm run eval:rag       # RAG 检索评测（Recall@5 / MRR / P95）
npm run cleanup:storage # Storage 孤儿文件扫描（默认预演，不删除）
npm run check:migrations # 迁移编号与幂等静态检查
node scripts/optimize-storage-images.mjs           # 图片压缩预演（dry-run）
node scripts/optimize-storage-images.mjs --apply   # 备份原图后覆盖压缩
```

## 数据库迁移

- 迁移脚本在 `supabase/migrations/`（**0001~0025**，幂等），**手动在 Supabase SQL Editor 执行**
- **新表必须同时配「表级 GRANT + RLS 策略」**；公开读/写路径要用 **anon（未登录）身份**测试，不能只用登录态
- 旧表结构变更：`create table if not exists` 不补已存在表，需显式 `ALTER TABLE`
- 涉及安全函数（RPC）时：`security definer` + `set search_path = public`，并 `revoke ... from public` 后只 grant 必要角色
- 近期新增：`site_visits`（UV）、`rate_limit_events`（限流）、`post_views`（浏览量去重）、trgm 检索索引（0019）；0024 为 `post-images` 增加管理员 UPDATE 策略（覆盖上传）；0025 增加评论/留言头像 `avatar_data` 与 `replies` 表（游客回复）

## 安全约定

- **鉴权快速路径**：`proxy.ts` 用 `auth.getClaims()` 本地验签（ES256 + JWKS 缓存，失败回退 `getUser()`），并通过 `x-admin-id` / `x-admin-email` 内部请求头传递身份；`requireAdmin()` 优先读该头（proxy 会先删除客户端伪造的同名头），无头时回退 `getUser()`。新增后台路由必须命中 `/admin` matcher。
- **文章/项目详情页是 ISR**：`revalidate = 60` + `generateStaticParams` 预渲染；修改数据后靠 tag `posts` 失效，不要再改成每次请求 SSR。

- 安全响应头在 `next.config.ts`（nosniff / Referrer-Policy / X-Frame-Options / Permissions-Policy）
- `/api/download` 必须用 `new URL()` 校验 hostname 与 pathname，**禁止用 `includes` 做 URL 白名单**
- Storage 桶 `post-images` 有 MIME 白名单 + 20MB 单文件上限；上传失败必须给出明确提示
- 访客头像不走 Storage：客户端压成 96×96 WebP data URL 存 DB，服务端限制 `webp/png/jpeg` 且 ≤ 48k 字符，避免匿名 Storage 写入被刷
- 依赖升级后必须跑 `npm audit`（官方 registry）并回归 lint/tsc/test/build
- 服务端环境变量统一走 `lib/env.ts` 的 `getServerEnv()` / `getPublicEnv()`（缺失立即报错）；客户端仍直接读 `process.env.NEXT_PUBLIC_*`，**不要 import `lib/env.ts`**

## 设计系统

- 颜色/字体用**语义变量**（`--color-ink-*` / `--color-fg-*` / `--color-brand-*`，Tailwind `@theme`），支持深浅色主题（`[data-theme="light"]` 覆盖变量）
- 新样式**优先用语义类**（`bg-ink-900`/`text-fg`），**不要写死 hex 色值**（否则浅色模式不适配）
- 图标用 `lucide-react`（注意品牌图标已移除，如 `Github` → 用 `GitFork`）

## 测试

- 单测聚焦**纯逻辑 + 权限分支**（mock `@/lib/server/supabase`；mock 清理用 `vi.resetAllMocks()`）
- E2E **必须用生产模式**（`build + start`，不用 dev）；登录测试凭据走 `TEST_EMAIL`/`TEST_PASSWORD` 环境变量（未配置跳过）
- CI 门禁：lint → `tsc --noEmit` → `test:coverage`（语句 48 / 分支 43 / 函数 38 / 行 50）→ build → E2E；`main` 分支缺 `DATABASE_URL` 时构建/E2E **直接失败**，不允许静默跳过；类型错误必须当场修掉
- E2E 包含 **axe 无障碍**（关闭 `color-contrast`，属于已知设计取舍）；新增公开页面时同步加入 `e2e/a11y.spec.ts` 的 `PAGES`
- 服务端日志统一用 `lib/logger.ts`（单行 JSON）；健康检查是 `GET /api/health`
- Dependabot 分支不触发 Vercel 预览部署（`vercel.json` → `git.deploymentEnabled`）；测试工具链 major 在 `dependabot.yml` 中忽略
- RAG 相关改动：同步更新 `data/eval/rag-qa.jsonl` 或在文档记录评测结果

## 文档

- `README.md` / `README.zh-CN.md`：使用、部署、安全架构、功能清单
- `supabase/migrations/`：数据库档案；`scripts/`：索引、备份、清理、评测脚本
- 桌面 `my-blog搭建/`：
  - `文档总索引.md`：全部文档导航与推荐阅读路径（先看这篇）
  - `整体技术栈与架构.md`：全景图、技术栈、四条核心链路、选型取舍
  - `项目优化方案.md`：每批改动的实施记录
  - `开发经验与踩坑合集.md`：可复用经验
  - `AI问答RAG实战详解.md`：架构、指标、面试追问
  - `面试准备与项目总结.md`：项目亮点与问答
  - `后端架构详解.md`：后端技术栈、请求链路、面试话术
  - `简历项目经历-AI应用方向.md`：简历可直接使用的项目经历
  - `服务器网络与备案指南.md`：DNS、托管形态、备案、方案对比
  - `Vercel部署全流程.md`：构建、路由渲染、环境变量、缓存、区域、排障
  - `存储孤儿文件说明.md`：Storage 生命周期
- 每次功能或修复后，同步更新对应文档（工程化可交付）

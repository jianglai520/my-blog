# ✨ jianglai520 — 我的个人博客

基于 **Next.js 16 + React 19 + Supabase + Vercel** 搭建的全栈个人博客，支持文章发布、后台管理、登录保护、评论区与 SEO 优化。

- 🌐 线上地址：**https://jianglai520.com**
- 📦 代码仓库：`git@github.com:jianglai520/my-blog.git`
- 🎨 视觉风格：青绿毛玻璃（teal glassmorphism，品牌色 `#35bfab` + 青色 `#1fc9e7`，深浅色自适应，Tailwind CSS 4 设计系统）

> 📖 English version: [README.md](./README.md)

---

## 🛠️ 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| **Next.js** | 16.4.6 | 前端框架（App Router + Turbopack） |
| **React** | 19.2.4 | UI 组件 |
| **TypeScript** | ^5 | 类型安全 |
| **Tailwind CSS** | ^4 | 样式（CSS-first `@theme` 设计系统） |
| **Supabase** | ^2.108 | 认证（Auth）+ 写操作（RLS 防线） |
| **Drizzle ORM** | ^0.45 | 公开读数据层（schema 即类型真相，直连 Postgres） |
| **pgvector / pg_trgm** | — | RAG 向量 + 关键词混合检索 / 模糊搜索 |
| **KaTeX** | ^0.19 | 服务端 LaTeX 公式渲染（`$$...$$` 块级、`$...$` 行内） |
| **AI** | — | BGE-M3 向量化（硅基流动）+ DeepSeek 流式生成 |
| **Vercel** | — | 托管部署（函数固定 `sin1`，与 Supabase 同区域） |
| **字体** | Noto Serif SC + 马善政 + JetBrains Mono | 运行时从 `fonts.googleapis.cn` 加载；全站宋体，Hero 问候语用毛笔，代码用等宽（不走构建期拉取，失败自动回退系统字体） |

> 运行环境要求：Node.js ≥ 20.9（开发环境使用 Node 24.14.0）。

---

## 🧪 工程质量（Phase 4）

| 能力 | 说明 |
|------|------|
| 单元测试 | **Vitest**（103 个用例）：`lib/format`、zod 校验层、Server Actions 权限分支、数据层纯函数与 mock 查询、Markdown/KaTeX 渲染管线、图片缩放、环境变量校验、分页跳转、日志、组件渲染（RTL） |
| 覆盖率 | `npm run test:coverage`（v8）；CI 门禁：语句 **48** / 分支 **43** / 函数 **38** / 行 **50** |
| E2E 测试 | **Playwright**（17 个用例）：首页/文章/搜索/RSS/登录、后台创建草稿并删除、分页跳转、封面图加载、axe 无障碍 |
| 无障碍 | Playwright + **axe**（WCAG 2.1 A/AA）；颜色对比度作为已知设计取舍被排除 |
| 可观测性 | 结构化 JSON 日志（`lib/logger.ts`）+ `GET /api/health`（数据库探活，异常返回 `503`） |
| 运维自动化 | `uptime.yml` 每 15 分钟探活，失败自动开 issue；`lighthouse.yml` 每周跑性能预算 |
| 提交门禁 | `simple-git-hooks` + `lint-staged` 对暂存文件跑 ESLint（非 git 环境自动跳过） |
| CI 流水线 | **GitHub Actions**（`.github/workflows/ci.yml`）：push/PR 自动跑 lint + tsc + 单测 + 构建 + E2E；`main` 分支缺 `DATABASE_URL` 时**直接失败**，不再静默跳过 |
| 配置校验 | `lib/env.ts` 缺少变量时立即报错并指出变量名，不再散落 `process.env.X!` |
| 依赖治理 | **Dependabot** 每周检查 npm + GitHub Actions；`katex` 通过 npm `overrides` 统一版本；Node 用 `.nvmrc` + `engines` 固定；Dependabot 分支的预览部署已通过 `vercel.json` 关闭（测试工具链 major 有 peer 冲突） |
| 错误监控 | **Sentry**（`SENTRY_DSN` 配置后生效）+ 自定义 `error.tsx` / `global-error.tsx` |
| 访问分析 | **Vercel Analytics**（`@vercel/analytics`，Dashboard 开启） |
| 数据备份 | 见 **`BACKUP.md`**：`scripts/backup.mjs` 导出 JSON + `scripts/restore-drill.mjs` 恢复演练（临时 schema 校验，已执行通过） |
| 性能优化 | **ISR + CDN 优先**：首页、文章页、项目详情页均为 ISR（`revalidate=60`），构建期用 `generateStaticParams` 预渲染 34 篇文章 + 5 个项目；数据层 `unstable_cache` + tag 失效；后台重组件用 `next/dynamic` 懒加载；Vercel 函数固定在 `sin1`（与 Supabase 同区域）——登录进后台 5.3s → **1.0s**，文章首屏约 **0.2s**（CDN 命中） |

```bash
npm test          # 单元测试
npx tsc --noEmit  # 类型检查
npm run test:e2e  # E2E 测试（需先 build）
npm run lint      # ESLint
npm run eval:rag  # RAG 检索评测（Recall@5 / MRR / P95）
```

> CI 的 build/E2E 需要 GitHub Secrets：`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`DATABASE_URL`、`TEST_EMAIL`/`TEST_PASSWORD`（E2E 登录与每月存储清理都依赖）。

---

## ✅ 已实现功能

| 功能 | 说明 |
|------|------|
| 📄 首页 | 英雄区（头像/渐变标题/**光斑动效**/**站点统计行**/**了解更多 CTA**）+ 文章卡片列表（**青绿毛玻璃卡片**：封面图置顶 2:1 + 文字区玻璃面板、hover 上浮发光、**阅读时长（落库）**、标签、阅读数）+ **置顶文章优先** + **全部非空标签入口** + **分页（上一页/下一页 + 输入页码直达）**；列表只取正文前 **500 字** |
| 📖 文章详情页 | **ISR 缓存，直接命中 CDN**；语义化 slug 链接（兼容旧数字 id，301 跳转）；显示标签、**浏览量（同一访客每天只计一次）**、**阅读时长**；阅读进度条 + 文章目录（TOC） |
| 📝 **Markdown 正文** | 标题 / 列表 / **代码高亮（shiki 深浅双主题，无语言代码块自动补默认）** / 表格 / 引用 / 图片完整渲染；**KaTeX 数学公式（`$$...$$` 块级、`$...$` 行内，单行 `$$...$$` 自动规范为块级）**；专业排版；行内代码不带自动反引号 |
| 🔍 **图片点击放大** | 文章正文图片点击查看大图（lightbox，点遮罩 / ✕ / Esc 关闭） |
| 📋 **代码块复制** | 代码块右上角一键复制按钮 |
| 🖊️ **富文本编辑器** | TipTap 所见即所得，保存为 Markdown；**默认源码模式（MD）**，可直接编辑原始 Markdown，保留表格/代码块；图片/附件/表情会插入到**当前模式**的光标处；**工具栏格式在源码模式下直接写 Markdown 语法**，支持撤销/重做 |
| 📥 **草稿与编辑** | 存草稿 / 发布 / 编辑续写，草稿永不公开；**1 秒防抖 localStorage 自动保存**，重新进入可恢复或丢弃 |
| 🖼️ **图片上传** | 编辑器选图先在**浏览器端压缩（WebP，最长边 1600px）**，再**直传** Supabase Storage → 自动插入 |
| 🖼️ **封面图上传** | 写文章可**本地上传**封面图（≤5MB，浏览器压缩 + 直传，自动填入 URL）或粘贴外链图床地址 |
| 🖼️ **图片链路** | 已关闭 Vercel 图片优化（Hobby 5K/月额度用满会 402）；图片直接走 Supabase CDN；历史图片已批量压缩 **47.4MB → 25.5MB（46%）** |
| 📎 **附件上传** | 文章可插入 PDF/Word/Excel/压缩包（**支持多选批量上传**，单个 ≤20MB，浏览器直传）；正文渲染为**附件卡片，带在线预览 + 下载**（PDF/txt/md 直接预览，Office 走 Office Online Viewer）；源码/可视化模式均可插入 |
| 😀 **表情插入** | 编辑器工具栏「表情」面板，常用 emoji 分组点击插入光标处 |
| 🏷️ **标签系统** | 写文章打标签；`/tags/xxx` 标签页（**双列卡片**）；首页卡片显示标签；无文章的标签不展示 |
| 🔍 **搜索** | 导航搜索框（防抖），**相关性排序**（标题 3 / 摘要 2 / 正文 1 + trgm 相似度），trgm GIN 索引；**结果缓存 60 秒**，只取正文前 500 字（不再传输整篇文章） |
| 🤖 **AI 问答（RAG）** | 文章页悬浮「问 AI」：**混合检索**（pgvector Top8 + trgm 关键词 Top8 → 融合 Top5，单篇最多 2 段）、**SSE 流式输出**、**可点击引用来源**、Prompt 注入防护、数据库限流，并带**评测脚本**（`npm run eval:rag`） |
| 📡 **RSS** | `/feed.xml`（Atom），layout 注入订阅链接 |
| 🕒 **运行时长 / 更新日志** | 页脚实时显示**本站已运行**时长（天 HH:MM:SS，逐秒跳动，避免 hydration 不一致）；`/logs` 从仓库提交自动生成**更新日志**（GitHub API、1 小时 ISR 缓存、过滤测试/合并提交、类型徽标 + 提交链接） |
| 👣 **访客统计** | 自建**累计 UV + 今日 UV**：IP/UA 做 SHA-256 哈希，同一访客每天只记一条，不保存原始 IP；首页统计行与页脚展示 |
| 🧹 **存储清理** | 后台显示桶用量（文件数 · 体积）；`npm run cleanup:storage` 扫描引用并报告孤儿文件（默认预演）；每月 GitHub Action 清理超过 45 天且未被引用的文件 |
| 🗂 **归档 / 关于** | 时间轴归档页（渐变时间线、月份折叠、Changelog 风格 commit 行：等宽日期/短编号/阅读时长/字数）；**开发者名片式关于页**（固定资料卡、Pinned 项目、技能、经历、私信表单、展示数量上限） |
| ⚙️ **站点设置** | 后台可随时修改博主名/简介/GitHub/邮箱/**头像（可上传或填 URL）**/备案号，前台即时生效 |
| 🌗 **深浅色主题** | header 切换按钮；跟随系统偏好 + 手动选择记忆（localStorage） |
| 💬 评论区 | 昵称 + 内容，**可选上传访客头像**（96×96 WebP，data URL 存库），即时显示；**博主可在后台回复**；**游客可在评论区回复**（独立线程，不会显示成博主回复）；后台可单删 / **多选批量删除**（IP 60 秒限流） |
| 💬 **留言板** | 独立留言页 `/guestbook`，**信件/编辑风**（宋体信件卡片、署名行、引号装饰），匿名可发 + IP 限流；**可选上传头像**；**博主可在后台回复**；**游客可回信**（独立线程）；后台可删 |
| ✉️ **站内私信** | 关于页底部私信表单（昵称/联系方式可选，**内容仅站长可见**），匿名可发 + IP 限流，后台管理查看/删除 |
| 🏷️ **技能页** | `/skills` **Bento + 雷达图**（按分组展示能力分布 + 平均分圆环）+ **核心技术栈**大卡 + 等级文案；后台支持**逐技能独立保存/删除**、分组排序、实时预览，以及描述/年限/图标/核心标记 |
| 📁 **项目展示** | `/projects` 项目列表页（**紧凑毛玻璃卡片**，点进 `/projects/[slug]` 详情页查看完整简介）；后台**每个项目独立保存/删除**（互不影响），名称/年份/描述/技术栈/链接，**封面支持本地上传或 URL** + **16:9 裁剪预览与位置滑块**，面试展示 |
| 📄 **在线简历** | `/resume` 一页纸简历（复用资料/技能/项目 + 经历配置，**一键打印导出 PDF**，页脚入口） |
| 📄 **llms.txt（GEO）** | 站点根路径 `llms.txt` 输出 AI 可读的文章索引（llmstxt.org 标准）；`robots.txt` 显式允许 GPTBot/ClaudeBot/Google-Extended |
| 🔝 **返回顶部** | 长文滚动后右下角一键回顶（平滑滚动，AI 按钮上方） |
| 🎭 **404 趣味页** | 个性化 404（大号渐变 + 快捷入口），文章/标签不存在也走这里 |
| 📤 **分享按钮** | 文章页一键分享：复制链接 / 微博 / QQ / X |
| 🔍 **搜索增强** | 搜索页内可改词输入框 + 结果**关键词高亮** + 紧凑列表 |
| 🔐 登录 | Supabase Auth 邮箱登录（单管理员） |
| 🛡️ 后台管理 | 服务端鉴权；文章管理（发布/编辑/删除/草稿/**多选批量删除**/**置顶取消置顶**）+ **评论管理**（单删/批量删除）；编辑器与项目/技能管理按需懒加载，写作 1 秒防抖自动存草稿 |
| 🌐 自定义域名 | jianglai520.com 已绑定 Vercel |

---

## 📁 项目结构

```
my-blog/
├── app/
│   ├── actions/                    # Server Actions：服务端业务逻辑（唯一写入口）
│   │   ├── auth.ts                 # 登录 / 注册 / 退出
│   │   ├── posts.ts                # 发布 / 编辑 / 删除文章（zod 校验 + 博主鉴权）
│   │   ├── comments.ts             # 发表评论
│   │   ├── guestbook.ts            # 留言板留言（限流）
│   │   └── messages.ts             # 站内私信（限流 + zod 校验）
│   ├── layout.tsx                  # 全局布局（字体 / metadata / 主题）
│   ├── globals.css                 # 全局样式 + Tailwind v4 @theme 设计系统
│   ├── page.tsx                    # 首页（英雄区 + 文章列表）
│   ├── components/
│   │   ├── SiteHeader.tsx          # 顶部导航（毛玻璃）
│   │   ├── SiteFooter.tsx          # 页脚（关于 / 社交 / 版权）
│   │   ├── Markdown.tsx            # Markdown → HTML 渲染（RSC，shiki 双主题高亮）
│   │   ├── ImageLightbox.tsx       # 文章图片点击放大（lightbox）
│   │   ├── CodeBlockCopy.tsx       # 代码块复制按钮
│   │   ├── ReadingProgress.tsx     # 文章阅读进度条
│   │   ├── Toc.tsx                 # 文章目录（TOC）
│   │   ├── ThemeToggle.tsx         # 深浅色主题切换
│   │   ├── MessageForm.tsx         # 站内私信表单（关于页，client）
│   │   └── Editor.tsx              # TipTap 富文本编辑器（client，表情 + Markdown 源码模式）
│   ├── posts/
│   │   └── [identifier]/
│   │       ├── page.tsx            # 文章详情页（slug/id 双解析）
│   │       └── CommentForm.tsx     # 评论表单（调用 Server Action）
│   ├── projects/
│   │   ├── page.tsx                # 项目列表页（紧凑卡片 + 整卡可点）
│   │   └── [slug]/page.tsx         # 项目详情页（完整简介 + 链接）
│   ├── admin/
│   │   ├── page.tsx                # 后台入口（服务端鉴权，未登录/非博主重定向）
│   │   ├── AdminClient.tsx         # 后台主界面（导航 + Tab + 组合子模块）
│   │   ├── PostForm.tsx            # 写作 / 编辑表单（TipTap 编辑器 + 封面上传）
│   │   ├── PostList.tsx            # 文章管理列表（编辑/删除）
│   │   ├── CommentManager.tsx      # 评论管理列表
│   │   ├── GuestbookManager.tsx    # 留言板留言管理
│   │   ├── MessageManager.tsx      # 站内私信管理（含联系方式）
│   │   ├── ProjectManager.tsx      # 项目管理（每个项目独立保存/删除 + 封面上传）
│   │   ├── SkillManager.tsx        # 技能管理（逐技能保存/删除 + 分组排序 + 实时预览）
│   │   ├── SettingsForm.tsx        # 站点设置（含头像上传）
│   │   └── shared.ts               # 共享输入样式 + AdminPost 类型
│   ├── login/
│   │   └── page.tsx                # 登录页（useActionState 调 Server Actions）
│   ├── tags/[slug]/                # 标签页（按标签筛选文章）
│   ├── archives/                   # 时间轴归档页（年月时间线 + Changelog 行）
│   ├── about/                      # 关于页（开发者名片 + Pinned 项目 + 技能 + 私信）
│   ├── guestbook/                  # 信件风留言页（写信 + 信件卡片）
│   ├── skills/                     # Bento + 雷达图技能页
│   ├── search/                     # 搜索页
│   ├── feed.xml/                   # RSS 订阅（Atom）
│   ├── og/                         # 动态 OpenGraph 分享图（edge，next/og）
│   ├── robots.ts                   # 搜索引擎 + AI 爬虫规则（GPTBot/ClaudeBot 允许）
│   ├── llms.txt/                   # AI 可读站点索引（llmstxt.org 标准，route.ts 动态生成）
│   ├── sitemap.ts                  # 站点地图（动态生成）
│   └── favicon.ico
├── db/
│   └── schema.ts                    # Drizzle schema（类型真相，数据库结构变更入口）
├── lib/
│   ├── server/
│   │   └── supabase.ts             # 服务端客户端 + 鉴权工具（server-only 保护）
│   ├── browser/
│   │   ├── supabase.ts             # 浏览器端客户端（cookie session，Storage 直传用）
│   │   └── upload.ts               # 浏览器直传 Supabase Storage（图片/附件，RLS 鉴权）
│   ├── db.ts                       # Drizzle 客户端（连接池单例，仅服务端读路径）
│   ├── posts.ts                    # 公开读数据层（Drizzle，强制 status='published' 过滤）
│   ├── projects.ts                 # 项目 JSON 解析 / slug 生成 / 序列化
│   ├── skills.ts                   # 技能 JSON 解析 / 分组 / 分组重排 / 等级文案
│   ├── validations/                # zod 校验 schema（posts/comments/auth，服务端客户端共用）
│   ├── format.ts                   # 中文日期格式化 / slugify / stripMarkdown / postHref
├── proxy.ts                        # 路由守卫（Next 16 中 middleware 更名为此）
├── drizzle.config.ts               # drizzle-kit 配置（schema → 迁移 SQL）
├── supabase/
│   └── migrations/                 # 数据库迁移 SQL（0001~0025，手动在 SQL Editor 执行）
├── scripts/
│   ├── generate-og.mjs             # 一次性脚本：生成 public/og.png
│   ├── backup.mjs                  # 数据库备份脚本（导出全表 JSON 到 backups/）
│   ├── restore-drill.mjs           # 备份恢复演练（临时 schema 重建 + 行数校验，安全不碰生产表）
│   ├── render-docs.mjs             # Markdown 文档 → 排版好的 HTML（桌面文档目录）
│   └── check-markdown.mjs          # 扫描文章中的压平表格 / 异常 Markdown
├── e2e/                            # Playwright E2E 测试（homepage/post/search/rss/auth）
├── public/
│   └── og.png                      # OpenGraph 分享图（1200×630）
├── next.config.ts                  # Turbopack 根目录 / 远程图片白名单
└── package.json
```

---

## 🚀 本地运行

```bash
# 1. 安装依赖（Node ≥ 20.9）
npm install

# 2. 配置环境变量（见下方 .env.local）
# 3. 启动开发服务器
npm run dev
```

打开 http://localhost:3000 即可查看；访问 `/admin` 进入后台（需登录）。

### 其他命令

```bash
npm run build   # 生产构建（Next 16 已移除 next lint，构建含类型检查）
npm start       # 启动生产服务器
npm run lint    # ESLint 检查
npm run test:coverage  # 单元测试 + 覆盖率门禁
npm run check:markdown  # 扫描文章中的压平表格 / 异常 Markdown
npm run check:migrations # 迁移编号与幂等静态检查
npm run cleanup:storage # 扫描 Storage 孤儿文件（默认预演，不删除）
node scripts/optimize-storage-images.mjs           # 图片压缩预演（dry-run）
node scripts/optimize-storage-images.mjs --apply   # 备份原图后覆盖压缩
```

---

## 🔑 环境变量（.env.local）

| 变量 | 说明 | 获取位置 |
|------|------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL | Supabase 控制台 → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 公开匿名密钥（anon key） | 同上 |
| `DATABASE_URL` | **服务端专用**数据库连接串（Drizzle 直连用，**不带 NEXT_PUBLIC_ 前缀**） | Supabase → Project Settings → Database → Connection string → **Transaction pooler**（端口 6543） |
| `DEEPSEEK_API_KEY` | **服务端专用**AI 问答密钥（站内「问 AI」回答生成，**不带 NEXT_PUBLIC_ 前缀**） | DeepSeek 开放平台 → API Keys |
| `EMBEDDING_API_KEY` | **服务端专用**向量化密钥（RAG 检索用，BGE-M3，**不带 NEXT_PUBLIC_ 前缀**） | 硅基流动 → API Keys |
| `VISIT_HASH_SALT` | 访客 UV 哈希盐（未配置时使用内置默认值） | 任意随机字符串 |
| `IP_HASH_SALT` | 限流 / 浏览量 IP 哈希盐（可选） | 任意随机字符串 |
| `GITHUB_TOKEN` | `/logs` 更新日志读取 commit 用（可选） | GitHub → Settings → Developer settings → Fine-grained token |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | 服务端 / 客户端 Sentry DSN（可选） | Sentry 项目设置 |

> ⚠️ `DATABASE_URL` 是能直连数据库的服务端密钥：只在 `.env.local` / Vercel 服务端环境变量里，**绝不暴露给浏览器**（Vercel 配置时**不勾选** "Expose to Client"）。

示例：

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

> ⚠️ `.env.local` 已被 `.gitignore` 排除，不会提交到仓库。Vercel 部署时需在项目设置 → Environment Variables 中单独配置。

---

## 🗄️ 数据库结构（Supabase）

> 访客头像以 `avatar_data`（96×96 WebP data URL）存在 `comments` / `guestbook_messages`；游客回复在 `replies` 表（`target_type` + `target_id`），与博主回复字段分开。

### 表 `posts`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | int8 / PK | 主键 |
| `author_id` | uuid（可空） | 作者，关联 `auth.users.id` |
| `slug` | text / unique（可空） | 语义化链接，如 `my-first-post` |
| `title` | text | 标题 |
| `content` | text | 正文（**Markdown**） |
| `excerpt` | text（可空） | 摘要，用于列表卡片与分享 |
| `cover_image` | text（可空） | 封面图 URL |
| `status` | text | `published`（已发布）/ `draft`（草稿，永不公开） |
| `view_count` | int | 浏览量（RPC `record_post_view`，`post_views` 按访客/天去重） |
| `index_status` | text | 向量索引状态（`pending`/`done`/`failed`，发布异步化用） |
| `reading_minutes` | int（可空） | 预计算阅读时长（发布/编辑时写入） |
| `word_count` | int（可空） | 预计算字数 |
| `created_at` | timestamptz | 创建时间 |
| `published` | boolean | 兼容旧字段（`status` 的冗余，新代码用 status） |

### 表 `comments`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | int8 / PK | 主键 |
| `post_id` | int8 | 关联 `posts.id` |
| `name` | text | 评论者昵称 |
| `content` | text | 评论内容 |
| `status` | text | 评论状态（当前均为 `approved`，为审核模式预留） |
| `ip` | text（可空） | 评论者 IP 哈希（60 秒限流用，0009 迁移新增） |
| `reply` | text（可空） | 博主回复（null 表示未回复） |
| `replied_at` | timestamptz（可空） | 回复时间 |
| `created_at` | timestamptz | 创建时间 |

### 表 `guestbook_messages`（留言板）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | int8 / PK | 主键 |
| `name` | text | 留言者昵称 |
| `content` | text | 留言内容 |
| `ip` | text（可空） | 留言者 IP 哈希（60 秒限流用） |
| `reply` | text（可空） | 博主回复（null 表示未回复） |
| `replied_at` | timestamptz（可空） | 回复时间 |
| `created_at` | timestamptz | 创建时间 |

### 表 `messages`（站内私信）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | int8 / PK | 主键 |
| `name` | text | 发送者昵称（留空为「匿名」） |
| `contact` | text（可空） | 联系方式（邮箱/微信等，仅博主可见） |
| `content` | text | 私信内容 |
| `ip` | text（可空） | 发送者 IP（60 秒限流用） |
| `created_at` | timestamptz | 创建时间 |

### 表 `article_chunks`（AI 问答 RAG 分块）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | int8 / PK | 主键 |
| `post_id` | int8 | 关联 `posts.id`（删除级联清分块） |
| `chunk_index` | int | 块序号 |
| `content` | text | 块文本（约 500 字，重叠 50） |
| `embedding` | vector(1024) | BGE-M3 向量（pgvector，余弦索引） |

### 表 `site_settings`

站点配置（key-value，管理员后台「站点设置」可随时修改，前台即时生效）：
| key | 说明 |
|-----|------|
| `author_name` | 博主名字（默认「江来」） |
| `intro` / `bio` | 一句话简介 / 关于页个人介绍 |
| `github` / `email` | 社交链接 |
| `school` | 学校（显示在关于页，可空） |
| `school_url` | 学校官网链接（可空，填了学校名可点击跳转） |
| `avatar_url` | 头像图片 URL |
| `icp` | 备案号 |
| `skills` | 技能清单（JSON：group/name/level + 可选 description/years/icon/featured；后台「技能」编辑，/skills 页展示） |
| `projects` | 项目清单（JSON，后台「项目」编辑，/projects 页展示，支持封面上传） |

### 表 `tags` / `post_tags`
| 表 | 说明 |
|----|------|
| `tags` | 标签（`name` / `slug` 唯一） |
| `post_tags` | 文章-标签关联（多对多，复合主键） |

### 表 `profiles`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | uuid / PK | 关联 `auth.users.id` |
| `is_admin` | boolean | 是否为博主（仅博主可发文/删文） |
| `created_at` | timestamptz | 创建时间 |

### Storage bucket `post-images`

公开读的文章图片存储桶（INSERT / DELETE / UPDATE 仅博主可操作；项目封面也复用此桶的 `projects/` 目录）。`0024_storage_admin_update.sql` 的 UPDATE 策略用于 `upsert` 覆盖（如图片压缩脚本）。

> 以上建表 / 加列 / RLS / bucket 脚本见 `supabase/migrations/`（0001~0025），需在 Supabase 控制台 SQL Editor 手动执行，脚本幂等、不影响已有数据。

---

## 🛡️ 安全架构

所有**写操作**（发文、删文、评论、登录注册）都通过服务端 **Server Actions** 执行，浏览器端不再直接接触数据库：

```
浏览器表单 ──▶ Server Action（zod 校验 → 服务端 session 鉴权 → 写库 → revalidatePath）
                     │
                     ▼
              Supabase（RLS 行级安全策略：第二道防线）
```

| 防线 | 作用 |
|------|------|
| `proxy.ts` 路由守卫 | 用 `auth.getClaims()` 本地验签（ES256 + JWKS，失败回退 `getUser()`），未登录访问 `/admin` 重定向 `/login`；验证后的身份通过内部请求头传给页面，页面不再重复调用 Auth |
| Server Actions 鉴权 | `requireAdmin()`：仅 `profiles.is_admin = true` 的博主可发文/删文 |
| RLS 策略 | 即使拿到公开 anon key 直连数据库，非博主也无法增删改 `posts`；评论匿名可发但仅博主可删 |
| zod 校验 | 所有表单输入在服务端校验（标题/内容必填、slug 格式、评论限长） |
| 限流 | 数据库按 IP 哈希计数（`rate_limit_events`）：AI 3 次/分，评论/留言/私信 3 次/分；IP 只存 SHA-256 |
| 下载代理 | `/api/download` 解析 URL，仅放行 `*.supabase.co/storage/v1/object/public/*`（防 SSRF） |
| 安全响应头 | `X-Content-Type-Options`、`Referrer-Policy`、`X-Frame-Options: DENY`、`Permissions-Policy` |
| Storage 加固 | `post-images` 桶配置 MIME 白名单 + 20MB 单文件上限（浏览器直传场景） |

首次部署需在 Supabase 控制台执行：

```sql
-- 1. 在 SQL Editor 依次执行 supabase/migrations/0001_init.sql、0002_rls.sql
-- 2. 把自己的账号标记为博主：
INSERT INTO profiles (id, is_admin)
SELECT id, true FROM auth.users WHERE email = '你的登录邮箱'
ON CONFLICT (id) DO UPDATE SET is_admin = true;
-- 3.（推荐）关闭公开注册：Authentication → Sign In / Up → Allow new users to sign up 关闭
```

---

## 🌐 部署

代码推送到 GitHub（`main` 分支）后，Vercel 自动构建部署：

```bash
git add .
git commit -m "更新内容"
git push origin main
```

- 域名：Vercel 项目 → Settings → Domains 绑定 `jianglai520.com`
- 环境变量：Vercel 项目 → Settings → Environment Variables
- 函数区域：**`sin1`（新加坡）**，与 Supabase `ap-southeast-1` 同区域；修改后必须重新部署
- 图片优化：**已关闭**（`images.unoptimized`），因为 Hobby 每月 5K 额度用满后会返回 `402`；改为上传时浏览器端压缩
- 私有仓库可见性：`my-blog` remote 为 SSH 方式

> 🌐 网络提示：个别大陆网络（如教育网）可能拦截 Vercel 默认 anycast IP。此时把域名 A 记录指向一个可达的 Vercel anycast（如 `76.76.21.241`）即可，详见桌面 `服务器网络与备案指南.md`。

> 🩺 排障：若 push 后 GitHub Actions 正常但 **Vercel 没自动部署**，检查 Vercel 项目 → Settings → Git → **Require Verified Commits** 开关是否误开（开启后只部署 GPG 签名提交，普通 commit 被静默跳过）；其次查 Usage 限额与 Git 连接状态。

---

## 📚 相关文档

| 文档 | 内容 |
|------|------|
| `FRONTEND_OPTIMIZATION.md` | 上一轮前端视觉/SEO 优化的规划与实施记录、踩坑记录 |
| 优化方案（桌面 `my-blog搭建/` 文件夹） | 全栈重构的完整分析与分阶段路线图 |
| Git 代码回退回滚命令速查（桌面 `my-blog搭建/`） | 撤销未提交/未推送/已推送改动的完整命令（revert vs reset+force） |

---

## ⚠️ 已知限制

当前版本为 MVP，存在以下待改进点（详见优化方案文档）：

1. ~~**安全**：数据增删改由浏览器端直接调用 Supabase anon key 完成~~ ✅ **已解决（Phase 0）**
2. ~~**内容**：正文为纯文本，无 Markdown / 富文本 / 代码高亮~~ ✅ **已解决（Phase 1）**：Markdown 渲染 + TipTap 编辑器 + 草稿/编辑 + 图片上传，迁移已执行、测试通过
3. ~~**功能**：无标签分类、搜索、分页、浏览量统计、RSS~~ ✅ **已解决（Phase 3）**：标签系统 + 搜索 + 分页 + 浏览量 + RSS + 归档 + 关于页 + 评论管理，迁移已执行、测试通过
4. ~~**工程化**：无自动化测试、CI 流水线、错误监控、数据备份策略~~ ✅ **已解决（Phase 4）**：Vitest 单元测试（77 用例）+ Playwright E2E（9 用例）+ GitHub Actions CI + Sentry 错误监控 + Vercel Analytics + 备份与恢复演练（见 `BACKUP.md`；Sentry DSN 配置后生效）
5. **视觉风格**：博主对当前前端观感不满意（认为"太小儿科"）；已落地代码块双主题、图片 lightbox、阅读进度条、TOC 等体验深化；**视觉方向已定案为「青绿毛玻璃风」**（参考 lvyovo-wiki.tech），P0 已实施：品牌色 + 青色设计系统、`.glass` 毛玻璃卡片、首页卡片重构、深浅色玻璃适配；项目展示页已拆列表 + 详情
6. **图片链路**：已关闭 Vercel 图片优化（Hobby 每月 5K 额度用满），图片按存储原尺寸从 Supabase 直出，没有响应式 `srcset`；体积控制依赖上传时压缩
7. **动态路由**：`/tags/[slug]`（query 分页）与 `/search` 仍是每次请求服务端渲染；只有首页、文章页、项目详情是 ISR
8. **大陆网络**：部分校园网/运营商会拦截特定的 Vercel anycast IP，可能需要把 A 记录指向可达的 Vercel anycast（见桌面 `服务器网络与备案指南.md`）

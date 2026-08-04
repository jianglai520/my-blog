# ✨ jianglai520 — 我的个人博客

基于 **Next.js 16 + React 19 + Supabase + Vercel** 搭建的全栈个人博客，支持文章发布、后台管理、登录保护、评论区与 SEO 优化。

- 🌐 线上地址：**https://jianglai520.com**
- 📦 代码仓库：`git@github.com:jianglai520/my-blog.git`
- 🎨 视觉风格：霓虹紫 → 深色渐变 + 浅色模式（Tailwind CSS 4 设计系统）

---

## 🛠️ 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| **Next.js** | 16.2.9 | 前端框架（App Router + Turbopack） |
| **React** | 19.2.4 | UI 组件 |
| **TypeScript** | ^5 | 类型安全 |
| **Tailwind CSS** | ^4 | 样式（CSS-first `@theme` 设计系统） |
| **Supabase** | ^2.108 | 认证（Auth）+ 写操作（RLS 防线） |
| **Drizzle ORM** | ^0.45 | 公开读数据层（schema 即类型真相，直连 Postgres） |
| **Vercel** | — | 托管部署（Git 推送自动部署） |

> 运行环境要求：Node.js ≥ 20.9（开发环境使用 Node 24.14.0）。

---

## 🧪 工程质量（Phase 4）

| 能力 | 说明 |
|------|------|
| 单元测试 | **Vitest**（60 个用例）：`lib/format`、zod 校验层、Server Actions 权限分支、数据层纯函数与 mock 查询、组件渲染（RTL） |
| E2E 测试 | **Playwright**（chromium 9 用例）：首页/文章/搜索/RSS/登录（`npm run test:e2e`，登录用例需 `TEST_EMAIL`/`TEST_PASSWORD`） |
| CI 流水线 | **GitHub Actions**（`.github/workflows/ci.yml`）：push/PR 自动跑 lint + 单测 + 构建（+ E2E） |
| 错误监控 | **Sentry**（`SENTRY_DSN` 配置后生效）+ 自定义 `error.tsx` / `global-error.tsx` |
| 访问分析 | **Vercel Analytics**（`@vercel/analytics`，Dashboard 开启） |
| 数据备份 | 见 **`BACKUP.md`**：`scripts/backup.mjs` 导出 JSON + `scripts/restore-drill.mjs` 恢复演练（临时 schema 校验，已执行通过） |
| 性能优化 | 首页数据缓存（`unstable_cache` 60s + `updateTag` 即时失效，响应约 4.7 倍提速）；发布链路优化（编辑器 ref 提交，编辑期零序列化/零重渲染，支持大文档） |

```bash
npm test          # 单元测试
npm run test:e2e  # E2E 测试（需先 build）
npm run lint      # ESLint
```

> CI 的 build/E2E 需要 GitHub Secrets：`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`DATABASE_URL`、（E2E 可选）`TEST_EMAIL`/`TEST_PASSWORD`。

---

## ✅ 已实现功能

| 功能 | 说明 |
|------|------|
| 📄 首页 | 英雄区 + 文章卡片列表（hover 发光、标签、阅读数）+ **分页** |
| 📖 文章详情页 | 语义化 slug 链接（兼容旧数字 id，301 跳转）；显示标签、**浏览量**；阅读进度条 + 文章目录（TOC） |
| 📝 **Markdown 正文** | 标题 / 列表 / **代码高亮（shiki 深浅双主题，无语言代码块自动补默认）** / 表格 / 引用 / 图片完整渲染 |
| 🔍 **图片点击放大** | 文章正文图片点击查看大图（lightbox，点遮罩 / ✕ / Esc 关闭） |
| 📋 **代码块复制** | 代码块右上角一键复制按钮 |
| 🖊️ **富文本编辑器** | TipTap 所见即所得，保存为 Markdown |
| 📥 **草稿与编辑** | 存草稿 / 发布 / 编辑续写，草稿永不公开 |
| 🖼️ **图片上传** | 编辑器内选择本地图片 → Supabase Storage → 自动插入 |
| 📎 **附件上传** | 文章可插入 PDF/Word/Excel/压缩包，生成下载链接（≤20MB） |
| 🏷️ **标签系统** | 写文章打标签；`/tags/xxx` 标签页；首页卡片显示标签 |
| 🔍 **搜索** | 导航搜索框（防抖），标题/摘要/正文模糊搜索 |
| 📡 **RSS** | `/feed.xml`（Atom），layout 注入订阅链接 |
| 🗂 **归档 / 关于** | 按年月归档页、个人关于页（**个人信息后台可配置**） |
| ⚙️ **站点设置** | 后台可随时修改博主名/简介/GitHub/邮箱/**头像（可上传或填 URL）**/备案号，前台即时生效 |
| 🌗 **深浅色主题** | header 切换按钮；跟随系统偏好 + 手动选择记忆（localStorage） |
| 💬 评论区 | 昵称 + 内容，即时显示；后台可单删 / **多选批量删除**（IP 60 秒限流） |
| 💬 **留言板** | 独立留言页 `/guestbook`（导航入口），匿名可发 + IP 限流，后台可删 |
| 🔐 登录 | Supabase Auth 邮箱登录（单管理员） |
| 🛡️ 后台管理 | 服务端鉴权；文章管理（发布/编辑/删除/草稿/**多选批量删除**）+ **评论管理**（单删/批量删除） |
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
│   │   └── uploads.ts              # 图片上传（Supabase Storage）
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
│   │   └── Editor.tsx              # TipTap 富文本编辑器（client）
│   ├── posts/
│   │   └── [identifier]/
│   │       ├── page.tsx            # 文章详情页（slug/id 双解析）
│   │       └── CommentForm.tsx     # 评论表单（调用 Server Action）
│   ├── admin/
│   │   ├── page.tsx                # 后台入口（服务端鉴权，未登录/非博主重定向）
│   │   ├── AdminClient.tsx         # 后台主界面（导航 + Tab + 组合子模块）
│   │   ├── PostForm.tsx            # 写作 / 编辑表单（TipTap 编辑器）
│   │   ├── PostList.tsx            # 文章管理列表（编辑/删除）
│   │   ├── CommentManager.tsx      # 评论管理列表
│   │   ├── SettingsForm.tsx        # 站点设置（含头像上传）
│   │   └── shared.ts               # 共享输入样式 + AdminPost 类型
│   ├── login/
│   │   └── page.tsx                # 登录页（useActionState 调 Server Actions）
│   ├── tags/[slug]/                # 标签页（按标签筛选文章）
│   ├── archives/                   # 归档页（按年月分组）
│   ├── about/                      # 关于页
│   ├── search/                     # 搜索页
│   ├── feed.xml/                   # RSS 订阅（Atom）
│   ├── og/                         # 动态 OpenGraph 分享图（edge，@vercel/og）
│   ├── robots.ts                   # 搜索引擎爬虫规则
│   ├── sitemap.ts                  # 站点地图（动态生成）
│   └── favicon.ico
├── db/
│   └── schema.ts                    # Drizzle schema（类型真相，数据库结构变更入口）
├── lib/
│   ├── server/
│   │   └── supabase.ts             # 服务端客户端 + 鉴权工具（server-only 保护）
│   ├── db.ts                       # Drizzle 客户端（连接池单例，仅服务端读路径）
│   ├── posts.ts                    # 公开读数据层（Drizzle，强制 status='published' 过滤）
│   ├── validations/                # zod 校验 schema（posts/comments/auth，服务端客户端共用）
│   ├── format.ts                   # 中文日期格式化 / slugify / stripMarkdown
├── proxy.ts                        # 路由守卫（Next 16 中 middleware 更名为此）
├── drizzle.config.ts               # drizzle-kit 配置（schema → 迁移 SQL）
├── supabase/
│   └── migrations/                 # 数据库迁移 SQL（0001~0011，手动在 SQL Editor 执行）
├── scripts/
│   ├── generate-og.mjs             # 一次性脚本：生成 public/og.png
│   ├── backup.mjs                  # 数据库备份脚本（导出全表 JSON 到 backups/）
│   └── restore-drill.mjs           # 备份恢复演练（临时 schema 重建 + 行数校验，安全不碰生产表）
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
```

---

## 🔑 环境变量（.env.local）

| 变量 | 说明 | 获取位置 |
|------|------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL | Supabase 控制台 → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 公开匿名密钥（anon key） | 同上 |
| `DATABASE_URL` | **服务端专用**数据库连接串（Drizzle 直连用，**不带 NEXT_PUBLIC_ 前缀**） | Supabase → Project Settings → Database → Connection string → **Transaction pooler**（端口 6543） |

> ⚠️ `DATABASE_URL` 是能直连数据库的服务端密钥：只在 `.env.local` / Vercel 服务端环境变量里，**绝不暴露给浏览器**（Vercel 配置时**不勾选** "Expose to Client"）。

示例：

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

> ⚠️ `.env.local` 已被 `.gitignore` 排除，不会提交到仓库。Vercel 部署时需在项目设置 → Environment Variables 中单独配置。

---

## 🗄️ 数据库结构（Supabase）

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
| `view_count` | int | 浏览量（RPC `increment_view` 递增，客户端 cookie 防刷） |
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
| `ip` | text（可空） | 评论者 IP（60 秒限流用，0009 迁移新增） |
| `created_at` | timestamptz | 创建时间 |

### 表 `guestbook_messages`（留言板）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | int8 / PK | 主键 |
| `name` | text | 留言者昵称 |
| `content` | text | 留言内容 |
| `ip` | text（可空） | 留言者 IP（60 秒限流用） |
| `created_at` | timestamptz | 创建时间 |

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

公开读的文章图片存储桶（仅博主可上传/删除，RLS 策略见 `0002_rls.sql` / `0003_markdown_draft.sql`）。

> 以上建表 / 加列 / RLS / bucket 脚本见 `supabase/migrations/`（0001~0011），需在 Supabase 控制台 SQL Editor 手动执行，脚本幂等、不影响已有数据。

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
| `proxy.ts` 路由守卫 | 未登录访问 `/admin` 重定向 `/login`（Next 16，替代 middleware） |
| Server Actions 鉴权 | `requireAdmin()`：仅 `profiles.is_admin = true` 的博主可发文/删文 |
| RLS 策略 | 即使拿到公开 anon key 直连数据库，非博主也无法增删改 `posts`；评论匿名可发但仅博主可删 |
| zod 校验 | 所有表单输入在服务端校验（标题/内容必填、slug 格式、评论限长） |

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
- 私有仓库可见性：`my-blog` remote 为 SSH 方式

> 🩺 排障：若 push 后 GitHub Actions 正常但 **Vercel 没自动部署**，检查 Vercel 项目 → Settings → Git → **Require Verified Commits** 开关是否误开（开启后只部署 GPG 签名提交，普通 commit 被静默跳过）；其次查 Usage 限额与 Git 连接状态。

---

## 📚 相关文档

| 文档 | 内容 |
|------|------|
| `FRONTEND_OPTIMIZATION.md` | 上一轮前端视觉/SEO 优化的规划与实施记录、踩坑记录 |
| 优化方案（桌面 `my-blog搭建/` 文件夹） | 全栈重构的完整分析与分阶段路线图 |

---

## ⚠️ 已知限制

当前版本为 MVP，存在以下待改进点（详见优化方案文档）：

1. ~~**安全**：数据增删改由浏览器端直接调用 Supabase anon key 完成~~ ✅ **已解决（Phase 0）**
2. ~~**内容**：正文为纯文本，无 Markdown / 富文本 / 代码高亮~~ ✅ **已解决（Phase 1）**：Markdown 渲染 + TipTap 编辑器 + 草稿/编辑 + 图片上传，迁移已执行、测试通过
3. ~~**功能**：无标签分类、搜索、分页、浏览量统计、RSS~~ ✅ **已解决（Phase 3）**：标签系统 + 搜索 + 分页 + 浏览量 + RSS + 归档 + 关于页 + 评论管理，迁移已执行、测试通过
4. ~~**工程化**：无自动化测试、CI 流水线、错误监控、数据备份策略~~ ✅ **已解决（Phase 4）**：Vitest 单元测试（60 用例）+ Playwright E2E（9 用例）+ GitHub Actions CI + Sentry 错误监控 + Vercel Analytics + 备份与恢复演练（见 `BACKUP.md`；Sentry DSN 配置后生效）
5. **视觉风格**：博主对当前前端观感仍不满意（认为"太小儿科"）；已落地代码块双主题、图片 lightbox、阅读进度条、TOC 等体验深化；整体视觉方向（现代极简 / 杂志编辑 / 终端极客等）**待定案**（P1 优先级，见桌面优化方案文档）

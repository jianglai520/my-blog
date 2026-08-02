# ✨ jianglai520 — 我的个人博客

基于 **Next.js 16 + React 19 + Supabase + Vercel** 搭建的全栈个人博客，支持文章发布、后台管理、登录保护、评论区与 SEO 优化。

- 🌐 线上地址：**https://jianglai520.com**
- 📦 代码仓库：`git@github.com:jianglai520/my-blog.git`
- 🎨 视觉风格：霓虹紫 → 深色渐变（Tailwind CSS 4 设计系统）

---

## 🛠️ 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| **Next.js** | 16.2.9 | 前端框架（App Router + Turbopack） |
| **React** | 19.2.4 | UI 组件 |
| **TypeScript** | ^5 | 类型安全 |
| **Tailwind CSS** | ^4 | 样式（CSS-first `@theme` 设计系统） |
| **Supabase** | ^2.108 | 数据库（PostgreSQL）+ 认证（Auth） |
| **Vercel** | — | 托管部署（Git 推送自动部署） |

> 运行环境要求：Node.js ≥ 20.9（开发环境使用 Node 24.14.0）。

---

## ✅ 已实现功能

| 功能 | 说明 |
|------|------|
| 📄 首页 | 英雄区（自我介绍/头像）+ 最新文章卡片列表（hover 发光） |
| 📖 文章详情页 | 语义化 slug 链接（兼容旧数字 id 链接，301 跳转） |
| 📝 **Markdown 正文** | 标题 / 列表 / **代码高亮（shiki）** / 表格 / 引用 / 图片完整渲染 |
| 🖊️ **富文本编辑器** | TipTap 所见即所得，保存为 Markdown |
| 📥 **草稿与编辑** | 可存草稿 / 发布 / 编辑续写，草稿永不公开 |
| 🖼️ **图片上传** | 编辑器内选择本地图片 → 上传 Supabase Storage → 自动插入 |
| 🔖 SEO | `metadataBase` / OG 图 / canonical / `sitemap.xml` / `robots.txt` |
| 💬 评论区 | 昵称 + 内容，发布后自动刷新 |
| 🔐 登录 | Supabase Auth 邮箱登录（单管理员） |
| 🛡️ 后台管理 | 服务端鉴权；发布/编辑/删除文章、草稿管理 |
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
│   │   ├── Markdown.tsx            # Markdown → HTML 渲染（RSC，代码高亮）
│   │   └── Editor.tsx              # TipTap 富文本编辑器（client）
│   ├── posts/
│   │   └── [identifier]/
│   │       ├── page.tsx            # 文章详情页（slug/id 双解析）
│   │       └── CommentForm.tsx     # 评论表单（调用 Server Action）
│   ├── admin/
│   │   ├── page.tsx                # 后台入口（服务端鉴权，未登录/非博主重定向）
│   │   └── AdminClient.tsx         # 后台交互（编辑器/草稿/编辑/删除）
│   ├── login/
│   │   └── page.tsx                # 登录页（useActionState 调 Server Actions）
│   ├── robots.ts                   # 搜索引擎爬虫规则
│   ├── sitemap.ts                  # 站点地图（动态生成）
│   └── favicon.ico
├── lib/
│   ├── server/
│   │   └── supabase.ts             # 服务端客户端 + 鉴权工具（server-only 保护）
│   ├── posts.ts                    # 公开读数据层：文章/评论查询（含列降级兼容）
│   ├── format.ts                   # 中文日期格式化 / slugify / stripMarkdown
│   └── supabase.js                 # anon 客户端（仅服务端公开读引用）
├── proxy.ts                        # 路由守卫（Next 16 中 middleware 更名为此）
├── supabase/
│   └── migrations/                 # 数据库迁移 SQL（0001 表结构 / 0002 RLS / 0003 Markdown+草稿+bucket）
├── scripts/
│   └── generate-og.mjs             # 一次性脚本：生成 public/og.png
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
| `created_at` | timestamptz | 创建时间 |
| `published` | boolean | 兼容旧字段（`status` 的冗余，新代码用 status） |

### 表 `comments`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | int8 / PK | 主键 |
| `post_id` | int8 | 关联 `posts.id` |
| `name` | text | 评论者昵称 |
| `content` | text | 评论内容 |
| `created_at` | timestamptz | 创建时间 |

### 表 `profiles`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | uuid / PK | 关联 `auth.users.id` |
| `is_admin` | boolean | 是否为博主（仅博主可发文/删文） |
| `created_at` | timestamptz | 创建时间 |

### Storage bucket `post-images`

公开读的文章图片存储桶（仅博主可上传/删除，RLS 策略见 `0002_rls.sql` / `0003_markdown_draft.sql`）。

> 以上建表 / 加列 / RLS / bucket 脚本见 `supabase/migrations/`（0001~0003），需在 Supabase 控制台 SQL Editor 手动执行，脚本幂等、不影响已有数据。

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
2. ~~**内容**：正文为纯文本，无 Markdown / 富文本 / 代码高亮~~ ✅ **已解决（Phase 1）**：Markdown 渲染 + TipTap 编辑器 + 草稿/编辑 + 图片上传（代码已完成，需执行 `0003_markdown_draft.sql` 迁移后正式生效）
3. **功能**：无标签分类、搜索、分页、浏览量统计、RSS。
4. **工程化**：无自动化测试、CI 流水线、错误监控、数据备份策略。

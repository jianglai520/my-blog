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
| 🔖 SEO | `metadataBase` / OG 图 / canonical / `sitemap.xml` / `robots.txt` |
| 💬 评论区 | 昵称 + 内容，发布后自动刷新 |
| 🔐 登录/注册 | Supabase Auth 邮箱密码登录 |
| 🛡️ 后台管理 | 登录保护；发布文章（标题/slug/摘要/封面图/正文）、文章列表、删除 |
| 🌐 自定义域名 | jianglai520.com 已绑定 Vercel |
| 🖼️ 封面图 | 支持远程图床（Supabase Storage / Unsplash / jsDelivr） |

---

## 📁 项目结构

```
my-blog/
├── app/
│   ├── layout.tsx                  # 全局布局（字体 / metadata / 主题）
│   ├── globals.css                 # 全局样式 + Tailwind v4 @theme 设计系统
│   ├── page.tsx                    # 首页（英雄区 + 文章列表）
│   ├── components/
│   │   ├── SiteHeader.tsx          # 顶部导航（毛玻璃）
│   │   └── SiteFooter.tsx          # 页脚（关于 / 社交 / 版权）
│   ├── posts/
│   │   └── [identifier]/
│   │       ├── page.tsx            # 文章详情页（slug/id 双解析）
│   │       └── CommentForm.tsx     # 评论表单（客户端组件）
│   ├── admin/
│   │   └── page.tsx                # 后台管理（发布/删除文章）
│   ├── login/
│   │   └── page.tsx                # 登录/注册页
│   ├── robots.ts                   # 搜索引擎爬虫规则
│   ├── sitemap.ts                  # 站点地图（动态生成）
│   └── favicon.ico
├── lib/
│   ├── posts.ts                    # 数据层：文章/评论查询（含列降级兼容）
│   ├── format.ts                   # 中文日期格式化 / slugify
│   └── supabase.js                 # Supabase 客户端（浏览器直接使用）
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
| `slug` | text / unique（可空） | 语义化链接，如 `my-first-post` |
| `title` | text | 标题 |
| `content` | text | 正文（目前为纯文本，按换行分段） |
| `excerpt` | text（可空） | 摘要，用于列表卡片与分享 |
| `cover_image` | text（可空） | 封面图 URL |
| `created_at` | timestamptz | 创建时间 |
| `published` | boolean | 是否发布 |

> 扩展字段 `slug` / `excerpt` / `cover_image` 是后加的，代码层已做「列不存在自动降级」兼容（`lib/posts.ts` 中 `42703` 错误兜底），未迁移也能正常运行，但建议在 Supabase 控制台补齐这三列并给 `slug` 建唯一索引。

### 表 `comments`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | int8 / PK | 主键 |
| `post_id` | int8 | 关联 `posts.id` |
| `name` | text | 评论者昵称 |
| `content` | text | 评论内容 |
| `created_at` | timestamptz | 创建时间 |

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

1. **安全**：数据增删改由浏览器端直接调用 Supabase anon key 完成，依赖数据库 RLS 策略约束权限；若 RLS 未正确配置，存在越权风险（如任意登录用户删他人文章）。
2. **内容**：正文为纯文本，无 Markdown / 富文本 / 代码高亮。
3. **功能**：无标签分类、搜索、分页、浏览量统计、RSS。
4. **工程化**：无自动化测试、CI 流水线、错误监控、数据备份策略。

# my-blog 前端优化 · 规划与实施记录

> 项目：`C:\Users\如玧\Desktop\my-blog`
> 域名：https://jianglai520.com
> 技术栈：Next.js 16.2.9 (Turbopack) · React 19 · Tailwind CSS 4 · Supabase
> 状态：**已实施，`npm run build` 通过**

本文档记录本轮前端优化的方向、已完成的改动与后续要点，供后续维护参考。

---

## 一、优化方向（用户确认）

用户选定了全部五个方向：

1. **视觉重设计**：现代紫 → 深色渐变霓虹风。
2. **UX 与交互**：首页英雄区自介绍 + 卡片 hover 发光，后台表单增强。
3. **SEO 与分享**：metadataBase、OG 图、sitemap、robots、语义化 slug 链接。
4. **性能与可访问性**：静态预生成、减少运行时依赖、`prefers-reduced-motion` 尊重。
5. **装饰**：品牌色、顶部渐变细线、发光阴影（用户明确放弃粒子动画背景）。

---

## 二、已完成的改动

### 1. 设计系统（全局）

- **`app/globals.css`**（Tailwind v4 `@theme`，CSS-first，无 config 文件）：
  - 品牌紫 `--color-brand-*`、霓虹 `--color-glow-*`、深色墨阶 `--color-ink-*`、前景 `--color-fg` / `--color-fg-muted` / `--color-fg-faint`。
  - 发光阴影 `--shadow-glow` / `--shadow-glow-lg`，字体变量 `--font-sans` / `--font-display`。
  - `<body>` 深色底 + 固定紫色径向渐变氛围（`body::before`）。
  - 工具类：`.text-gradient-brand`、`.glow-hover`、`.gradient-top-line`、`:focus-visible`。
  - 全局 `prefers-reduced-motion` 关闭动画。

- **`app/layout.tsx`**：
  - `next/font/google`：`Noto_Sans_SC` + `Space_Grotesk`（变量 `--font-noto-sans-sc` / `--font-space-grotesk`）。
  - 完整 `metadata`：`metadataBase` = `https://jianglai520.com`、`title.template`、`openGraph`（`/og.png`）、`icons`。
  - `viewport` 导出（themeColor `#07070f`、dark）。
  - 包一层 `SiteHeader` / `SiteFooter`。

### 2. 布局组件

- **`app/components/SiteHeader.tsx`**（新增）：毛玻璃深色导航、品牌标记「J」、首页链接、顶部渐变细线；**移除后台入口**（后台仅通过直接访问 `/admin`）。
- **`app/components/SiteFooter.tsx`**（新增）：About / 社交占位链接 / 版权 + 备案号占位。

### 3. 首页（`app/page.tsx`）

- 英雄区：头像圆形占位（TODO：替换为真实头像）+ 自我介绍「你好，我是航酱」+ 渐变品牌标题。
- 文章卡片：hover 发光、`next/image` 封面（若有）、摘要或正文截断。
- 链接到 `/posts/<slug 或 id>`，**移除「写文章」后台按钮**。

### 4. 路由与文章页

- 将动态段统一为单个 `app/posts/[identifier]/page.tsx`（原 `[slug]` 与 `[id]` 冲突，需合并，见 §五-2）。
- `generateMetadata` 输出 canonical + OG；旧数字 id URL 用 `permanentRedirect`（301）跳到 slug。
- 评论表单 `CommentForm.tsx` 改深色主题、补全 label、修复错误提示。

### 5. 数据层（`lib/`）

- **`lib/posts.ts`**：统一 `Post` / `Comment` 类型；`getPublishedPosts()`、`getPostByIdentifier()`（先 slug 后 id 兜底）、`getComments()`；显式 `POST_SELECT`，并对数据库缺少新列时自动降级到旧列（`code 42703`），站点不因未跑迁移而报错。
- **`lib/format.ts`**：`formatDate` / `formatDateTime`（中文）、`slugify`（由标题生成 slug 建议）。

### 6. SEO / 分享

- **`app/robots.ts`**：`userAgent: "*"`，disallow `/admin`、`/login`、`/api/`；声明 sitemap。
- **`app/sitemap.ts`**：首页 + 全部已发布文章（lastModified、priority、frequency）。
- **`public/og.png`**（1200×630）：由 `scripts/generate-og.mjs`（sharp 渲染品牌 SVG）一次性生成，用于分享卡片。

### 7. 工程配置

- **`next.config.ts`**：设置 `turbopack.root`（避免把用户主目录的 `package-lock.json` 误判为工作区根）、`images.remotePatterns`（`**.supabase.co`、`images.unsplash.com`、`cdn.jsdelivr.net`）。
- **Node 版本**：Next 16 需 Node ≥ 20.9；当前开发环境用 `nvm use 24.14.0` + `$env:Path += ";C:\nvm4w\nodejs"`。

---

## 三、验证结果

```
✓ Compiled successfully
✓ TypeScript 通过
Route (app)
├ ○ /                         （静态）
├ ○ /_not-found
├ ○ /admin
├ ○ /login
├ ƒ /posts/[identifier]       （按需服务端渲染）
└ ○ /robots.txt   ○ /sitemap.xml
```

`npm run build` 通过；`robots.txt` / `sitemap.xml` 均已静态生成。

---

## 四、待办 / 提醒

1. **数据库迁移（需用户手动在 Supabase 执行）**：向 `posts` 表添加
   `slug text unique`、`excerpt text`、`cover_image text` 三列，
   并给 `slug` 建唯一索引。前端已做好列降级，**不迁移也不会报错**，
   但 slug 相关能力（语义化链接、封面图、摘要）需要字段存在后才能生效。
2. **替换真实头像**：首页英雄区当前为「J」字母圆形占位（`app/page.tsx` 内含 TODO）。
3. **备案号 / 社交链接**：`SiteFooter.tsx` 目前为占位，需替换为真实信息。
4. **后台表单已扩展**：写新文章时可填 slug / 摘要 / 封面图 URL（封面图源需在 `next.config.ts` 允许）。
5. `scripts/generate-og.mjs` 为一次性脚本，改品牌色后可重新运行以再生成 og 图。

---

## 五、踩坑记录

1. **Node 版本**：Next 16 需要 Node ≥ 20.9，默认 nvm 为 16.20.2 无法构建；
   `nvm use 24.14.0` 后当前 shell 的 PATH 不会自动刷新，需手动追加 `C:\nvm4w\nodejs`。
2. **App Router 动态段冲突**：同一父目录下不能同时存在 `[id]` 与 `[slug]` 两个动态段（构建报错）。
   方案：合并为 `[identifier]`，按字母先 slug 后 id 解析，数字 id 旧链接 301 到 slug。
3. **Turbopack 工作区根误判**：误读主目录的 `package-lock.json` 为 root，用 `turbopack.root` 显式指定项目根解决。
4. **PowerShell 方括号路径**：`[id]` / `[slug]` 会被当作通配字符类，
   删除/重命名必须用 `-LiteralPath`，否则静默不做任何操作。
5. **`next lint` 已移除**：Next 16 中 lint 改由 `eslint` 命令直跑（`package.json` 的 `"lint": "eslint"`）。

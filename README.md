# ✨ jianglai520 — My Personal Blog

A full-stack personal blog built with **Next.js 16 + React 19 + Supabase + Vercel**, featuring article publishing, an admin dashboard, auth, comments, and SEO.

- 🌐 Live site: **https://jianglai520.com**
- 📦 Repository: `git@github.com:jianglai520/my-blog.git`
- 🎨 Visual style: teal glassmorphism (brand `#35bfab` + cyan `#1fc9e7`, adaptive light/dark, Tailwind CSS 4 design system)

> 📖 中文版：[README.zh-CN.md](./README.zh-CN.md)

---

## 🛠️ Tech Stack

| Tech | Version | Purpose |
|------|---------|---------|
| **Next.js** | 16.2.9 | Frontend framework (App Router + Turbopack) |
| **React** | 19.2.4 | UI components |
| **TypeScript** | ^5 | Type safety |
| **Tailwind CSS** | ^4 | Styling (CSS-first `@theme` design system) |
| **Supabase** | ^2.108 | Auth + writes (RLS defense) |
| **Drizzle ORM** | ^0.45 | Public-read data layer (schema as type truth, direct Postgres) |
| **Vercel** | — | Hosting / deployment (auto-deploy on git push) |
| **Fonts** | Noto Serif SC + Ma Shan Zheng + JetBrains Mono | Runtime-loaded from `fonts.googleapis.cn`; serif site-wide, brush for the hero greeting, mono for code (no build-time fetch; graceful fallback) |

> Runtime requirement: Node.js ≥ 20.9 (dev environment uses Node 24.14.0).

---

## 🧪 Engineering Quality (Phase 4)

| Capability | Description |
|-----------|-------------|
| Unit tests | **Vitest** (77 cases): `lib/format`, zod validation, Server Actions auth branches, pure data-layer functions with mocked queries, component rendering (RTL) |
| E2E tests | **Playwright** (9 chromium cases): homepage/post/search/RSS/login (`npm run test:e2e`; login cases need `TEST_EMAIL`/`TEST_PASSWORD`) |
| CI pipeline | **GitHub Actions** (`.github/workflows/ci.yml`): lint + unit tests + build (+ E2E) on push/PR |
| Error monitoring | **Sentry** (active once `SENTRY_DSN` is set) + custom `error.tsx` / `global-error.tsx` |
| Analytics | **Vercel Analytics** (`@vercel/analytics`, enable in dashboard) |
| Data backup | See **`BACKUP.md`**: `scripts/backup.mjs` exports JSON + `scripts/restore-drill.mjs` restore drill (temporary schema validation, verified) |
| Performance | Homepage **dynamic rendering + data-layer caching**: `unstable_cache` (60s) + `updateTag` instant invalidation (posts/tags/stats/site settings), production homepage **17–21ms**; publish pipeline optimization (editor ref submission, zero serialization/re-render while editing); upload optimization (direct-to-Supabase-Storage, no Server Action hop) |

```bash
npm test          # unit tests
npm run test:e2e  # E2E tests (requires build first)
npm run lint      # ESLint
```

> CI build/E2E requires GitHub Secrets: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL`, and optionally `TEST_EMAIL`/`TEST_PASSWORD` for E2E login.

---

## ✅ Features

| Feature | Description |
|---------|-------------|
| 📄 Homepage | Hero (avatar/gradient title/**blob animation**/**stats row**/**learn-more CTA**) + post card grid (**teal glass cards**: 16:9 cover on top + glass content, hover lift/glow, **reading time**, tags, view count) + **pinned posts first** + **hot tags** + **pagination** |
| 📖 Post detail | Semantic slug links (legacy numeric id compatible, 301 redirect); tags, **view count**, **reading time (minutes)**; reading progress bar + table of contents (TOC) |
| 📝 **Markdown body** | Headings / lists / **code highlighting (shiki light-dark themes, auto fallback for unlabeled blocks)** / tables / blockquotes / images; professional typography; inline code rendered clean (Typography auto-backticks disabled) |
| 🔍 **Image lightbox** | Click body images to zoom (click overlay / ✕ / Esc to close) |
| 📋 **Code copy** | One-click copy button on code blocks |
| 🖊️ **Rich text editor** | TipTap WYSIWYG, saved as Markdown; **source mode (MD) is the default** for raw Markdown, preserving tables/code fences |
| 📥 **Drafts & editing** | Save draft / publish / edit, drafts never public |
| 🖼️ **Image upload** | Editor image **direct browser upload** to Supabase Storage (no server hop) → auto insert |
| 🖼️ **Cover upload** | Local cover upload (≤5MB, direct browser upload, auto-fills URL) or paste external URL |
| 📎 **Attachment upload** | Insert PDF/Word/Excel/zip, generate download links (≤20MB, direct browser upload) |
| 😀 **Emoji insertion** | Editor toolbar emoji panel, grouped emojis inserted at cursor |
| 🏷️ **Tag system** | Tag posts; `/tags/xxx` tag pages; tags on cards |
| 🔍 **Search** | Nav search box (debounced), fuzzy search over title/excerpt/content |
| 📡 **RSS** | `/feed.xml` (Atom), injected into layout |
| 🗂 **Archives / About** | Timeline archive page (gradient timeline, collapsible month groups, changelog-style commit rows with mono date/short hash/reading time/word count); **developer-profile about page** (sticky profile card, pinned projects, skills, experience, private-message form, display limits) |
| ⚙️ **Site settings** | Edit author name/intro/GitHub/email/**avatar (upload or URL)**/ICP from admin, instant effect |
| 🌗 **Light/dark theme** | Header toggle; follows system + manual choice persisted (localStorage) |
| 💬 Comments | Name + content, instant display; admin single delete / **bulk delete** (60s IP rate limit) |
| 💬 **Guestbook** | Standalone `/guestbook` page in **letter/editorial style** (serif letters, signature line, decorative quote), anonymous + IP rate limit, admin delete |
| ✉️ **Private messages** | About-page message form (name/contact optional, **content only visible to owner**), anonymous + IP rate limit, admin view/delete |
| 🏷️ **Skills page** | `/skills` **Bento + radar chart** (ability distribution by group, average-score rings), **core skills** showcase, level labels; admin supports **per-skill save/delete**, group reordering, live preview, and optional description/years/icon/featured fields |
| 📁 **Projects** | `/projects` list (**compact glass cards**, click into `/projects/[slug]` detail page with full description); each project is **saved/deleted independently** in admin (no batch overwrite); name/year/description/tech/links, **local cover upload or URL**, **16:9 crop preview with position sliders** |
| 📄 **Online resume** | `/resume` one-page resume (reuses profile/skills/projects + experience config, **print to PDF**, footer entry) |
| 🤖 **AI Q&A (RAG)** | Floating "Ask AI" on post pages, **site-wide vector search** answers (pgvector + BGE-M3 + DeepSeek, IP rate limit) |
| 📄 **llms.txt (GEO)** | Root `llms.txt` outputs AI-readable article index (llmstxt.org); `robots.txt` allows GPTBot/ClaudeBot/Google-Extended |
| 🔝 **Back to top** | Floating button after scroll (smooth scroll, above AI button) |
| 🎭 **404 page** | Custom 404 (large gradient + quick links), also for missing posts/tags |
| 📤 **Share button** | Post sharing: copy link / Weibo / QQ / X |
| 🔍 **Search enhancement** | In-page query input + **keyword highlighting** + compact list |
| 🔐 Login | Supabase Auth email login (single admin) |
| 🛡️ Admin dashboard | Server-side auth; post management (publish/edit/delete/draft/**bulk delete**/**pin-unpin**) + **comment management** (single/bulk delete) |
| 🌐 Custom domain | jianglai520.com bound to Vercel |

---

## 📁 Project Structure

```
my-blog/
├── app/
│   ├── actions/                    # Server Actions: server-side business logic (single write entry)
│   │   ├── auth.ts                 # login / signup / logout
│   │   ├── posts.ts                # create / edit / delete posts (zod + admin auth)
│   │   ├── comments.ts             # create comment
│   │   ├── guestbook.ts            # guestbook message (rate limited)
│   │   └── messages.ts             # private messages (rate limited + zod)
│   ├── layout.tsx                  # global layout (fonts / metadata / theme)
│   ├── globals.css                 # global styles + Tailwind v4 @theme design system
│   ├── page.tsx                    # homepage (hero + post list)
│   ├── components/
│   │   ├── SiteHeader.tsx          # top nav (glass)
│   │   ├── SiteFooter.tsx          # footer (about / social / copyright)
│   │   ├── Markdown.tsx            # Markdown → HTML (RSC, shiki dual-theme highlight)
│   │   ├── ImageLightbox.tsx       # image lightbox
│   │   ├── CodeBlockCopy.tsx       # code copy button
│   │   ├── ReadingProgress.tsx     # reading progress bar
│   │   ├── Toc.tsx                 # table of contents
│   │   ├── ThemeToggle.tsx         # light/dark toggle
│   │   ├── MessageForm.tsx         # private message form (about page, client)
│   │   └── Editor.tsx              # TipTap rich editor (client, emoji toolbar + Markdown source mode)
│   ├── posts/
│   │   └── [identifier]/
│   │       ├── page.tsx            # post detail (slug/id resolution)
│   │       └── CommentForm.tsx     # comment form (calls Server Action)
│   ├── projects/
│   │   ├── page.tsx                # project list (compact cards, fully clickable)
│   │   └── [slug]/page.tsx         # project detail (full description + links)
│   ├── admin/
│   │   ├── page.tsx                # admin entry (server auth, redirect if not admin)
│   │   ├── AdminClient.tsx         # admin shell (nav + tabs + sub-modules)
│   │   ├── PostForm.tsx            # write/edit form (TipTap + cover upload)
│   │   ├── PostList.tsx            # post management list (edit/delete)
│   │   ├── CommentManager.tsx      # comment management
│   │   ├── GuestbookManager.tsx    # guestbook management
│   │   ├── MessageManager.tsx      # private message management (with contact)
│   │   ├── ProjectManager.tsx      # project management (per-project save/delete + cover upload)
│   │   ├── SkillManager.tsx        # skills management (per-skill save/delete, group order, live preview)
│   │   ├── SettingsForm.tsx        # site settings (with avatar upload)
│   │   └── shared.ts               # shared input styles + AdminPost type
│   ├── login/
│   │   └── page.tsx                # login page (useActionState → Server Actions)
│   ├── tags/[slug]/                # tag page (filter posts by tag)
│   ├── archives/                   # timeline archive page (year/month timeline + changelog rows)
│   ├── about/                      # about page (developer profile + pinned projects + skills + message form)
│   ├── guestbook/                  # letter-style guestbook (write a letter + letter cards)
│   ├── skills/                     # Bento + radar skills page
│   ├── search/                     # search page
│   ├── feed.xml/                   # RSS feed (Atom)
│   ├── og/                         # dynamic OpenGraph image (edge, @vercel/og)
│   ├── robots.ts                   # search engine + AI crawler rules
│   ├── llms.txt/                   # AI-readable site index (llmstxt.org)
│   ├── sitemap.ts                  # dynamic sitemap
│   └── favicon.ico
├── db/
│   └── schema.ts                    # Drizzle schema (type truth, DB structure entry)
├── lib/
│   ├── server/
│   │   └── supabase.ts             # server client + auth helpers (server-only)
│   ├── browser/
│   │   ├── supabase.ts             # browser client (cookie session, Storage direct upload)
│   │   └── upload.ts               # direct-to-Storage upload (images/attachments, RLS)
│   ├── db.ts                       # Drizzle client (pool singleton, server read path only)
│   ├── posts.ts                    # public-read data layer (Drizzle, forced status='published')
│   ├── projects.ts                 # project JSON parse / slug generation / serialize
│   ├── skills.ts                   # skill JSON parse / grouping / group reorder / level labels
│   ├── validations/                # zod schemas (posts/comments/auth, shared client/server)
│   ├── format.ts                   # Chinese date format / slugify / stripMarkdown / postHref
├── proxy.ts                        # route guard (Next 16 renamed middleware)
├── drizzle.config.ts               # drizzle-kit config (schema → migration SQL)
├── supabase/
│   └── migrations/                 # DB migration SQL (0001~0014, run manually in SQL Editor)
├── scripts/
│   ├── generate-og.mjs             # one-off: generate public/og.png
│   ├── backup.mjs                  # DB backup script (export all tables to backups/)
│   ├── restore-drill.mjs           # restore drill (temp schema rebuild + row count check)
│   ├── render-docs.mjs             # Markdown docs → styled HTML (desktop docs folder)
│   └── check-markdown.mjs          # scan posts for flattened tables / broken Markdown
├── e2e/                            # Playwright E2E tests (homepage/post/search/rss/auth)
├── public/
│   └── og.png                      # OpenGraph share image (1200×630)
├── next.config.ts                  # Turbopack root / remote image allowlist
└── package.json
```

---

## 🚀 Local Development

```bash
# 1. Install dependencies (Node ≥ 20.9)
npm install

# 2. Configure environment variables (see .env.local below)
# 3. Start the dev server
npm run dev
```

Open http://localhost:3000; visit `/admin` for the dashboard (login required).

### Other Commands

```bash
npm run build   # production build (Next 16 removed `next lint`, build includes type check)
npm start       # start production server
npm run lint    # ESLint
npm run check:markdown  # scan posts for flattened tables / broken Markdown
```

---

## 🔑 Environment Variables (`.env.local`)

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase console → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key | Same as above |
| `DATABASE_URL` | **Server-only** DB connection string (for Drizzle direct connection, **no `NEXT_PUBLIC_` prefix**) | Supabase → Project Settings → Database → Connection string → **Transaction pooler** (port 6543) |
| `DEEPSEEK_API_KEY` | **Server-only** AI answer key (**no `NEXT_PUBLIC_` prefix**) | DeepSeek platform → API Keys |
| `EMBEDDING_API_KEY` | **Server-only** embedding key (RAG, BGE-M3, **no `NEXT_PUBLIC_` prefix**) | SiliconFlow → API Keys |

> ⚠️ `DATABASE_URL` is a server-only secret that can connect directly to the DB: keep it in `.env.local` / Vercel server env only, and **never expose it to the browser** (do **not** check "Expose to Client" in Vercel).

Example:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

> ⚠️ `.env.local` is gitignored and never committed. Configure it separately in Vercel → Environment Variables when deploying.

---

## 🗄️ Database Schema (Supabase)

### Table `posts`

| Column | Type | Description |
|--------|------|-------------|
| `id` | int8 / PK | Primary key |
| `author_id` | uuid (nullable) | Author, references `auth.users.id` |
| `slug` | text / unique (nullable) | Semantic link, e.g. `my-first-post` |
| `title` | text | Title |
| `content` | text | Body (**Markdown**) |
| `excerpt` | text (nullable) | Summary for cards and sharing |
| `cover_image` | text (nullable) | Cover image URL |
| `status` | text | `published` / `draft` (drafts never public) |
| `view_count` | int | View count (RPC `increment_view`, cookie anti-abuse) |
| `index_status` | text | Vector index status (`pending`/`done`/`failed`, async publishing) |
| `created_at` | timestamptz | Creation time |
| `published` | boolean | Legacy field (redundant with `status`) |

### Table `comments`

| Column | Type | Description |
|--------|------|-------------|
| `id` | int8 / PK | Primary key |
| `post_id` | int8 | References `posts.id` |
| `name` | text | Commenter nickname |
| `content` | text | Comment content |
| `status` | text | Status (currently all `approved`, reserved for moderation) |
| `ip` | text (nullable) | Commenter IP (60s rate limit, added in 0009) |
| `created_at` | timestamptz | Creation time |

### Table `guestbook_messages`

| Column | Type | Description |
|--------|------|-------------|
| `id` | int8 / PK | Primary key |
| `name` | text | Nickname |
| `content` | text | Message content |
| `ip` | text (nullable) | IP (60s rate limit) |
| `created_at` | timestamptz | Creation time |

### Table `messages` (private messages)

| Column | Type | Description |
|--------|------|-------------|
| `id` | int8 / PK | Primary key |
| `name` | text | Sender nickname (blank = anonymous) |
| `contact` | text (nullable) | Contact info (email/WeChat, owner-only) |
| `content` | text | Message content |
| `ip` | text (nullable) | IP (60s rate limit) |
| `created_at` | timestamptz | Creation time |

### Table `article_chunks` (RAG chunks)

| Column | Type | Description |
|--------|------|-------------|
| `id` | int8 / PK | Primary key |
| `post_id` | int8 | References `posts.id` (cascade delete) |
| `chunk_index` | int | Chunk order |
| `content` | text | Chunk text (~500 chars, 50 overlap) |
| `embedding` | vector(1024) | BGE-M3 vector (pgvector, cosine index) |

### Table `site_settings`

Site config (key-value, editable from admin, instant effect):
| key | Description |
|-----|-------------|
| `author_name` | Author name (default "江来") |
| `intro` / `bio` | One-line intro / about-page bio |
| `github` / `email` | Social links |
| `school` | School (shown on about page, optional) |
| `school_url` | School website URL (optional, clickable) |
| `avatar_url` | Avatar image URL |
| `icp` | ICP filing number |
| `skills` | Skills list (JSON: group/name/level + optional description/years/icon/featured; edited in admin, shown on `/skills`) |
| `projects` | Projects list (JSON, edited in admin, shown on `/projects`, cover upload supported) |

### Tables `tags` / `post_tags`

| Table | Description |
|-------|-------------|
| `tags` | Tags (`name` / `slug` unique) |
| `post_tags` | Post-tag association (many-to-many, composite PK) |

### Table `profiles`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid / PK | References `auth.users.id` |
| `is_admin` | boolean | Whether the user is the owner (only owner can publish/delete) |
| `created_at` | timestamptz | Creation time |

### Storage bucket `post-images`

Public-read image bucket (only the owner can upload/delete, RLS policies in `0002_rls.sql` / `0003_markdown_draft.sql`; project covers reuse the `projects/` folder in this bucket).

> All create-table / add-column / RLS / bucket scripts live in `supabase/migrations/` (0001~0014). Run them manually in the Supabase SQL Editor; they are idempotent and do not affect existing data.

---

## 🛡️ Security Architecture

All **write operations** (publish, delete, comment, login/signup) go through server-side **Server Actions**; the browser never touches the database directly:

```
Browser form ──▶ Server Action (zod validation → server session auth → DB write → revalidatePath)
                     │
                     ▼
              Supabase (RLS row-level security: second line of defense)
```

| Defense | Purpose |
|---------|---------|
| `proxy.ts` route guard | Redirect unauthenticated `/admin` visits to `/login` (Next 16, replaces middleware) |
| Server Action auth | `requireAdmin()`: only `profiles.is_admin = true` can publish/delete |
| RLS policies | Even with the public anon key, non-owners cannot modify `posts`; comments can be created anonymously but only the owner can delete |
| zod validation | All form input validated server-side (required title/content, slug format, comment length) |

On first deployment, run in the Supabase console:

```sql
-- 1. In the SQL Editor, run supabase/migrations/0001_init.sql, 0002_rls.sql in order
-- 2. Mark your own account as the owner:
INSERT INTO profiles (id, is_admin)
SELECT id, true FROM auth.users WHERE email = 'your-login-email'
ON CONFLICT (id) DO UPDATE SET is_admin = true;
-- 3. (Recommended) Disable public signups: Authentication → Sign In / Up → disable "Allow new users to sign up"
```

---

## 🌐 Deployment

After pushing to GitHub (`main`), Vercel builds and deploys automatically:

```bash
git add .
git commit -m "update"
git push origin main
```

- Domain: Vercel project → Settings → Domains → bind `jianglai520.com`
- Environment variables: Vercel project → Settings → Environment Variables
- Repository visibility: `my-blog` remote uses SSH

> 🩺 Troubleshooting: if GitHub Actions passes after push but **Vercel does not auto-deploy**, check Vercel project → Settings → Git → **Require Verified Commits** (when enabled, only GPG-signed commits deploy; ordinary commits are silently skipped). Also check usage limits and the Git connection status.

---

## 📚 Related Docs

| Doc | Content |
|-----|---------|
| `FRONTEND_OPTIMIZATION.md` | Previous frontend visual/SEO optimization plan, implementation log, and pitfalls |
| Optimization plan (desktop `my-blog搭建/` folder) | Full-stack refactor analysis and phased roadmap |
| Git rollback cheat sheet (desktop `my-blog搭建/`) | Commands for undoing uncommitted/unpushed/pushed changes (revert vs reset+force) |

---

## ⚠️ Known Limitations

The current version is an MVP with the following remaining items (see the optimization plan doc):

1. ~~**Security**: browser-side writes using Supabase anon key~~ ✅ **Resolved (Phase 0)**
2. ~~**Content**: plain text only, no Markdown / rich text / code highlighting~~ ✅ **Resolved (Phase 1)**: Markdown rendering + TipTap editor + drafts/editing + image upload
3. ~~**Features**: no tags, search, pagination, view counts, RSS~~ ✅ **Resolved (Phase 3)**: tags + search + pagination + views + RSS + archives + about + comment management
4. ~~**Engineering**: no automated tests, CI, error monitoring, backup strategy~~ ✅ **Resolved (Phase 4)**: Vitest (77 cases) + Playwright E2E (9 cases) + GitHub Actions CI + Sentry + Vercel Analytics + backup & restore drill (see `BACKUP.md`)
5. **Visual style**: the owner was unsatisfied with the frontend ("too amateur"); code block dual themes, image lightbox, reading progress, and TOC were already shipped; the **visual direction is now finalized as "teal glassmorphism"** (referencing lvyovo-wiki.tech), with P0 shipped: brand `#35bfab` + cyan `#1fc9e7` design system, `.glass` cards, homepage card refactor, and light/dark glass adaptation; the projects page has been split into list + detail (see the desktop optimization plan doc)

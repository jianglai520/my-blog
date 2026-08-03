"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Editor from "@/app/components/Editor";
import {
  createPost,
  updatePost,
  deletePost,
  type PostFormState,
} from "@/app/actions/posts";
import { deleteComment } from "@/app/actions/comments";
import { logout } from "@/app/actions/auth";
import { updateSiteSettings, type SettingsState } from "@/app/actions/settings";
import { uploadAvatar } from "@/app/actions/uploads";
import { slugify } from "@/lib/format";
import type { SiteSettings } from "@/lib/site";
import type { Post, Comment } from "@/lib/posts";

const inputCls =
  "w-full rounded-lg border border-ink-600 bg-ink-800 px-4 py-3 text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-brand-500";

const initialState: PostFormState = { message: "", success: false };

/* 后台文章类型（带标签嵌套） */
type AdminPost = Post & { post_tags?: { tag: { name: string } }[] };

/* ============ 写作表单（创建 / 编辑共用；key 变化即重挂载重置） ============ */

function PostForm({
  initial,
  onSaved,
}: {
  initial: AdminPost | null;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [coverImage, setCoverImage] = useState(initial?.cover_image ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [tags, setTags] = useState(
    initial?.post_tags?.map((pt) => pt.tag.name).join(", ") ?? "",
  );

  const action = initial ? updatePost : createPost;
  const [state, formAction, pending] = useActionState<PostFormState, FormData>(
    action,
    initialState
  );

  // 保存成功后：通知父组件刷新列表 / 退出编辑（用 ref 包装回调，避免 effect 依赖抖动）
  const onSavedRef = useRef(onSaved);
  useEffect(() => {
    onSavedRef.current = onSaved;
  });
  useEffect(() => {
    if (state.success) onSavedRef.current();
  }, [state.success]);

  // 标题变化时自动生成 slug 建议（若用户还没手动改过）
  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slug) setSlug(slugify(value));
  }

  return (
    <div className="mb-8 rounded-2xl border border-ink-700/60 bg-ink-900/50 p-8">
      <h2 className="mb-6 flex items-center gap-3 text-xl font-bold text-fg">
        {initial ? "✏️ 编辑文章" : "📝 写新文章"}
        {initial && (
          <span className="text-sm font-normal text-fg-faint">
            #{initial.id} · 当前状态：
            <span
              className={
                initial.status === "draft" ? "text-amber-400" : "text-emerald-400"
              }
            >
              {initial.status === "draft" ? "草稿" : "已发布"}
            </span>
          </span>
        )}
      </h2>

      <form action={formAction} className="space-y-5" id="post-form">
        {initial && <input type="hidden" name="postId" value={initial.id} />}
        {/* Editor 是 ProseMirror div 不进 FormData，必须用隐藏字段同步内容 */}
        <input type="hidden" name="content" value={content} />

        <div>
          <label htmlFor="post-title" className="mb-2 block text-sm text-fg-muted">
            文章标题
          </label>
          <input
            id="post-title"
            name="title"
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="给文章起个标题..."
            className={inputCls}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="post-slug" className="mb-2 block text-sm text-fg-muted">
              语义化链接（slug，可选）
            </label>
            <input
              id="post-slug"
              name="slug"
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="my-first-post"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="post-tags" className="mb-2 block text-sm text-fg-muted">
              标签（逗号分隔，可选）
            </label>
            <input
              id="post-tags"
              name="tags"
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Next.js, 前端, 随笔"
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label htmlFor="post-excerpt" className="mb-2 block text-sm text-fg-muted">
            摘要（excerpt，可选）
          </label>
          <input
            id="post-excerpt"
            name="excerpt"
            type="text"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="列表卡片与分享卡片显示的摘要"
            className={inputCls}
          />
        </div>

        <div>
          <label htmlFor="post-cover" className="mb-2 block text-sm text-fg-muted">
            封面图 URL（可选）
          </label>
          <input
            id="post-cover"
            name="coverImage"
            type="text"
            value={coverImage}
            onChange={(e) => setCoverImage(e.target.value)}
            placeholder="https://.../cover.jpg（需在 next.config.ts 允许的图源）"
            className={inputCls}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-fg-muted">
            文章内容 <span className="text-fg-faint">· Markdown / 所见即所得</span>
          </label>
          <Editor value={content} onChange={setContent} />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            name="status"
            value="published"
            disabled={pending}
            className="rounded-lg bg-gradient-to-r from-brand-600 to-brand-500 px-6 py-3 font-medium text-white transition-colors hover:from-brand-500 hover:to-glow-400 disabled:cursor-not-allowed disabled:bg-ink-600 disabled:text-fg-faint"
          >
            {pending ? "保存中..." : initial ? "📤 更新并发布" : "📝 发布"}
          </button>
          <button
            type="submit"
            name="status"
            value="draft"
            disabled={pending}
            className="rounded-lg border border-ink-600 px-6 py-3 font-medium text-fg-muted transition-colors hover:border-brand-500/50 hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
          >
            💾 保存草稿
          </button>

          {state.message && (
            <span
              className={`text-sm ${
                state.success ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {state.message}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

/* ============ 站点设置表单 ============ */

const initialSettingsState: SettingsState = { message: "", success: false };

function SettingsForm({ settings }: { settings: SiteSettings }) {
  const [authorName, setAuthorName] = useState(settings.author_name);
  const [intro, setIntro] = useState(settings.intro);
  const [bio, setBio] = useState(settings.bio);
  const [github, setGithub] = useState(settings.github);
  const [email, setEmail] = useState(settings.email);
  const [avatarUrl, setAvatarUrl] = useState(settings.avatar_url);
  const [icp, setIcp] = useState(settings.icp);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [state, formAction, pending] = useActionState<SettingsState, FormData>(
    updateSiteSettings,
    initialSettingsState
  );

  // 保存成功后刷新（首页/关于页缓存）
  const router = useRouter();
  const savedRef = useRef(false);
  useEffect(() => {
    if (state.success && !savedRef.current) {
      savedRef.current = true;
      router.refresh();
    }
  }, [state.success, router]);

  // 选择头像文件 → 直接调上传 Server Action（事件处理器里 setState 合法，不用 useActionState）
  async function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const result = await uploadAvatar({ url: null, message: "", success: false }, fd);
      if (result.success && result.url) {
        setAvatarUrl(result.url);
        alert("✅ 头像已上传，点击下方「保存设置」生效");
      } else {
        alert(result.message);
      }
    } finally {
      setAvatarUploading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-ink-700/60 bg-ink-900/50 p-8">
      <h2 className="mb-6 text-xl font-bold text-fg">⚙️ 站点设置</h2>
      <p className="mb-6 text-sm text-fg-faint">
        这些信息会显示在首页、关于页和页脚；保存后立即生效。
      </p>

      <form action={formAction} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="set-author" className="mb-2 block text-sm text-fg-muted">
              博主名字
            </label>
            <input
              id="set-author"
              name="author_name"
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="set-intro" className="mb-2 block text-sm text-fg-muted">
              一句话简介
            </label>
            <input
              id="set-intro"
              name="intro"
              type="text"
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
              placeholder="全栈学习者 & 生活记录者"
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label htmlFor="set-bio" className="mb-2 block text-sm text-fg-muted">
            个人介绍（关于页）
          </label>
          <textarea
            id="set-bio"
            name="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            placeholder="写一段自我介绍..."
            className={`${inputCls} resize-y`}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="set-github" className="mb-2 block text-sm text-fg-muted">
              GitHub 链接
            </label>
            <input
              id="set-github"
              name="github"
              type="url"
              value={github}
              onChange={(e) => setGithub(e.target.value)}
              placeholder="https://github.com/你的用户名"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="set-email" className="mb-2 block text-sm text-fg-muted">
              邮箱
            </label>
            <input
              id="set-email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="set-avatar" className="mb-2 block text-sm text-fg-muted">
              头像图片（可上传或填 URL）
            </label>
            <div className="flex gap-2">
              <input
                id="set-avatar"
                name="avatar_url"
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://.../avatar.png"
                className={inputCls}
              />
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleAvatarFile}
                className="sr-only"
              />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                className="flex-shrink-0 rounded-lg border border-brand-400/30 px-4 py-3 text-sm text-brand-300 transition-colors hover:bg-brand-400/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {avatarUploading ? "上传中…" : "上传"}
              </button>
            </div>
            <p className="mt-1 text-xs text-fg-faint">
              支持 PNG / JPG / WebP，≤5MB；上传后点「保存设置」生效
            </p>
          </div>
          <div>
            <label htmlFor="set-icp" className="mb-2 block text-sm text-fg-muted">
              备案号（可选）
            </label>
            <input
              id="set-icp"
              name="icp"
              type="text"
              value={icp}
              onChange={(e) => setIcp(e.target.value)}
              placeholder="京ICP备xxxxxxxx号"
              className={inputCls}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-gradient-to-r from-brand-600 to-brand-500 px-6 py-3 font-medium text-white transition-colors hover:from-brand-500 hover:to-glow-400 disabled:cursor-not-allowed disabled:bg-ink-600 disabled:text-fg-faint"
          >
            {pending ? "保存中..." : "💾 保存设置"}
          </button>
          {state.message && (
            <span className={`text-sm ${state.success ? "text-emerald-400" : "text-red-400"}`}>
              {state.message}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

/* ============ 后台主界面 ============ */

export default function AdminClient({
  userEmail,
  posts,
  comments,
  siteSettings,
}: {
  userEmail: string;
  posts: AdminPost[];
  comments: Comment[];
  siteSettings: SiteSettings;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<AdminPost | null>(null);
  const [formVersion, setFormVersion] = useState(0);
  const [tab, setTab] = useState<"posts" | "comments" | "settings">("posts");

  // 保存成功：退出编辑模式 + 递增 key 重置表单 + 刷新列表
  function handleSaved() {
    setEditing(null);
    setFormVersion((v) => v + 1);
    router.refresh();
  }

  function handleEdit(post: AdminPost) {
    setEditing(post);
    document.getElementById("post-form")?.scrollIntoView({ behavior: "smooth" });
  }

  // 评论 → 所属文章标题
  const postById = new Map(posts.map((p) => [p.id, p]));

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      {/* 顶部导航 */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <Link href="/" className="text-sm text-fg-muted transition-colors hover:text-brand-300">
            ← 返回首页
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-fg">后台管理</h1>
          <p className="mt-1 text-sm text-fg-faint">当前登录：{userEmail}</p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="text-sm text-red-400 transition-colors hover:text-red-300"
          >
            退出登录
          </button>
        </form>
      </div>

      {/* Tab 切换 */}
      <div className="mb-6 flex gap-2 border-b border-ink-700/60">
        <button
          onClick={() => setTab("posts")}
          className={`rounded-t-lg px-4 py-2 text-sm transition-colors ${
            tab === "posts"
              ? "border-b-2 border-brand-500 text-fg"
              : "text-fg-muted hover:text-fg"
          }`}
        >
          📝 文章管理（{posts.length}）
        </button>
        <button
          onClick={() => setTab("comments")}
          className={`rounded-t-lg px-4 py-2 text-sm transition-colors ${
            tab === "comments"
              ? "border-b-2 border-brand-500 text-fg"
              : "text-fg-muted hover:text-fg"
          }`}
        >
          💬 评论管理（{comments.length}）
        </button>
        <button
          onClick={() => setTab("settings")}
          className={`rounded-t-lg px-4 py-2 text-sm transition-colors ${
            tab === "settings"
              ? "border-b-2 border-brand-500 text-fg"
              : "text-fg-muted hover:text-fg"
          }`}
        >
          ⚙️ 站点设置
        </button>
      </div>

      {tab === "posts" ? (
        <>
          {/* 写作 / 编辑表单（key 变化时重挂载重置） */}
          <PostForm
            key={`${editing?.id ?? "new"}-${formVersion}`}
            initial={editing}
            onSaved={handleSaved}
          />

          {editing && (
            <button
              onClick={() => setEditing(null)}
              className="mb-4 text-sm text-fg-faint transition-colors hover:text-brand-300"
            >
              ← 取消编辑
            </button>
          )}

          {/* ===== 文章列表 ===== */}
          <div className="rounded-2xl border border-ink-700/60 bg-ink-900/50 p-8">
            <h2 className="mb-6 text-xl font-bold text-fg">
              📋 文章管理{" "}
              <span className="text-sm font-normal text-fg-faint">
                （{posts.length} 篇，含草稿）
              </span>
            </h2>

            {posts.length === 0 ? (
              <p className="py-8 text-center text-fg-muted">还没有文章～</p>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="flex items-center justify-between rounded-lg border border-ink-700/60 bg-ink-800/40 p-4 transition-colors hover:bg-ink-800"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <a
                          href={`/posts/${post.slug ?? post.id}`}
                          className="block truncate text-lg font-medium text-fg transition-colors hover:text-brand-300"
                        >
                          {post.title}
                        </a>
                        {post.status === "draft" && (
                          <span className="flex-shrink-0 rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-xs text-amber-300">
                            草稿
                          </span>
                        )}
                        {post.post_tags?.length ? (
                          <span className="hidden flex-shrink-0 text-xs text-fg-faint sm:inline">
                            {post.post_tags.map((pt) => `#${pt.tag.name}`).join(" ")}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-fg-faint">
                        {post.slug ? `/posts/${post.slug}` : `/posts/${post.id}`}
                        {" · "}
                        {new Date(post.created_at).toLocaleDateString("zh-CN")}
                      </p>
                    </div>

                    <div className="ml-4 flex flex-shrink-0 gap-2">
                      <button
                        onClick={() => handleEdit(post)}
                        className="rounded-lg border border-brand-400/30 px-4 py-2 text-sm text-brand-300 transition-colors hover:bg-brand-400/10"
                      >
                        编辑
                      </button>
                      <form
                        action={deletePost}
                        onSubmit={(e) => {
                          if (!confirm("确定要删除这篇文章吗？")) e.preventDefault();
                        }}
                      >
                        <input type="hidden" name="postId" value={post.id} />
                        <button
                          type="submit"
                          className="rounded-lg border border-red-400/30 px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-400/10"
                        >
                          删除
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : tab === "comments" ? (
        /* ===== 评论管理 ===== */
        <div className="rounded-2xl border border-ink-700/60 bg-ink-900/50 p-8">
          <h2 className="mb-6 text-xl font-bold text-fg">
            💬 评论管理{" "}
            <span className="text-sm font-normal text-fg-faint">（最新 200 条）</span>
          </h2>

          {comments.length === 0 ? (
            <p className="py-8 text-center text-fg-muted">还没有评论～</p>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => {
                const post = postById.get(comment.post_id);
                return (
                  <div
                    key={comment.id}
                    className="rounded-lg border border-ink-700/60 bg-ink-800/40 p-4"
                  >
                    <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                      <span className="font-medium text-fg">{comment.name}</span>
                      <span className="text-xs text-fg-faint">
                        {new Date(comment.created_at).toLocaleString("zh-CN")}
                      </span>
                      {post && (
                        <a
                          href={`/posts/${post.slug ?? post.id}`}
                          className="text-xs text-brand-300 hover:underline"
                        >
                          → 《{post.title}》
                        </a>
                      )}
                    </div>
                    <p className="text-fg-muted">{comment.content}</p>
                    <div className="mt-2">
                      <form
                        action={deleteComment}
                        onSubmit={(e) => {
                          if (!confirm("确定要删除这条评论吗？")) e.preventDefault();
                        }}
                      >
                        <input type="hidden" name="commentId" value={comment.id} />
                        <button
                          type="submit"
                          className="rounded-lg border border-red-400/30 px-3 py-1 text-xs text-red-400 transition-colors hover:bg-red-400/10"
                        >
                          删除
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <SettingsForm settings={siteSettings} />
      )}
    </div>
  );
}

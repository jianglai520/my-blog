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
import { logout } from "@/app/actions/auth";
import { slugify } from "@/lib/format";
import type { Post } from "@/lib/posts";

const inputCls =
  "w-full rounded-lg border border-ink-600 bg-ink-800 px-4 py-3 text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-brand-500";

const initialState: PostFormState = { message: "", success: false };

/* ============ 写作表单（创建 / 编辑共用；key 变化即重挂载重置） ============ */

function PostForm({
  initial,
  onSaved,
}: {
  initial: Post | null;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [coverImage, setCoverImage] = useState(initial?.cover_image ?? "");
  const [content, setContent] = useState(initial?.content ?? "");

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

        <div>
          <label htmlFor="post-slug" className="mb-2 block text-sm text-fg-muted">
            语义化链接（slug，可选）<span className="text-fg-faint">· 留空则用 id</span>
          </label>
          <input
            id="post-slug"
            name="slug"
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="my-first-post（建议：由标题自动生成）"
            className={inputCls}
          />
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
            className="rounded-lg bg-gradient-to-r from-brand-600 to-brand-500 px-6 py-3 font-medium text-white transition-colors hover:from-brand-500 hover:to-glow-400 disabled:cursor-not-allowed disabled:bg-ink-600"
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

/* ============ 后台主界面 ============ */

export default function AdminClient({
  userEmail,
  posts,
}: {
  userEmail: string;
  posts: Post[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Post | null>(null);
  const [formVersion, setFormVersion] = useState(0);

  // 保存成功：退出编辑模式 + 递增 key 重置表单 + 刷新列表
  function handleSaved() {
    setEditing(null);
    setFormVersion((v) => v + 1);
    router.refresh();
  }

  function handleEdit(post: Post) {
    setEditing(post);
    setFormVersion((v) => v); // 保持 key 稳定，让表单进入编辑态
    document.getElementById("post-form")?.scrollIntoView({ behavior: "smooth" });
  }

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

      {/* ===== 文章管理列表 ===== */}
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
    </div>
  );
}

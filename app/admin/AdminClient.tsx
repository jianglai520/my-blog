"use client";

import { useEffect, useRef } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createPost, deletePost, type PostFormState } from "@/app/actions/posts";
import { logout } from "@/app/actions/auth";
import { slugify } from "@/lib/format";
import type { Post } from "@/lib/posts";

const inputCls =
  "w-full rounded-lg border border-ink-600 bg-ink-800 px-4 py-3 text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-brand-500";

const initialState: PostFormState = { message: "", success: false };

export default function AdminClient({
  userEmail,
  posts,
}: {
  userEmail: string;
  posts: Post[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const slugRef = useRef<HTMLInputElement>(null);

  // createPost：服务端校验 + 鉴权 + 写库，状态回填到表单
  const [state, formAction, pending] = useActionState<PostFormState, FormData>(
    createPost,
    initialState
  );

  // 发布成功后：重置表单（DOM reset，不触发 React 状态）并刷新文章列表
  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state.success, router]);

  // 标题变化时自动生成 slug 建议（若用户还没手动改过）
  function handleTitleChange(value: string) {
    if (slugRef.current && !slugRef.current.value) {
      slugRef.current.value = slugify(value);
    }
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

      {/* ===== 发布文章表单 ===== */}
      <div className="mb-8 rounded-2xl border border-ink-700/60 bg-ink-900/50 p-8">
        <h2 className="mb-6 text-xl font-bold text-fg">📝 写新文章</h2>
        <form ref={formRef} action={formAction} className="space-y-5">
          <div>
            <label htmlFor="post-title" className="mb-2 block text-sm text-fg-muted">
              文章标题
            </label>
            <input
              id="post-title"
              name="title"
              type="text"
              defaultValue=""
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
              defaultValue=""
              ref={slugRef}
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
              defaultValue=""
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
              defaultValue=""
              placeholder="https://.../cover.jpg（需在 next.config.ts 允许的图源）"
              className={inputCls}
            />
          </div>

          <div>
            <label htmlFor="post-content" className="mb-2 block text-sm text-fg-muted">
              文章内容
            </label>
            <textarea
              id="post-content"
              name="content"
              defaultValue=""
              placeholder="开始写文章吧...（每行一个自然段）"
              rows={10}
              className={`${inputCls} resize-y`}
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className={`w-full rounded-lg px-6 py-3 text-lg font-medium text-white transition-colors ${
              pending
                ? "cursor-not-allowed bg-ink-600"
                : "bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-glow-400"
            }`}
          >
            {pending ? "发布中..." : "📝 发布文章"}
          </button>

          {state.message && (
            <p
              className={`text-center ${
                state.success ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {state.message}
            </p>
          )}
        </form>
      </div>

      {/* ===== 文章管理列表 ===== */}
      <div className="rounded-2xl border border-ink-700/60 bg-ink-900/50 p-8">
        <h2 className="mb-6 text-xl font-bold text-fg">📋 文章管理</h2>

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
                  <a
                    href={`/posts/${post.slug ?? post.id}`}
                    className="block truncate text-lg font-medium text-fg transition-colors hover:text-brand-300"
                  >
                    {post.title}
                  </a>
                  <p className="mt-1 text-sm text-fg-faint">
                    {post.slug ? `/posts/${post.slug}` : `/posts/${post.id}`}
                    {" · "}
                    {new Date(post.created_at).toLocaleDateString("zh-CN")}
                  </p>
                </div>
                <form
                  action={deletePost}
                  onSubmit={(e) => {
                    if (!confirm("确定要删除这篇文章吗？")) e.preventDefault();
                  }}
                >
                  <input type="hidden" name="postId" value={post.id} />
                  <button
                    type="submit"
                    className="ml-4 flex-shrink-0 rounded-lg border border-red-400/30 px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-400/10"
                  >
                    删除
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

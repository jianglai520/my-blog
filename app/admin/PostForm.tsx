"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import Editor from "@/app/components/Editor";
import {
  createPost,
  updatePost,
  type PostFormState,
} from "@/app/actions/posts";
import { slugify } from "@/lib/format";
import { inputCls, type AdminPost } from "./shared";

const initialState: PostFormState = { message: "", success: false };

/**
 * 写作 / 编辑表单（创建 / 编辑共用；父组件 key 变化即重挂载重置）。
 */
export default function PostForm({
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

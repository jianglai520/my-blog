"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { Loader2, ImagePlus } from "lucide-react";
import Editor, { type EditorHandle } from "@/app/components/Editor";
import {
  createPost,
  updatePost,
  type PostFormState,
} from "@/app/actions/posts";
import { uploadImageToStorage, type UploadResult } from "@/lib/browser/upload";
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
  const [tags, setTags] = useState(
    initial?.post_tags?.map((pt) => pt.tag.name).join(", ") ?? "",
  );
  // 正文不走 React state：编辑期间零重渲染/零序列化，提交时从 Editor ref 读取
  const editorRef = useRef<EditorHandle>(null);
  // 封面图本地上传：隐藏 file input + 浏览器直传 Supabase Storage（不走 Server Action 中转，更快）
  const coverRef = useRef<HTMLInputElement>(null);
  const [coverPending, setCoverPending] = useState(false);
  const [coverMessage, setCoverMessage] = useState<UploadResult>({ url: null, message: "", success: false });

  const action = initial ? updatePost : createPost;
  const [state, formAction, pending] = useActionState<PostFormState, FormData>(
    action,
    initialState
  );
  // 当前提交动作（发布 or 草稿），用于按钮文案
  const [actionType, setActionType] = useState<"publish" | "draft">("publish");

  // 保存成功后：先短暂展示成功提示，再通知父组件刷新/退出编辑
  const onSavedRef = useRef(onSaved);
  useEffect(() => {
    onSavedRef.current = onSaved;
  });
  useEffect(() => {
    if (state.success) {
      const t = setTimeout(() => onSavedRef.current(), 800);
      return () => clearTimeout(t);
    }
  }, [state.success]);

  // 选择本地封面图后立即直传，成功后把公开 URL 写入输入框
  async function handleCoverFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const date = new Date().toISOString().slice(0, 10); // yyyy-mm-dd
    setCoverPending(true);
    setCoverMessage({ url: null, message: "", success: false });
    try {
      const res = await uploadImageToStorage(file, `posts/${date}`);
      if (res.success && res.url) {
        setCoverImage(res.url);
      }
      setCoverMessage(res);
    } catch (err) {
      // 兜底：直传抛异常（网络/会话等）时也要明确提示，绝不静默失败
      console.error("封面上传异常:", err);
      setCoverMessage({
        url: null,
        message: `❌ 上传失败：${err instanceof Error ? err.message : "未知错误"}（请检查登录状态与网络后重试）`,
        success: false,
      });
    } finally {
      setCoverPending(false);
      e.target.value = "";
    }
  }

  // 标题变化时自动生成 slug 建议（若用户还没手动改过）。
  // 中文标题 slugify 会保留中文（如 测试1），不符合 URL slug 规范（zod 校验失败），
  // 此时不自动生成，留空使用 id 链接；用户可手动填英文 slug。
  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slug) {
      const candidate = slugify(value);
      setSlug(/^[a-z0-9-]+$/i.test(candidate) ? candidate : "");
    }
  }

  // 提交前兜底：非法 slug（含中文/空格/特殊字符）自动清空，改用 id 链接；
  // 再把编辑器最新内容写入隐藏字段（编辑期间不维护 content state，避免大文档频繁重渲染）
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    const slugInput = form.elements.namedItem("slug");
    if (
      slugInput instanceof HTMLInputElement &&
      slugInput.value &&
      !/^[a-z0-9-]+$/i.test(slugInput.value)
    ) {
      slugInput.value = "";
    }
    const md = editorRef.current?.getMarkdown();
    if (md != null) {
      const input = form.elements.namedItem("content");
      if (input instanceof HTMLInputElement) input.value = md;
    }
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

      <form action={formAction} onSubmit={handleSubmit} className="space-y-5" id="post-form">
        {initial && <input type="hidden" name="postId" value={initial.id} />}
        {/* Editor 是 ProseMirror div 不进 FormData，提交时由 onSubmit 写入最新 Markdown */}
        <input type="hidden" name="content" defaultValue="" />

        {/* 提交状态提示：不遮挡表单，仅显示进度文案 */}
        {pending && (
          <div className="flex items-center gap-2 text-sm text-fg-muted">
            <Loader2 size={16} className="animate-spin text-brand-300" />
            {actionType === "draft" ? "💾 正在保存草稿…" : "🚀 正在发布文章…"}
          </div>
        )}

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
            封面图（可选）
          </label>
          <div className="flex gap-2">
            <input
              id="post-cover"
              name="coverImage"
              type="text"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="粘贴图片 URL，或点击右侧「本地上传」"
              className={inputCls}
            />
            <input
              ref={coverRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={handleCoverFileChange}
            />
            <button
              type="button"
              disabled={coverPending}
              onClick={() => coverRef.current?.click()}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-ink-600 px-4 py-2.5 text-sm font-medium text-fg-muted transition-colors hover:border-brand-500/50 hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
            >
              {coverPending ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <ImagePlus size={15} />
              )}
              {coverPending ? "上传中…" : "本地上传"}
            </button>
          </div>
          {coverMessage.message && (
            <p
              className={`mt-1.5 text-xs ${
                coverMessage.success ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {coverMessage.message}
            </p>
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm text-fg-muted">
            文章内容 <span className="text-fg-faint">· Markdown / 所见即所得</span>
          </label>
          <Editor ref={editorRef} value={initial?.content ?? ""} />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            name="status"
            value="published"
            disabled={pending}
            onClick={() => setActionType("publish")}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand-600 to-brand-500 px-6 py-3 font-medium text-white transition-colors hover:from-brand-500 hover:to-glow-400 disabled:cursor-not-allowed disabled:bg-ink-600 disabled:text-fg-faint"
          >
            {pending && actionType === "publish" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : null}
            {pending && actionType === "publish"
              ? "发布中…"
              : initial
                ? "📤 更新并发布"
                : "📝 发布"}
          </button>
          <button
            type="submit"
            name="status"
            value="draft"
            disabled={pending}
            onClick={() => setActionType("draft")}
            className="inline-flex items-center gap-2 rounded-lg border border-ink-600 px-6 py-3 font-medium text-fg-muted transition-colors hover:border-brand-500/50 hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending && actionType === "draft" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : null}
            {pending && actionType === "draft" ? "保存中…" : "💾 保存草稿"}
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

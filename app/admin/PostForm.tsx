"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { Loader2, ImagePlus, History } from "lucide-react";
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

/** 草稿自动保存：输入停止 1 秒后写入 localStorage */
const DRAFT_DEBOUNCE_MS = 1000;

type DraftSnapshot = {
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string;
  tags: string;
  content: string;
  savedAt: number;
};

/** 读取本地草稿；内容为空或结构损坏时顺手清理，避免反复提示 */
function readDraft(key: string): DraftSnapshot | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DraftSnapshot>;
    const hasContent =
      typeof parsed?.content === "string" &&
      Boolean(
        parsed.title?.trim() ||
          parsed.content.trim() ||
          parsed.tags?.trim() ||
          parsed.excerpt?.trim(),
      );
    if (!parsed || !hasContent) {
      localStorage.removeItem(key);
      return null;
    }
    return {
      title: String(parsed.title ?? ""),
      slug: String(parsed.slug ?? ""),
      excerpt: String(parsed.excerpt ?? ""),
      coverImage: String(parsed.coverImage ?? ""),
      tags: String(parsed.tags ?? ""),
      content: String(parsed.content ?? ""),
      savedAt: Number(parsed.savedAt) || 0,
    };
  } catch {
    return null;
  }
}

/**
 * 写作 / 编辑表单（创建 / 编辑共用；父组件 key 变化即重挂载重置）。
 *
 * 草稿自动保存：
 * - 标题/正文/标签/摘要/封面变化后 1 秒防抖写入 localStorage
 * - key：编辑为 `draft:edit:<id>`，新建为 `draft:new`
 * - 重新进入时提示恢复；发布成功或主动丢弃时清除
 * - 恢复提示未处理前不写入，避免把旧草稿覆盖成空表单
 */
export default function PostForm({
  initial,
  onSaved,
}: {
  initial: AdminPost | null;
  onSaved: () => void;
}) {
  const draftKey = initial ? `draft:edit:${initial.id}` : "draft:new";

  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [coverImage, setCoverImage] = useState(initial?.cover_image ?? "");
  const [tags, setTags] = useState(
    initial?.post_tags?.map((pt) => pt.tag.name).join(", ") ?? "",
  );
  // 正文不走 React state：编辑期间零重渲染/零序列化，提交时从 Editor ref 读取。
  // 自动保存需要最新正文，这里只维护一个 ref（不触发渲染）。
  const editorRef = useRef<EditorHandle>(null);
  const contentRef = useRef(initial?.content ?? "");
  // 恢复草稿时需要让 Editor 以新内容重新挂载（useEditor 只在挂载时读取 value）
  const [editorValue, setEditorValue] = useState(initial?.content ?? "");
  const [editorKey, setEditorKey] = useState(0);
  // 封面图本地上传：隐藏 file input + 浏览器直传 Supabase Storage（不走 Server Action 中转，更快）
  const coverRef = useRef<HTMLInputElement>(null);
  const [coverPending, setCoverPending] = useState(false);
  const [coverMessage, setCoverMessage] = useState<UploadResult>({ url: null, message: "", success: false });

  // ===== 草稿自动保存状态 =====
  const [pendingDraft, setPendingDraft] = useState<DraftSnapshot | null>(null);
  const [draftNotice, setDraftNotice] = useState("");
  const draftReady = useRef(false); // 用户已处理“是否恢复”之前不写入
  const savedRef = useRef(false); // 发布成功 / 组件进入保存态后停止自动保存
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fieldsRef = useRef({ title, slug, excerpt, coverImage, tags });

  useEffect(() => {
    fieldsRef.current = { title, slug, excerpt, coverImage, tags };
  }, [title, slug, excerpt, coverImage, tags]);

  // 进入表单时检查本地草稿（只在客户端执行，避免 SSR 读不到 localStorage）
  useEffect(() => {
    const found = readDraft(draftKey);
    if (found) {
      // 放进微任务再 setState：避免 effect 同步阶段触发级联渲染（React 19 lint 规则）
      queueMicrotask(() => setPendingDraft(found));
      return;
    }
    draftReady.current = true;
  }, [draftKey]);

  /** 立即落盘（防抖到期或组件卸载时调用） */
  function flushDraft() {
    if (!draftReady.current || savedRef.current) return;
    const snapshot: DraftSnapshot = {
      ...fieldsRef.current,
      content: contentRef.current,
      savedAt: Date.now(),
    };
    if (
      !snapshot.title.trim() &&
      !snapshot.content.trim() &&
      !snapshot.tags.trim() &&
      !snapshot.excerpt.trim()
    ) {
      return;
    }
    try {
      localStorage.setItem(draftKey, JSON.stringify(snapshot));
      setDraftNotice(
        `草稿已自动保存 · ${new Date(snapshot.savedAt).toLocaleTimeString("zh-CN", { hour12: false })}`,
      );
    } catch {
      setDraftNotice("⚠️ 草稿自动保存失败（本地存储不可用或已满）");
    }
  }

  /** 1 秒防抖：连续输入只在停下来后写一次 */
  function scheduleDraftSave() {
    if (!draftReady.current || savedRef.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      flushDraft();
    }, DRAFT_DEBOUNCE_MS);
  }

  // 卸载（切换 Tab / 退出编辑）前立即落盘，避免丢掉最后一秒输入
  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
        flushDraft();
      }
    };
    // flushDraft 只读 refs，draftKey 在实例生命周期内不变
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function restoreDraft() {
    if (!pendingDraft) return;
    setTitle(pendingDraft.title);
    setSlug(pendingDraft.slug);
    setExcerpt(pendingDraft.excerpt);
    setCoverImage(pendingDraft.coverImage);
    setTags(pendingDraft.tags);
    fieldsRef.current = {
      title: pendingDraft.title,
      slug: pendingDraft.slug,
      excerpt: pendingDraft.excerpt,
      coverImage: pendingDraft.coverImage,
      tags: pendingDraft.tags,
    };
    contentRef.current = pendingDraft.content;
    setEditorValue(pendingDraft.content);
    setEditorKey((k) => k + 1); // 重新挂载 Editor，载入草稿正文
    draftReady.current = true;
    setPendingDraft(null);
    setDraftNotice("已恢复本地草稿");
  }

  function discardDraft() {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // 忽略：localStorage 不可用时没有草稿可清
    }
    draftReady.current = true;
    setPendingDraft(null);
    setDraftNotice("已丢弃本地草稿");
  }

  function clearSavedDraft() {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // 忽略
    }
    setDraftNotice("本地草稿已清除");
  }

  const action = initial ? updatePost : createPost;
  const [state, formAction, pending] = useActionState<PostFormState, FormData>(
    action,
    initialState
  );
  // 当前提交动作（发布 or 草稿），用于按钮文案
  const [actionType, setActionType] = useState<"publish" | "draft">("publish");

  // 保存成功后：清除本地草稿，先短暂展示成功提示，再通知父组件刷新/退出编辑
  const onSavedRef = useRef(onSaved);
  useEffect(() => {
    onSavedRef.current = onSaved;
  });
  useEffect(() => {
    if (state.success) {
      savedRef.current = true;
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      try {
        localStorage.removeItem(draftKey);
      } catch {
        // 忽略
      }
      const t = setTimeout(() => {
        setDraftNotice("");
        onSavedRef.current();
      }, 800);
      return () => clearTimeout(t);
    }
  }, [state.success, draftKey]);

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
        scheduleDraftSave();
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
    scheduleDraftSave();
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
      contentRef.current = md;
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

      {/* 检测到本地草稿：先让用户选择，避免直接覆盖 */}
      {pendingDraft && (
        <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-amber-200">
            <History size={15} />
            检测到未保存的本地草稿
          </p>
          <p className="mt-1 text-xs text-amber-200/70">
            {pendingDraft.savedAt
              ? new Date(pendingDraft.savedAt).toLocaleString("zh-CN", { hour12: false })
              : "保存时间未知"}
            {" · "}标题：{pendingDraft.title || "（无标题）"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={restoreDraft}
              className="rounded-lg bg-amber-500/90 px-4 py-2 text-sm font-medium text-ink-950 transition-colors hover:bg-amber-400"
            >
              恢复草稿
            </button>
            <button
              type="button"
              onClick={discardDraft}
              className="rounded-lg border border-amber-400/40 px-4 py-2 text-sm text-amber-200 transition-colors hover:bg-amber-500/10"
            >
              丢弃草稿
            </button>
          </div>
        </div>
      )}

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
              onChange={(e) => {
                setSlug(e.target.value);
                scheduleDraftSave();
              }}
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
              onChange={(e) => {
                setTags(e.target.value);
                scheduleDraftSave();
              }}
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
            onChange={(e) => {
              setExcerpt(e.target.value);
              scheduleDraftSave();
            }}
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
              onChange={(e) => {
                setCoverImage(e.target.value);
                scheduleDraftSave();
              }}
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
          <Editor
            key={editorKey}
            ref={editorRef}
            value={editorValue}
            onChange={(md) => {
              contentRef.current = md;
              scheduleDraftSave();
            }}
          />
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

          {draftNotice && (
            <span className="inline-flex items-center gap-2 text-xs text-fg-faint">
              {draftNotice}
              <button
                type="button"
                onClick={clearSavedDraft}
                className="underline transition-colors hover:text-brand-300"
              >
                清除草稿
              </button>
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

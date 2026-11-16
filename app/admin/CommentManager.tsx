"use client";

import { useState, useTransition, useActionState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteComment,
  batchDeleteComments,
  replyComment,
  type CommentReplyState,
} from "@/app/actions/comments";
import { formatDateTime, postHref } from "@/lib/format";
import type { Comment } from "@/lib/posts";
import type { AdminPost } from "./shared";

const initialReplyState: CommentReplyState = { message: "", success: false };

/** 单条评论的博主回复：默认收起，编辑时展开 */
function CommentReplyForm({ comment }: { comment: Comment }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<CommentReplyState, FormData>(
    replyComment,
    initialReplyState,
  );

  if (!editing) {
    return (
      <div className="mt-3">
        {comment.reply ? (
          <div className="rounded-xl border border-brand-400/15 bg-brand-500/[0.06] px-4 py-3">
            <div className="mb-1 flex items-center justify-between gap-3">
              <span className="text-[11px] tracking-wide text-brand-300">
                博主回复
              </span>
              <div className="flex items-center gap-3">
                {comment.replied_at && (
                  <span className="font-mono text-[10px] text-fg-faint">
                    {formatDateTime(comment.replied_at)}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  aria-expanded={editing}
                  className="text-[11px] text-fg-faint transition-colors hover:text-brand-300"
                >
                  编辑
                </button>
              </div>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-fg-muted">
              {comment.reply}
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-expanded={editing}
            className="text-xs text-fg-faint transition-colors hover:text-brand-300"
          >
            ↩ 回复这条评论
          </button>
        )}
      </div>
    );
  }

  return (
    <form
      action={action}
      className="mt-3 rounded-xl border border-ink-600/70 bg-ink-900/50 p-3"
    >
      <input type="hidden" name="commentId" value={comment.id} />
      <label
        htmlFor={`reply-${comment.id}`}
        className="mb-1.5 block text-[11px] text-fg-faint"
      >
        博主回复
        {comment.reply && comment.replied_at
          ? ` · 上次回复 ${formatDateTime(comment.replied_at)}`
          : ""}
      </label>
      <textarea
        id={`reply-${comment.id}`}
        name="reply"
        defaultValue={comment.reply ?? ""}
        rows={3}
        maxLength={1000}
        autoFocus
        placeholder="写一条回复…"
        className="w-full resize-y rounded-lg border border-ink-600 bg-ink-800/70 px-3 py-2 text-sm leading-relaxed text-fg placeholder:text-fg-faint focus:border-brand-500/50 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
      />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-gradient-to-r from-brand-600 to-brand-500 px-3.5 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "保存中…" : comment.reply ? "更新回复" : "发送回复"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-xs text-fg-faint transition-colors hover:text-fg"
        >
          取消
        </button>
        {comment.reply && (
          <span className="text-[11px] text-fg-faint">
            清空内容后保存可删除回复
          </span>
        )}
        {state.message && (
          <span
            className={`text-xs ${state.success ? "text-emerald-400" : "text-red-400"}`}
          >
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}

/**
 * 评论管理列表：勾选 + 全选 + 批量删除，或逐条删除。
 * 评论所属文章已删除时显示「文章已删除」。
 */
export default function CommentManager({
  comments,
  posts,
}: {
  comments: Comment[];
  posts: AdminPost[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [isPending, startTransition] = useTransition();

  // 评论 → 所属文章标题
  const postById = new Map(posts.map((p) => [p.id, p]));

  const allSelected = comments.length > 0 && selected.size === comments.length;

  function exitSelectMode() {
    setSelectMode(false);
    setSelected(new Set());
  }

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(comments.map((c) => c.id)));
  }

  function handleBatchDelete() {
    if (!selected.size) return;
    if (!confirm(`确定删除选中的 ${selected.size} 条评论吗？此操作不可恢复。`)) return;
    startTransition(async () => {
      await batchDeleteComments([...selected]);
      setSelected(new Set());
      router.refresh();
    });
  }

  if (comments.length === 0) {
    return <p className="py-8 text-center text-fg-muted">还没有评论～</p>;
  }

  return (
    <>
      {/* 工具条：默认隐藏勾选，点「多选」进入批量模式 */}
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        {selectMode ? (
          <>
            <label className="flex cursor-pointer items-center gap-2 text-fg-muted">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="h-4 w-4 accent-brand-500"
              />
              全选
            </label>
            <span className="text-fg-faint">已选 {selected.size} 条</span>
            <button
              type="button"
              onClick={handleBatchDelete}
              disabled={!selected.size || isPending}
              className="rounded-lg border border-red-400/30 px-3 py-1 text-sm text-red-400 transition-colors hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isPending ? "删除中…" : "🗑 批量删除"}
            </button>
            <button
              type="button"
              onClick={exitSelectMode}
              className="rounded-lg border border-ink-600 px-3 py-1 text-sm text-fg-muted transition-colors hover:border-brand-500/50 hover:text-fg"
            >
              完成
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setSelectMode(true)}
            className="rounded-lg border border-ink-600 px-3 py-1 text-sm text-fg-muted transition-colors hover:border-brand-500/50 hover:text-fg"
          >
            🔀 多选
          </button>
        )}
      </div>

      <div className="space-y-4">
        {comments.map((comment) => {
          const post = postById.get(comment.post_id);
          return (
            <div
              key={comment.id}
              className="rounded-lg border border-ink-700/60 bg-ink-800/40 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <span className="font-medium text-fg">{comment.name}</span>
                    <span className="text-xs text-fg-faint">
                      {formatDateTime(comment.created_at)}
                    </span>
                    {post ? (
                      <a
                        href={postHref(post)}
                        className="text-xs text-brand-300 hover:underline"
                      >
                        → 《{post.title}》
                      </a>
                    ) : (
                      <span className="text-xs text-fg-faint">（文章已删除）</span>
                    )}
                  </div>
                  <p className="text-fg-muted">{comment.content}</p>
                  <CommentReplyForm comment={comment} />
                </div>

                <div className="flex flex-shrink-0 items-center gap-2">
                  {selectMode && (
                    <input
                      type="checkbox"
                      checked={selected.has(comment.id)}
                      onChange={() => toggle(comment.id)}
                      aria-label={`选择 ${comment.name} 的评论`}
                      className="h-4 w-4 accent-brand-500"
                    />
                  )}
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
            </div>
          );
        })}
      </div>
    </>
  );
}

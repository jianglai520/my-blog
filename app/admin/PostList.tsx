"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePost, batchDeletePosts } from "@/app/actions/posts";
import type { AdminPost } from "./shared";

/**
 * 文章管理列表：勾选 + 全选 + 批量删除，或逐篇编辑/删除。
 */
export default function PostList({
  posts,
  onEdit,
}: {
  posts: AdminPost[];
  onEdit: (post: AdminPost) => void;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [isPending, startTransition] = useTransition();

  const allSelected = posts.length > 0 && selected.size === posts.length;

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
    setSelected(allSelected ? new Set() : new Set(posts.map((p) => p.id)));
  }

  function handleBatchDelete() {
    if (!selected.size) return;
    if (!confirm(`确定删除选中的 ${selected.size} 篇文章吗？此操作不可恢复。`)) return;
    startTransition(async () => {
      await batchDeletePosts([...selected]);
      setSelected(new Set());
      router.refresh();
    });
  }

  if (posts.length === 0) {
    return <p className="py-8 text-center text-fg-muted">还没有文章～</p>;
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
            <span className="text-fg-faint">已选 {selected.size} 篇</span>
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
        {posts.map((post) => (
          <div
            key={post.id}
            className="flex items-center justify-between rounded-lg border border-ink-700/60 bg-ink-800/40 p-4 transition-colors hover:bg-ink-800"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {selectMode && (
                <input
                  type="checkbox"
                  checked={selected.has(post.id)}
                  onChange={() => toggle(post.id)}
                  aria-label={`选择文章 ${post.title}`}
                  className="h-4 w-4 flex-shrink-0 accent-brand-500"
                />
              )}
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
            </div>

            <div className="ml-4 flex flex-shrink-0 gap-2">
              <button
                onClick={() => onEdit(post)}
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
    </>
  );
}

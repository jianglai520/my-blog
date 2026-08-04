"use client";

import { deletePost } from "@/app/actions/posts";
import type { AdminPost } from "./shared";

/**
 * 文章管理列表：标题 / 草稿标签 / 标签 / 链接 / 日期 / 编辑 / 删除。
 */
export default function PostList({
  posts,
  onEdit,
}: {
  posts: AdminPost[];
  onEdit: (post: AdminPost) => void;
}) {
  if (posts.length === 0) {
    return <p className="py-8 text-center text-fg-muted">还没有文章～</p>;
  }

  return (
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
  );
}

"use client";

import { deleteComment } from "@/app/actions/comments";
import type { Comment } from "@/lib/posts";
import type { AdminPost } from "./shared";

/**
 * 评论管理列表：评论者 / 时间 / 所属文章 / 内容 / 删除。
 */
export default function CommentManager({
  comments,
  posts,
}: {
  comments: Comment[];
  posts: AdminPost[];
}) {
  // 评论 → 所属文章标题
  const postById = new Map(posts.map((p) => [p.id, p]));

  if (comments.length === 0) {
    return <p className="py-8 text-center text-fg-muted">还没有评论～</p>;
  }

  return (
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
              {post ? (
                <a
                  href={`/posts/${post.slug ?? post.id}`}
                  className="text-xs text-brand-300 hover:underline"
                >
                  → 《{post.title}》
                </a>
              ) : (
                <span className="text-xs text-fg-faint">（文章已删除）</span>
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
  );
}

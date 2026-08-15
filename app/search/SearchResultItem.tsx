"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { formatDate, stripMarkdown, postHref } from "@/lib/format";
import type { PostWithTags } from "@/lib/posts";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 把文本中匹配关键词的部分包成高亮 <mark>（React 元素渲染，无 XSS 风险） */
function highlight(text: string, query: string): ReactNode {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark
        key={i}
        className="rounded bg-brand-500/25 px-0.5 text-brand-200"
      >
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

/** 搜索结果条目：紧凑列表（标题/摘要关键词高亮 + 日期 + 标签） */
export default function SearchResultItem({
  post,
  query,
}: {
  post: PostWithTags;
  query: string;
}) {
  const excerpt = post.excerpt || stripMarkdown(post.content).slice(0, 150);
  const url = postHref(post);

  return (
    <article className="rounded-xl border border-ink-700/60 bg-ink-900/50 p-4 transition-colors hover:border-brand-500/30">
      <h2 className="text-lg font-semibold leading-snug">
        <Link href={url} className="text-fg transition-colors hover:text-brand-300">
          {highlight(post.title, query)}
        </Link>
      </h2>
      <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-fg-muted">
        {highlight(excerpt, query)}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-faint">
        <span>{formatDate(post.created_at)}</span>
        {post.tags.slice(0, 3).map((tag) => (
          <Link
            key={tag.slug}
            href={`/tags/${tag.slug}`}
            className="text-brand-300/80 transition-colors hover:text-brand-300"
          >
            #{tag.name}
          </Link>
        ))}
      </div>
    </article>
  );
}

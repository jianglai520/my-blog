import Image from "next/image";
import Link from "next/link";
import { Eye } from "lucide-react";
import { formatDate, stripMarkdown } from "@/lib/format";
import type { PostWithTags } from "@/lib/posts";

/**
 * 文章卡片（首页 / 标签页 / 搜索页复用）：封面、标题、摘要、标签、日期、阅读数。
 * 采用 stretched-link 模式：整卡点击用绝对定位覆盖层 <a>，内部标题/标签链接与之平级，
 * 避免 <a> 嵌套 <a>（HTML 规范禁止，会引起 hydration 错误）。
 */
export default function PostCard({ post }: { post: PostWithTags }) {
  const postUrl = `/posts/${post.slug ?? post.id}`;

  return (
    <div className="gradient-card group relative block overflow-hidden rounded-2xl">
      {/* 整卡点击覆盖层（stretched link，z-0；内容链接需 relative z-10 才能在上层） */}
      <Link href={postUrl} className="absolute inset-0 z-0" aria-label={post.title} />

      {post.cover_image ? (
        <div className="relative h-44 w-full overflow-hidden sm:h-52">
          <Image
            src={post.cover_image}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 40rem"
          />
        </div>
      ) : null}

      <div className="relative p-6">
        <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-faint">
          <span>{formatDate(post.created_at)}</span>
          {post.view_count != null && post.view_count > 0 && (
            <span className="inline-flex items-center gap-1" aria-label="阅读数">
              <Eye size={13} /> {post.view_count}
            </span>
          )}
        </div>

        <h3 className="mb-2 text-xl font-semibold text-fg transition-colors group-hover:text-brand-300">
          <Link href={postUrl} className="relative z-10">
            {post.title}
          </Link>
        </h3>

        <p className="text-sm text-fg-muted line-clamp-2">
          {post.excerpt || (post.content ? stripMarkdown(post.content).slice(0, 150) : "")}
        </p>

        {post.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <Link
                key={tag.slug}
                href={`/tags/${tag.slug}`}
                className="relative z-10 rounded-full border border-brand-400/30 bg-brand-500/10 px-2.5 py-0.5 text-xs text-brand-300 transition-all hover:border-brand-400/60 hover:bg-brand-500/20"
              >
                #{tag.name}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

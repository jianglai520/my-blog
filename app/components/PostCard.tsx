import Image from "next/image";
import Link from "next/link";
import { Eye, Pin } from "lucide-react";
import { formatDate, stripMarkdown, postHref, readingMinutes } from "@/lib/format";
import type { PostWithTags } from "@/lib/posts";

/**
 * 文章卡片（首页 / 标签页 / 搜索页复用）：青绿毛玻璃卡片。
 * - 毛玻璃面板 + 封面图置顶（16:9 统一比例），文字区在玻璃上，结构固定不拉伸
 * - 无封面时用青绿渐变占位 + 文章首字装饰，风格统一
 * - 整卡高度一致（flex h-full），杜绝同排卡片高低错落
 * - stretched-link：整卡点击用绝对定位覆盖层 <a>，避免 <a> 嵌套 <a>
 */
export default function PostCard({ post }: { post: PostWithTags }) {
  const postUrl = postHref(post);
  const excerpt = post.excerpt || (post.content ? stripMarkdown(post.content).slice(0, 120) : "");
  const minutes = post.content ? readingMinutes(post.content) : null;

  return (
    <article
      className={`glass group relative flex h-full flex-col overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-glow-lg ${
        post.pinned ? "ring-1 ring-brand-400/35" : ""
      }`}
    >
      {/* 整卡点击覆盖层（stretched link，z-0；内容链接需 relative z-10 才能在上层） */}
      <Link href={postUrl} className="absolute inset-0 z-0" aria-label={post.title} />

      {/* ===== 封面图（置顶，统一 16:9，不再整卡通铺） ===== */}
      <div className="relative aspect-[16/9] shrink-0 overflow-hidden">
        {post.cover_image ? (
          <Image
            src={post.cover_image}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 40rem"
          />
        ) : (
          /* 无封面：青绿渐变占位 + 首字装饰 */
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-brand-500 via-brand-600 to-glow-500">
            <span className="font-display text-5xl font-bold text-white/90">
              {post.title.charAt(0)}
            </span>
          </div>
        )}
        {/* 图片底部轻微渐隐，衔接玻璃文字区 */}
        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/20 to-transparent" />
        {/* 置顶徽章（不拦截整卡点击） */}
        {post.pinned && (
          <span className="pointer-events-none absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-brand-500/90 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white shadow-[0_2px_12px_rgba(53,191,171,0.35)] ring-1 ring-white/30 backdrop-blur-md">
            <Pin size={11} className="rotate-45" />
            置顶
          </span>
        )}
      </div>

      {/* ===== 内容层（玻璃面板上，语义色自适应深浅色） ===== */}
      <div className="relative z-10 flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-faint">
          <span>{formatDate(post.created_at)}</span>
          {minutes != null && (
            <span className="inline-flex items-center gap-1" aria-label="阅读时长">
              ⏱ {minutes} 分钟
            </span>
          )}
          {post.view_count != null && post.view_count > 0 && (
            <span className="inline-flex items-center gap-1" aria-label="阅读数">
              <Eye size={12} /> {post.view_count}
            </span>
          )}
        </div>

        <h3 className="text-lg font-bold leading-snug text-fg transition-colors group-hover:text-brand-300">
          <Link href={postUrl} className="relative z-10">
            {post.title}
          </Link>
        </h3>

        {excerpt && (
          <p className="line-clamp-2 text-sm leading-relaxed text-fg-muted">
            {excerpt}
          </p>
        )}

        {post.tags.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-2 pt-1">
            {post.tags.map((tag) => (
              <Link
                key={tag.slug}
                href={`/tags/${tag.slug}`}
                className="relative z-10 rounded-full border border-ink-600/60 bg-ink-800/40 px-2.5 py-0.5 text-xs text-fg-muted backdrop-blur-sm transition-colors hover:border-brand-400/60 hover:bg-brand-500/10 hover:text-brand-300"
              >
                #{tag.name}
              </Link>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

import Image from "next/image";
import Link from "next/link";
import { Eye } from "lucide-react";
import { formatDate, stripMarkdown, postHref } from "@/lib/format";
import type { PostWithTags } from "@/lib/posts";

/**
 * 文章卡片（首页 / 标签页 / 搜索页复用）：杂志风「图片通铺 + 信息叠加」。
 * - 固定高度（aspect-[3/2]），封面图整卡铺满背景，底部深色渐变保证文字可读
 * - 无封面时用品牌渐变背景 + 文章首字装饰，风格统一
 * - 标题/日期/阅读数/标签直接叠在图上
 * - stretched-link：整卡点击用绝对定位覆盖层 <a>，避免 <a> 嵌套 <a>（HTML 规范禁止）
 */
export default function PostCard({ post }: { post: PostWithTags }) {
  const postUrl = postHref(post);
  const excerpt = post.excerpt || (post.content ? stripMarkdown(post.content).slice(0, 120) : "");

  return (
    <article className="gradient-card group relative aspect-[3/2] overflow-hidden rounded-2xl">
      {/* 整卡点击覆盖层（stretched link，z-0；内容链接需 relative z-10 才能在上层） */}
      <Link href={postUrl} className="absolute inset-0 z-0" aria-label={post.title} />

      {/* ===== 背景：封面图或品牌渐变占位 ===== */}
      {post.cover_image ? (
        <Image
          src={post.cover_image}
          alt={post.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 40rem"
        />
      ) : (
        /* 无封面：固定品牌渐变（不用语义色，浅色模式下卡片仍保持深色底、白字可读） */
        <div className="absolute inset-0 bg-gradient-to-br from-brand-600 via-[#1a1630] to-glow-500" />
      )}

      {/* ===== 底部渐变遮罩（固定深色，保证白字在任何主题下可读） ===== */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent" />

      {/* ===== 内容层：直接叠在图上 ===== */}
      <div className="relative z-10 flex h-full flex-col justify-end p-6">
        <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/60">
          <span>{formatDate(post.created_at)}</span>
          {post.view_count != null && post.view_count > 0 && (
            <span className="inline-flex items-center gap-1" aria-label="阅读数">
              <Eye size={12} /> {post.view_count}
            </span>
          )}
        </div>

        <h3 className="mb-2 text-xl font-bold leading-snug text-white transition-colors group-hover:text-brand-200">
          <Link href={postUrl} className="relative z-10">
            {post.title}
          </Link>
        </h3>

        {excerpt && (
          <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-white/70">
            {excerpt}
          </p>
        )}

        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <Link
                key={tag.slug}
                href={`/tags/${tag.slug}`}
                className="relative z-10 rounded-full border border-white/20 bg-black/30 px-2.5 py-0.5 text-xs text-brand-200 backdrop-blur-sm transition-colors hover:border-brand-400/60 hover:bg-brand-500/20"
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

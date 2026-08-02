import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PostCard from "@/app/components/PostCard";
import { getPostsByTag } from "@/lib/posts";

const PAGE_SIZE = 10;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `标签 #${slug}` };
}

export default async function TagPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, Number(pageStr) || 1);

  const { tag, posts, total } = await getPostsByTag(slug, page, PAGE_SIZE);
  if (!tag) notFound();

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Link href="/" className="mb-6 inline-block text-sm text-fg-muted transition-colors hover:text-brand-300">
        ← 返回首页
      </Link>
      <h1 className="mb-2 text-3xl font-bold text-fg">
        标签：<span className="text-gradient-brand font-display">#{tag.name}</span>
      </h1>
      <p className="mb-10 text-sm text-fg-faint">共 {total} 篇文章</p>

      {posts.length === 0 ? (
        <p className="rounded-2xl border border-ink-700/60 bg-ink-900/50 py-16 text-center text-fg-muted">
          该标签下还没有文章
        </p>
      ) : (
        <div className="grid gap-5">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <nav className="mt-10 flex items-center justify-center gap-4 text-sm" aria-label="分页">
          {page > 1 ? (
            <Link
              href={`/tags/${slug}?page=${page - 1}`}
              className="rounded-lg border border-ink-600 px-4 py-2 text-fg-muted transition-colors hover:border-brand-500/50 hover:text-fg"
            >
              ← 上一页
            </Link>
          ) : (
            <span className="rounded-lg border border-ink-700/50 px-4 py-2 text-fg-faint opacity-50">← 上一页</span>
          )}
          <span className="text-fg-faint">
            {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={`/tags/${slug}?page=${page + 1}`}
              className="rounded-lg border border-ink-600 px-4 py-2 text-fg-muted transition-colors hover:border-brand-500/50 hover:text-fg"
            >
              下一页 →
            </Link>
          ) : (
            <span className="rounded-lg border border-ink-700/50 px-4 py-2 text-fg-faint opacity-50">下一页 →</span>
          )}
        </nav>
      )}
    </div>
  );
}

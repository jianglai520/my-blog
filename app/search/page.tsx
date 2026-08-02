import type { Metadata } from "next";
import Link from "next/link";
import PostCard from "@/app/components/PostCard";
import { searchPosts } from "@/lib/posts";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  return { title: q ? `搜索：${q}` : "搜索" };
}

export default async function SearchPage({ searchParams }: Props) {
  const { q = "" } = await searchParams;
  const query = q.trim();

  const posts = query ? await searchPosts(query) : [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Link href="/" className="mb-6 inline-block text-sm text-fg-muted transition-colors hover:text-brand-300">
        ← 返回首页
      </Link>
      <h1 className="mb-6 text-3xl font-bold text-fg">
        {query ? (
          <>
            搜索「<span className="text-gradient-brand font-display">{query}</span>」
          </>
        ) : (
          "搜索"
        )}
      </h1>

      {!query ? (
        <p className="text-fg-faint">在上方搜索框输入关键词开始搜索。</p>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-ink-700/60 bg-ink-900/50 py-16 text-center">
          <p className="text-lg text-fg-muted">没有找到相关文章</p>
          <p className="mt-2 text-sm text-fg-faint">换个关键词试试？</p>
        </div>
      ) : (
        <>
          <p className="mb-8 text-sm text-fg-faint">找到 {posts.length} 篇文章</p>
          <div className="grid gap-5">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

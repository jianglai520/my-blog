import Link from "next/link";
import PostCard from "@/app/components/PostCard";
import { getPublishedPosts } from "@/lib/posts";

const PAGE_SIZE = 10;

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, Number(pageStr) || 1);

  const { posts, total } = await getPublishedPosts(page, PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      {/* ===== Hero：自我介绍 + 头像 ===== */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <div className="mx-auto mb-6 flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand-500 to-glow-500 shadow-glow-lg ring-2 ring-glow-400/40">
            {/* TODO: 替换为你的真实头像 public/avatar.png，并删除占位首字母 */}
            <span className="font-display text-5xl font-bold text-white">吾</span>
          </div>

          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
            <span className="text-gradient-brand font-display">你好，我是航酱</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-fg-muted">
            全栈学习者 &amp; 生活记录者。这里用文字沉淀技术实践与日常思考，
            欢迎与我交流。
          </p>

          <div className="mt-8 flex items-center justify-center gap-3 text-sm text-fg-muted">
            <span>✍️ 记录开发随笔</span>
            <span className="text-ink-600">·</span>
            <span>🧠 学习笔记</span>
            <span className="text-ink-600">·</span>
            <span>🌱 生活随想</span>
          </div>
        </div>
      </section>

      {/* ===== 文章列表 ===== */}
      <section className="mx-auto max-w-4xl px-4 pb-16">
        <h2 className="mb-6 flex items-center gap-3 font-display text-xl font-semibold text-fg">
          <span className="h-5 w-1 rounded bg-gradient-to-b from-glow-400 to-brand-500" />
          最新文章
          <span className="text-sm font-normal text-fg-faint">共 {total} 篇</span>
        </h2>

        {posts.length === 0 ? (
          <div className="rounded-2xl border border-ink-700/60 bg-ink-900/50 py-20 text-center">
            <p className="text-lg text-fg-muted">还没有文章哦～</p>
            <p className="mt-2 text-sm text-fg-faint">敬请期待第一篇作品</p>
          </div>
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
                href={page === 2 ? "/" : `/?page=${page - 1}`}
                className="rounded-lg border border-ink-600 px-4 py-2 text-fg-muted transition-colors hover:border-brand-500/50 hover:text-fg"
              >
                ← 上一页
              </Link>
            ) : (
              <span className="rounded-lg border border-ink-700/50 px-4 py-2 text-fg-faint opacity-50">
                ← 上一页
              </span>
            )}
            <span className="text-fg-faint">
              {page} / {totalPages}
            </span>
            {page < totalPages ? (
              <Link
                href={`/?page=${page + 1}`}
                className="rounded-lg border border-ink-600 px-4 py-2 text-fg-muted transition-colors hover:border-brand-500/50 hover:text-fg"
              >
                下一页 →
              </Link>
            ) : (
              <span className="rounded-lg border border-ink-700/50 px-4 py-2 text-fg-faint opacity-50">
                下一页 →
              </span>
            )}
          </nav>
        )}
      </section>
    </>
  );
}

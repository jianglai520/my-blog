import Image from "next/image";
import Link from "next/link";
import { getPublishedPosts } from "@/lib/posts";
import { formatDate, stripMarkdown } from "@/lib/format";

export default async function Home() {
  const posts = await getPublishedPosts();

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
        </h2>

        {posts.length === 0 ? (
          <div className="rounded-2xl border border-ink-700/60 bg-ink-900/50 py-20 text-center">
            <p className="text-lg text-fg-muted">还没有文章哦～</p>
            <p className="mt-2 text-sm text-fg-faint">敬请期待第一篇作品</p>
          </div>
        ) : (
          <div className="grid gap-5">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/posts/${post.slug ?? post.id}`}
                className="glow-hover block overflow-hidden rounded-2xl border border-ink-700/60 bg-ink-900/60"
              >
                {post.cover_image ? (
                  <div className="relative h-48 w-full sm:h-56">
                    <Image
                      src={post.cover_image}
                      alt={post.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 56rem"
                    />
                  </div>
                ) : null}
                <div className="p-6">
                  <div className="mb-2 flex items-center gap-2 text-sm text-fg-faint">
                    <span>{formatDate(post.created_at)}</span>
                  </div>
                  <h3 className="mb-2 text-2xl font-semibold text-fg transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-fg-muted line-clamp-2">
                    {post.excerpt ||
                      (post.content ? stripMarkdown(post.content).slice(0, 150) : "")}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

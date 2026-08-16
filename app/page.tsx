import Image from "next/image";
import Link from "next/link";
import { GitFork, Mail } from "lucide-react";
import PostCard from "@/app/components/PostCard";
import { getPublishedPosts } from "@/lib/posts";
import { getSiteSettings } from "@/lib/site";

const PAGE_SIZE = 10;

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, Number(pageStr) || 1);

  const [{ posts, total }, settings] = await Promise.all([
    getPublishedPosts(page, PAGE_SIZE),
    getSiteSettings(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const hasAvatar = settings.avatar_url !== "";
  const cta = [
    settings.github && { href: settings.github, label: "GitHub", icon: GitFork },
    settings.email && { href: `mailto:${settings.email}`, label: "邮箱", icon: Mail },
  ].filter(Boolean) as { href: string; label: string; icon: typeof GitFork }[];

  return (
    <>
      {/* ===== Hero：头像光环 + 渐变标题 + 社交 CTA ===== */}
      <section className="relative overflow-hidden">
        {/* 背景光斑动效（纯装饰，pointer-events-none；浅色模式用品牌色半透明仍协调） */}
        <div aria-hidden="true" className="hero-blob hero-blob--1" />
        <div aria-hidden="true" className="hero-blob hero-blob--2" />
        <div aria-hidden="true" className="hero-blob hero-blob--3" />

        <div className="relative mx-auto max-w-4xl px-4 py-20 text-center">
          <div className="avatar-ring mx-auto mb-8 h-28 w-28">
            {hasAvatar ? (
              <Image
                src={settings.avatar_url}
                alt={settings.author_name}
                width={112}
                height={112}
                className="h-full w-full rounded-full object-cover"
                priority
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-glow-500 font-display text-4xl font-bold text-white">
                {settings.author_name.charAt(0)}
              </div>
            )}
          </div>

          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
            <span className="hero-title font-display">你好，我是{settings.author_name}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-fg-muted">{settings.intro}</p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm text-fg-muted">
            <span>✍️ 记录开发随笔</span>
            <span className="text-ink-600">·</span>
            <span>🧠 学习笔记</span>
            <span className="text-ink-600">·</span>
            <span>🌱 生活随想</span>
          </div>

          {cta.length > 0 && (
            <div className="mt-8 flex items-center justify-center gap-3">
              {cta.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target={item.href.startsWith("http") ? "_blank" : undefined}
                  rel={item.href.startsWith("http") ? "noreferrer noopener" : undefined}
                  className="btn-gradient inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium text-white"
                >
                  <item.icon size={16} />
                  {item.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ===== 文章列表（双列网格） ===== */}
      <section className="mx-auto max-w-5xl px-4 pb-16">
        <h2 className="page-heading mb-6 flex items-center gap-3 font-display text-xl font-semibold text-fg">
          <span className="h-5 w-1 rounded bg-gradient-to-b from-glow-400 to-brand-500" />
          最新文章
          <span className="rounded-full border border-ink-600 bg-ink-800/60 px-2.5 py-0.5 text-xs font-normal text-fg-faint">
            {total} 篇
          </span>
        </h2>

        {posts.length === 0 ? (
          <div className="rounded-2xl border border-ink-700/60 bg-ink-900/50 py-20 text-center">
            <p className="text-lg text-fg-muted">还没有文章哦～</p>
            <p className="mt-2 text-sm text-fg-faint">敬请期待第一篇作品</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
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

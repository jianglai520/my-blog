import type { Metadata } from "next";
import Link from "next/link";
import { getArchives } from "@/lib/posts";

export const metadata: Metadata = { title: "归档" };

export default async function ArchivesPage() {
  const archives = await getArchives();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/" className="mb-6 inline-block text-sm text-fg-muted transition-colors hover:text-brand-300">
        ← 返回首页
      </Link>
      <h1 className="mb-10 text-3xl font-bold text-fg">🗂 文章归档</h1>

      {archives.length === 0 ? (
        <p className="rounded-2xl border border-ink-700/60 bg-ink-900/50 py-16 text-center text-fg-muted">
          还没有文章
        </p>
      ) : (
        <div className="space-y-10">
          {archives.map((group) => (
            <section key={`${group.year}-${group.month}`}>
              <h2 className="mb-4 flex items-center gap-3 font-display text-xl font-semibold text-fg">
                <span className="h-5 w-1 rounded bg-gradient-to-b from-glow-400 to-brand-500" />
                {group.year} 年 {group.month} 月
                <span className="text-sm font-normal text-fg-faint">({group.items.length})</span>
              </h2>
              <ul className="space-y-3">
                {group.items.map((item) => (
                  <li key={item.id} className="flex items-baseline justify-between gap-4 border-b border-ink-700/40 pb-3">
                    <Link
                      href={`/posts/${item.slug ?? item.id}`}
                      className="text-fg transition-colors hover:text-brand-300"
                    >
                      {item.title}
                    </Link>
                    <span className="flex-shrink-0 text-xs text-fg-faint">
                      {new Date(item.created_at).toLocaleDateString("zh-CN")}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

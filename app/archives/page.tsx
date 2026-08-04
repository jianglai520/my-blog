import type { Metadata } from "next";
import Link from "next/link";
import { getArchives } from "@/lib/posts";
import ArchiveGroup from "./ArchiveGroup";

export const metadata: Metadata = { title: "归档" };

export default async function ArchivesPage() {
  const archives = await getArchives();

  // 统计：总篇数 / 年份数 / 月份数
  const total = archives.reduce((sum, g) => sum + g.items.length, 0);
  const years = [...new Set(archives.map((g) => g.year))].sort((a, b) => b - a);
  const monthCount = archives.length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/" className="mb-6 inline-block text-sm text-fg-muted transition-colors hover:text-brand-300">
        ← 返回首页
      </Link>
      <h1 className="mb-6 text-3xl font-bold text-fg">🗂 文章归档</h1>

      {archives.length === 0 ? (
        <p className="rounded-2xl border border-ink-700/60 bg-ink-900/50 py-16 text-center text-fg-muted">
          还没有文章
        </p>
      ) : (
        <>
          {/* 统计总览 */}
          <div className="mb-8 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full border border-brand-400/30 bg-brand-500/10 px-4 py-1.5 text-brand-300">
              共 {total} 篇文章
            </span>
            <span className="rounded-full border border-ink-600 px-4 py-1.5 text-fg-muted">
              {years.length} 个年份
            </span>
            <span className="rounded-full border border-ink-600 px-4 py-1.5 text-fg-muted">
              {monthCount} 个月份
            </span>
          </div>

          {/* 年份快捷导航（仅跨年时显示） */}
          {years.length > 1 && (
            <nav className="mb-8 flex flex-wrap gap-2" aria-label="年份导航">
              {years.map((year) => (
                <a
                  key={year}
                  href={`#year-${year}`}
                  className="rounded-lg border border-ink-600 px-3 py-1 text-sm text-fg-muted transition-colors hover:border-brand-500/50 hover:text-fg"
                >
                  {year} 年
                </a>
              ))}
            </nav>
          )}

          {/* 按年份分区块，支持锚点跳转 */}
          <div className="space-y-10">
            {years.map((year) => (
              <div key={year} id={`year-${year}`} className="scroll-mt-24">
                {archives
                  .filter((g) => g.year === year)
                  .map((group) => (
                    <div key={`${group.year}-${group.month}`} className="mb-10">
                      <ArchiveGroup
                        year={group.year}
                        month={group.month}
                        items={group.items}
                      />
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

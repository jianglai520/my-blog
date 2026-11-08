import type { Metadata } from "next";
import Link from "next/link";
import { getArchives } from "@/lib/posts";
import ArchiveGroup from "./ArchiveGroup";

export const metadata: Metadata = { title: "归档" };

/** 顶部统计小卡 */
function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="glass rounded-xl px-4 py-3 text-center">
      <div className="font-display text-xl font-bold text-fg">{value}</div>
      <div className="mt-0.5 text-xs text-fg-faint">{label}</div>
    </div>
  );
}

export default async function ArchivesPage() {
  const archives = await getArchives();

  // 统计：总篇数 / 年份数 / 月份数
  const total = archives.reduce((sum, g) => sum + g.items.length, 0);
  const years = [...new Set(archives.map((g) => g.year))].sort((a, b) => b - a);
  const monthCount = archives.length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link
        href="/"
        className="mb-6 inline-block text-sm text-fg-muted transition-colors hover:text-brand-400"
      >
        ← 返回首页
      </Link>

      <header className="mb-8">
        <h1 className="mb-2 flex items-center gap-3 text-3xl font-bold text-fg">
          <span className="h-6 w-1 rounded bg-gradient-to-b from-glow-400 to-brand-500" />
          文章归档
        </h1>
        <p className="text-sm text-fg-faint">按时间回看写过的每一篇</p>
      </header>

      {archives.length === 0 ? (
        <div className="glass rounded-2xl py-16 text-center">
          <p className="text-lg text-fg-muted">还没有文章</p>
          <p className="mt-2 text-sm text-fg-faint">发布第一篇后，这里会按时间轴展示</p>
        </div>
      ) : (
        <>
          {/* 统计总览 */}
          <div className="mb-8 grid grid-cols-3 gap-3">
            <Stat value={total} label="篇文章" />
            <Stat value={years.length} label="个年份" />
            <Stat value={monthCount} label="个月份" />
          </div>

          {/* 年份快捷导航（仅跨年时显示） */}
          {years.length > 1 && (
            <nav className="mb-8 flex flex-wrap gap-2" aria-label="年份导航">
              {years.map((year) => (
                <a
                  key={year}
                  href={`#year-${year}`}
                  className="rounded-full border border-ink-600 bg-ink-800/40 px-3 py-1 text-xs text-fg-muted transition-colors hover:border-brand-400/50 hover:text-fg"
                >
                  {year} 年
                </a>
              ))}
            </nav>
          )}

          {/* Changelog 提示（很轻的一行，不抢主视觉） */}
          <p className="mb-4 flex flex-wrap items-center gap-x-1.5 font-mono text-[11px] text-fg-faint">
            <span>~/jianglai520</span>
            <span className="text-brand-400">$</span>
            <span>git log --oneline --stat</span>
            <span className="animate-pulse text-brand-400">▍</span>
          </p>

          {/* 时间轴 */}
          <div className="relative">
            {/* 贯穿全页的渐变时间线 */}
            <div
              aria-hidden="true"
              className="absolute bottom-2 left-[9px] top-2 w-[2px] bg-gradient-to-b from-brand-500 via-glow-400 to-transparent opacity-50"
            />

            {years.map((year) => {
              const yearGroups = archives.filter((g) => g.year === year);
              const yearCount = yearGroups.reduce((n, g) => n + g.items.length, 0);

              return (
                <section key={year} id={`year-${year}`} className="scroll-mt-24">
                  {/* 年份节点 */}
                  <div className="relative mb-6 pl-9">
                    <span
                      aria-hidden="true"
                      className="absolute left-[3px] top-[6px] h-3.5 w-3.5 rounded-full bg-brand-500 ring-4 ring-brand-500/15"
                    />
                    <h2 className="font-display text-2xl font-bold text-fg">
                      {year} 年
                    </h2>
                    <p className="mt-0.5 text-xs text-fg-faint">
                      {yearCount} 篇 · {yearGroups.length} 个月
                    </p>
                  </div>

                  {yearGroups.map((group) => (
                    <ArchiveGroup
                      key={`${group.year}-${group.month}`}
                      year={group.year}
                      month={group.month}
                      items={group.items}
                    />
                  ))}
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { CHANGELOG_REPO_URL, getSiteChangelog, type ChangeType } from "@/lib/changelog";

export const metadata: Metadata = {
  title: "更新日志",
  description: "本站的功能迭代与问题修复记录，按时间倒序展示。",
};

export const revalidate = 3600;

/** 上海时区日期片段（与全站一致） */
function dateParts(iso: string) {
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return { year: get("year"), month: get("month"), day: get("day") };
}

const TYPE_META: Record<ChangeType, { label: string; cls: string }> = {
  feat: { label: "新功能", cls: "border-brand-400/40 bg-brand-500/10 text-brand-300" },
  fix: { label: "修复", cls: "border-amber-400/40 bg-amber-500/10 text-amber-300" },
  docs: { label: "文档", cls: "border-sky-400/40 bg-sky-500/10 text-sky-300" },
  refactor: { label: "重构", cls: "border-violet-400/40 bg-violet-500/10 text-violet-300" },
  perf: { label: "性能", cls: "border-emerald-400/40 bg-emerald-500/10 text-emerald-300" },
  test: { label: "测试", cls: "border-ink-600 bg-ink-800/60 text-fg-muted" },
  chore: { label: "维护", cls: "border-ink-600 bg-ink-800/60 text-fg-muted" },
  style: { label: "样式", cls: "border-ink-600 bg-ink-800/60 text-fg-muted" },
  build: { label: "构建", cls: "border-ink-600 bg-ink-800/60 text-fg-muted" },
  ci: { label: "流水线", cls: "border-ink-600 bg-ink-800/60 text-fg-muted" },
  revert: { label: "回滚", cls: "border-ink-600 bg-ink-800/60 text-fg-muted" },
  update: { label: "更新", cls: "border-ink-600 bg-ink-800/60 text-fg-muted" },
};

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="glass rounded-xl px-4 py-3 text-center">
      <div className="font-display text-xl font-bold text-fg">{value}</div>
      <div className="mt-0.5 text-xs text-fg-faint">{label}</div>
    </div>
  );
}

export default async function LogsPage() {
  const { entries, source } = await getSiteChangelog();

  // 按年月分组（entries 已按时间倒序）
  const months: { key: string; label: string; items: typeof entries }[] = [];
  for (const entry of entries) {
    const { year, month } = dateParts(entry.date);
    const key = `${year}-${month}`;
    const last = months[months.length - 1];
    if (last?.key === key) {
      last.items.push(entry);
    } else {
      months.push({ key, label: `${year} 年 ${Number(month)} 月`, items: [entry] });
    }
  }

  const latest = entries[0];

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
          更新日志
        </h1>
        <p className="text-sm text-fg-faint">
          每一次改动都算数 · 数据来源于仓库提交记录
        </p>
      </header>

      {entries.length === 0 ? (
        <div className="glass rounded-2xl px-6 py-16 text-center">
          <p className="text-lg text-fg-muted">
            {source === "unavailable" ? "暂时无法获取更新日志" : "还没有记录"}
          </p>
          <p className="mt-2 text-sm text-fg-faint">
            可以前往 GitHub 查看完整提交历史
          </p>
          <a
            href={CHANGELOG_REPO_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-brand-400/40 bg-brand-500/10 px-4 py-2 text-sm text-brand-300 transition-colors hover:bg-brand-500/20"
          >
            github.com/jianglai520/my-blog ↗
          </a>
        </div>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-3 gap-3">
            <Stat value={entries.length} label="次改动" />
            <Stat value={months.length} label="个活跃月份" />
            <Stat value={latest ? dateParts(latest.date).month + "." + dateParts(latest.date).day : "—"} label="最近更新" />
          </div>

          <div className="relative">
            <div
              aria-hidden="true"
              className="absolute bottom-2 left-[9px] top-2 w-[2px] bg-gradient-to-b from-brand-500 via-glow-400 to-transparent opacity-40"
            />

            {months.map((month) => (
              <section key={month.key} className="relative mb-8 pl-9">
                <span
                  aria-hidden="true"
                  className="absolute left-[3px] top-[6px] h-3.5 w-3.5 rounded-full bg-brand-500 ring-4 ring-brand-500/15"
                />
                <h2 className="font-display text-xl font-bold text-fg">
                  {month.label}
                </h2>
                <p className="mt-0.5 text-xs text-fg-faint">
                  {month.items.length} 次改动
                </p>

                <ul className="mt-3 space-y-2">
                  {month.items.map((entry) => {
                    const meta = TYPE_META[entry.type] ?? TYPE_META.update;
                    const { month: mm, day } = dateParts(entry.date);
                    return (
                      <li
                        key={entry.sha}
                        className="glass rounded-xl px-4 py-3 transition-colors hover:border-brand-400/30"
                      >
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                          <time
                            dateTime={entry.date}
                            className="font-mono text-[11px] tabular-nums text-fg-faint"
                          >
                            {mm}.{day}
                          </time>
                          <span
                            className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${meta.cls}`}
                          >
                            {meta.label}
                          </span>
                          <span className="min-w-0 flex-1 text-sm leading-relaxed text-fg">
                            {entry.message}
                          </span>
                          <a
                            href={entry.url}
                            target="_blank"
                            rel="noreferrer noopener"
                            title="在 GitHub 查看该提交"
                            className="font-mono text-[11px] text-fg-faint transition-colors hover:text-brand-300"
                          >
                            {entry.shortSha} ↗
                          </a>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>

          <p className="mt-6 text-center font-mono text-[11px] text-fg-faint">
            git log --oneline · 自动同步，1 小时缓存
          </p>
        </>
      )}
    </div>
  );
}

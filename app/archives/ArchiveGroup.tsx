"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, ChevronDown, ChevronRight } from "lucide-react";
import { postHref } from "@/lib/format";
import type { ArchiveItem } from "@/lib/posts";

/** 紧凑日期：2026.08.12（固定 Asia/Shanghai，与全站一致） */
function compactDate(input: string): string {
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(input));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}.${get("month")}.${get("day")}`;
}

/** 由文章 id 生成 7 位短哈希（纯展示，营造 git log 质感） */
function commitHash(id: number): string {
  return id.toString(16).padStart(7, "0");
}

/** 字数紧凑显示：1234 → 1.2k */
function formatWords(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

/**
 * 时间轴月份组：月份节点可折叠（默认展开），文章以玻璃卡片挂在时间轴旁。
 */
export default function ArchiveGroup({
  year,
  month,
  items,
}: {
  year: number;
  month: number;
  items: ArchiveItem[];
}) {
  const [open, setOpen] = useState(true);

  return (
    <section
      id={`archive-${year}-${month}`}
      className="relative mb-8 scroll-mt-24 pl-9"
    >
      {/* 月份节点（对齐时间轴） */}
      <span
        aria-hidden="true"
        className="absolute left-[5px] top-[7px] h-2.5 w-2.5 rounded-full border-2 border-brand-500 bg-ink-950"
      />

      {/* 月份标题（可点击折叠） */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mb-3 flex w-full items-center gap-2 text-left text-sm font-semibold text-fg-muted transition-colors hover:text-fg"
      >
        <span className="font-mono">{String(month).padStart(2, "0")}</span> 月
        <span className="text-xs font-normal text-fg-faint">· {items.length} 篇</span>
        <span className="ml-auto text-fg-faint">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
      </button>

      {open && (
        <div className="space-y-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="glass relative overflow-hidden rounded-xl p-4 pl-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-glow"
            >
              {/* Changelog 风格的左侧渐变强调条 */}
              <span
                aria-hidden="true"
                className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-brand-500 to-glow-400 opacity-60"
              />

              {/* commit 行：短哈希 / 日期 / 阅读时长 / 字数 / 阅读数 */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-fg-faint">
                <span className="inline-flex items-center gap-1 text-brand-400/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
                  #{commitHash(item.id)}
                </span>
                <span>{compactDate(item.created_at)}</span>
                {item.reading_minutes != null && (
                  <span className="text-brand-400/70">+{item.reading_minutes}min</span>
                )}
                {item.word_count != null && (
                  <span>+{formatWords(item.word_count)}字</span>
                )}
                {item.view_count > 0 && (
                  <span className="inline-flex items-center gap-1" aria-label="阅读数">
                    <Eye size={10} /> {item.view_count}
                  </span>
                )}
              </div>

              <Link
                href={postHref(item)}
                className="mt-1.5 block text-sm font-medium text-fg transition-colors hover:text-brand-400"
              >
                {item.title}
              </Link>
              {item.excerpt && (
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-fg-faint">
                  {item.excerpt}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

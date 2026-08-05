"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, ChevronDown, ChevronRight } from "lucide-react";
import { formatDate } from "@/lib/format";
import type { ArchiveItem } from "@/lib/posts";

/**
 * 归档月份组：标题可折叠（默认展开），条目显示标题/摘要/日期/阅读量。
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
    <section id={`archive-${year}-${month}`} className="scroll-mt-24">
      {/* 月份标题（可点击折叠） */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mb-4 flex w-full items-center gap-3 text-left font-display text-xl font-semibold text-fg transition-colors hover:text-brand-300"
      >
        <span className="h-5 w-1 rounded bg-gradient-to-b from-glow-400 to-brand-500" />
        {year} 年 {month} 月
        <span className="text-sm font-normal text-fg-faint">({items.length})</span>
        <span className="ml-auto text-fg-faint">
          {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </span>
      </button>

      {open && (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-baseline justify-between gap-4 border-b border-ink-700/40 pb-3"
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`/posts/${item.slug ?? item.id}`}
                  className="text-fg transition-colors hover:text-brand-300"
                >
                  {item.title}
                </Link>
                {item.excerpt ? (
                  <p className="mt-0.5 line-clamp-1 text-xs text-fg-faint">
                    {item.excerpt}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-shrink-0 items-center gap-3 text-xs text-fg-faint">
                {item.view_count > 0 && (
                  <span className="inline-flex items-center gap-1" aria-label="阅读数">
                    <Eye size={12} /> {item.view_count}
                  </span>
                )}
                <span>{formatDate(item.created_at)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

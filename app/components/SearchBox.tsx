"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

/** 导航搜索框：输入防抖后跳转 /search?q= */
export default function SearchBox() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(q: string) {
    setValue(q);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const trimmed = q.trim();
      if (trimmed) {
        router.push(`/search?q=${encodeURIComponent(trimmed)}`);
      } else {
        router.push("/");
      }
    }, 400);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const q = value.trim();
        if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
      }}
      className="relative"
      role="search"
    >
      <input
        type="search"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="搜索文章…"
        aria-label="搜索文章"
        className="w-36 rounded-lg border border-ink-600 bg-ink-800 px-3 py-1.5 text-sm text-fg placeholder:text-fg-faint focus:w-52 focus:border-brand-500 focus:outline-none transition-all"
      />
    </form>
  );
}

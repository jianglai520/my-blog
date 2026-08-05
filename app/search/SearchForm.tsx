"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

/** 搜索页输入框：初始值 = 当前关键词，提交后跳转 /search?q= 重新搜索 */
export default function SearchForm({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = value.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  }

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className="mb-8 flex items-center gap-2 rounded-xl border border-ink-600 bg-ink-800 px-4 py-3 transition-colors focus-within:border-brand-500"
    >
      <Search size={16} className="flex-shrink-0 text-fg-faint" />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="输入关键词搜索文章…"
        aria-label="搜索文章"
        className="min-w-0 flex-1 bg-transparent text-fg placeholder:text-fg-faint focus:outline-none"
      />
      <button
        type="submit"
        className="flex-shrink-0 rounded-lg bg-gradient-to-r from-brand-600 to-brand-500 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:from-brand-500 hover:to-glow-400"
      >
        搜索
      </button>
    </form>
  );
}

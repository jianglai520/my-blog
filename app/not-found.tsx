import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";

/** 全局 404 趣味页（不存在的文章/标签/路径都会走到这里） */
export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-4 py-16 text-center">
      {/* 大号 404 */}
      <p className="hero-title font-display text-7xl font-bold text-transparent sm:text-8xl">
        404
      </p>

      <h1 className="mt-4 text-2xl font-bold text-fg">页面迷路了…</h1>

      <p className="mt-3 max-w-md text-sm leading-relaxed text-fg-muted">
        你要找的内容可能被移动、删除，或者压根不存在（就像我的 404 页面一样神秘 🤔）。
        <br />
        别慌，给你几个选项：
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="btn-gradient inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium text-white"
        >
          <ArrowLeft size={16} /> 回到首页
        </Link>
        <Link
          href="/archives"
          className="inline-flex items-center gap-2 rounded-full border border-ink-600 px-6 py-2.5 text-sm text-fg-muted transition-colors hover:border-brand-500/50 hover:text-fg"
        >
          🗂 去看看归档
        </Link>
        <Link
          href="/search"
          className="inline-flex items-center gap-2 rounded-full border border-ink-600 px-6 py-2.5 text-sm text-fg-muted transition-colors hover:border-brand-500/50 hover:text-fg"
        >
          <Search size={15} /> 搜点什么
        </Link>
      </div>

      <p className="mt-10 text-xs text-fg-faint">
        如果确信这是个 bug，欢迎去留言板告诉我 😉
      </p>
    </div>
  );
}

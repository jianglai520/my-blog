import Link from "next/link";
import SearchBox from "./SearchBox";
import ThemeToggle from "./ThemeToggle";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-700/60 bg-ink-950/70 backdrop-blur-md">
      <div className="gradient-top-line" />
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
        <Link href="/" className="group flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-glow-500 font-display text-base font-bold text-white shadow-glow transition-transform group-hover:scale-105">
            J
          </span>
          <span className="font-display text-lg font-semibold tracking-tight text-fg transition-colors group-hover:text-brand-300">
            jianglai520
          </span>
        </Link>

        <nav className="flex items-center gap-1" aria-label="主导航">
          <Link href="/" className="nav-link rounded-md px-3 py-2 text-sm text-fg-muted transition-colors hover:text-fg">
            首页
          </Link>
          <Link href="/archives" className="nav-link rounded-md px-3 py-2 text-sm text-fg-muted transition-colors hover:text-fg">
            归档
          </Link>
          <Link href="/projects" className="nav-link rounded-md px-3 py-2 text-sm text-fg-muted transition-colors hover:text-fg">
            项目
          </Link>
          <Link href="/skills" className="nav-link rounded-md px-3 py-2 text-sm text-fg-muted transition-colors hover:text-fg">
            技能
          </Link>
          <Link href="/guestbook" className="nav-link rounded-md px-3 py-2 text-sm text-fg-muted transition-colors hover:text-fg">
            留言板
          </Link>
          <Link href="/about" className="nav-link rounded-md px-3 py-2 text-sm text-fg-muted transition-colors hover:text-fg">
            关于
          </Link>
          <SearchBox />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

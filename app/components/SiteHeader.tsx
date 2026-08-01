import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-700/60 bg-ink-950/70 backdrop-blur-md">
      <div className="gradient-top-line" />
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="group flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-glow-500 font-display text-base font-bold text-white shadow-glow">
            J
          </span>
          <span className="font-display text-lg font-semibold tracking-tight text-fg transition-colors group-hover:text-brand-300">
            jianglai520
          </span>
        </Link>

        <nav className="flex items-center gap-1" aria-label="主导航">
          <Link
            href="/"
            className="rounded-md px-3 py-2 text-sm text-fg-muted transition-colors hover:bg-ink-700/50 hover:text-fg"
          >
            首页
          </Link>
        </nav>
      </div>
    </header>
  );
}

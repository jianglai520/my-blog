"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import SearchBox from "./SearchBox";
import ThemeToggle from "./ThemeToggle";

const NAV_ITEMS = [
  { href: "/", label: "首页" },
  { href: "/archives", label: "归档" },
  { href: "/projects", label: "项目" },
  { href: "/skills", label: "技能" },
  { href: "/guestbook", label: "留言" },
  { href: "/about", label: "关于" },
];

/**
 * 移动端导航（< md 显示）。
 * 桌面端导航保持 SiteHeader 里的原样，这里只负责小屏折叠，
 * 避免 6 个链接 + 搜索框在窄屏挤成一行。
 */
export default function MobileNav() {
  const [open, setOpen] = useState(false);

  // Escape 关闭；展开时锁定页面滚动，收起后恢复
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? "关闭菜单" : "打开菜单"}
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        onClick={() => setOpen((value) => !value)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-ink-700/50 hover:text-fg"
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>

      {open && (
        <div
          id="mobile-nav-panel"
          className="fixed inset-x-0 top-16 z-40 max-h-[calc(100vh-4rem)] overflow-y-auto border-b border-ink-700/60 bg-ink-950/95 px-4 pb-6 pt-3 backdrop-blur-xl"
        >
          <div className="mb-3 flex items-center gap-2">
            <div className="flex-1 [&_input]:w-full">
              <SearchBox />
            </div>
            <ThemeToggle />
          </div>

          <nav className="flex flex-col gap-1" aria-label="移动端主导航">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-fg-muted transition-colors hover:bg-ink-800 hover:text-fg"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}

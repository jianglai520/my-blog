"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

const emptySubscribe = () => () => {};

/** 主题切换按钮（深/浅），显示当前主题的对立图标 */
export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  // hydration 检测：SSR 渲染占位，客户端水合后显示真实图标（避免闪烁/不一致）
  const hydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!hydrated) {
    return <span className="h-8 w-8" aria-hidden="true" />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label={isDark ? "切换到浅色模式" : "切换到深色模式"}
      title={isDark ? "浅色模式" : "深色模式"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="ml-1 flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-ink-700/50 hover:text-fg"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

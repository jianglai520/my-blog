"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

/**
 * 返回顶部按钮：滚动超过 400px 后右下角出现（AI 问答按钮上方），点击平滑回顶。
 */
export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    onScroll(); // 初始化状态
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="返回顶部"
      className="fixed bottom-24 right-6 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-ink-600 bg-ink-900/90 text-fg-muted shadow-lg backdrop-blur transition-colors hover:border-brand-500/50 hover:text-fg"
    >
      <ArrowUp size={18} />
    </button>
  );
}

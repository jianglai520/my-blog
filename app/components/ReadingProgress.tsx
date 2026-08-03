"use client";

import { useEffect, useState } from "react";

/** 文章阅读进度条：顶部细条，随滚动更新（品牌渐变） */
export default function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const total = doc.scrollHeight - doc.clientHeight;
      setProgress(total > 0 ? (doc.scrollTop / total) * 100 : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div className="fixed left-0 top-0 z-50 h-0.5 w-full bg-transparent" aria-hidden="true">
      <div
        className="h-full bg-gradient-to-r from-brand-500 to-glow-400 transition-[width] duration-75"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

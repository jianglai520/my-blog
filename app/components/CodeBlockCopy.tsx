"use client";

import { useEffect } from "react";

/**
 * 代码块复制按钮（文章页用）：
 * 给 .markdown-body 里的 <pre> 添加右上角「复制」按钮（navigator.clipboard）。
 * 挂载后扫描一次（正文是 SSR 渲染），不用 MutationObserver（避免性能风暴）。
 */
export default function CodeBlockCopy() {
  useEffect(() => {
    document.querySelectorAll<HTMLElement>(".markdown-body pre").forEach((pre) => {
      if (pre.dataset.copy) return;
      pre.dataset.copy = "1";

      // pre 需要相对定位（按钮绝对定位在右上角）
      if (getComputedStyle(pre).position === "static") {
        pre.style.position = "relative";
      }

      const btn = document.createElement("button");
      btn.textContent = "复制";
      btn.type = "button";
      btn.className =
        "absolute right-2 top-2 z-10 rounded-md border border-ink-600 bg-ink-800/80 px-2 py-0.5 text-xs text-fg-muted opacity-0 transition-opacity hover:border-brand-500/50 hover:text-fg group-hover:opacity-100";
      // 代码块 hover 时显示按钮（pre 上没有 group，用 pre:hover 显示）
      btn.style.opacity = "0";

      btn.onmouseenter = () => {
        btn.style.opacity = "1";
      };
      pre.onmouseenter = () => {
        btn.style.opacity = "1";
      };
      pre.onmouseleave = () => {
        btn.style.opacity = "0";
      };

      btn.onclick = async () => {
        const code = pre.querySelector("code")?.textContent ?? "";
        try {
          await navigator.clipboard.writeText(code);
          btn.textContent = "✅ 已复制";
          btn.style.opacity = "1";
          setTimeout(() => {
            btn.textContent = "复制";
            btn.style.opacity = "0";
          }, 1500);
        } catch {
          btn.textContent = "❌ 复制失败";
          setTimeout(() => {
            btn.textContent = "复制";
          }, 2000);
        }
      };

      pre.appendChild(btn);
    });
  }, []);

  return null;
}

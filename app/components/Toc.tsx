"use client";

import { useEffect } from "react";

/**
 * 文章目录 TOC：扫描正文 h2/h3（rehype-slug 已生成 id），生成目录框插入正文前。
 * 点击平滑滚动到对应标题。挂载后扫描一次（正文 SSR 渲染，无需 MutationObserver）。
 */
export default function Toc() {
  useEffect(() => {
    const headings = document.querySelectorAll<HTMLElement>(
      ".markdown-body h2, .markdown-body h3"
    );
    const items = Array.from(headings)
      .filter((h) => h.id)
      .map((h) => ({
        id: h.id,
        text: h.textContent?.trim() ?? "",
        level: h.tagName === "H2" ? 2 : 3,
      }))
      .filter((h) => h.text);
    if (items.length < 2) return; // 标题太少不显示目录

    const nav = document.createElement("nav");
    nav.className =
      "mb-8 rounded-xl border border-ink-700/60 bg-ink-900/50 p-4";

    const title = document.createElement("div");
    title.textContent = "📑 目录";
    title.className = "mb-3 font-display text-sm font-semibold text-fg";

    const ul = document.createElement("ul");
    ul.className = "space-y-1.5";
    items.forEach((it) => {
      const li = document.createElement("li");
      li.style.paddingLeft = it.level === 3 ? "1rem" : "0";
      const a = document.createElement("a");
      a.href = `#${it.id}`;
      a.textContent = it.text;
      a.className =
        "block truncate text-sm text-fg-muted transition-colors hover:text-brand-300";
      a.onclick = (e) => {
        e.preventDefault();
        document.getElementById(it.id)?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      };
      li.appendChild(a);
      ul.appendChild(li);
    });

    nav.append(title, ul);

    const body = document.querySelector(".markdown-body");
    body?.parentNode?.insertBefore(nav, body);
  }, []);

  return null;
}

"use client";

import { useEffect } from "react";

/**
 * 图片点击放大（lightbox）：文章正文 .markdown-body img 点击后全屏查看。
 * 点击遮罩/关闭按钮/Esc 关闭。挂载后扫描一次（DOM 操作，无 React state）。
 */
export default function ImageLightbox() {
  useEffect(() => {
    const imgs = document.querySelectorAll<HTMLImageElement>(".markdown-body img");
    if (!imgs.length) return;

    // 遮罩层
    const overlay = document.createElement("div");
    overlay.className =
      "fixed inset-0 z-50 hidden items-center justify-center bg-black/90 p-6";

    const big = document.createElement("img");
    big.className = "max-h-full max-w-full rounded-lg object-contain shadow-glow-lg";
    big.alt = "";

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✕";
    closeBtn.className =
      "absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl text-white transition-colors hover:bg-white/20";
    closeBtn.setAttribute("aria-label", "关闭");

    overlay.append(big, closeBtn);
    document.body.appendChild(overlay);

    const open = (src: string, alt: string) => {
      big.src = src;
      big.alt = alt;
      overlay.classList.remove("hidden");
      overlay.classList.add("flex");
      document.body.style.overflow = "hidden";
    };
    const close = () => {
      overlay.classList.add("hidden");
      overlay.classList.remove("flex");
      document.body.style.overflow = "";
    };

    imgs.forEach((img) => {
      img.style.cursor = "zoom-in";
      img.onclick = () => open(img.src, img.alt);
    });

    overlay.onclick = (e) => {
      if (e.target === overlay || e.target === closeBtn) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);

    return () => {
      overlay.remove();
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, []);

  return null;
}

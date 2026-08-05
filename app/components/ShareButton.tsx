"use client";

import { useState } from "react";
import { Share2, Link2, Check } from "lucide-react";

/**
 * 分享按钮：文章页展开面板 → 复制链接 / 微博 / QQ / X 分享。
 * URL 取当前页面地址（客户端），无需传入。
 */
export default function ShareButton({ title }: { title: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const url = typeof window !== "undefined" ? window.location.href : "";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 剪贴板不可用时静默（低概率）
    }
  }

  const shareLinks = [
    {
      name: "微博",
      href: `https://service.weibo.com/share/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
    },
    {
      name: "QQ",
      href: `https://connect.qq.com/widget/shareqq/index.html?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
    },
    {
      name: "X",
      href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    },
  ];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="分享文章"
        className="inline-flex items-center gap-1.5 rounded-full border border-ink-600 px-3.5 py-1.5 text-sm text-fg-muted transition-colors hover:border-brand-500/50 hover:text-fg"
      >
        <Share2 size={14} /> 分享
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-44 rounded-xl border border-ink-700/60 bg-ink-900/95 p-2 shadow-xl backdrop-blur">
          <button
            type="button"
            onClick={copyLink}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg-muted transition-colors hover:bg-ink-800 hover:text-fg"
          >
            {copied ? (
              <>
                <Check size={14} className="text-emerald-400" /> 已复制链接
              </>
            ) : (
              <>
                <Link2 size={14} /> 复制链接
              </>
            )}
          </button>
          {shareLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              target="_blank"
              rel="noreferrer noopener"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg-muted transition-colors hover:bg-ink-800 hover:text-fg"
            >
              分享到 {link.name}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

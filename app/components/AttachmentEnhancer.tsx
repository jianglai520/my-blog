"use client";

import { useEffect } from "react";

/**
 * 附件链接增强（文章页用）：
 * 把正文里的附件链接（Supabase Storage attachments 目录）重建成操作区：
 *   📎 文件名  [👁 在线预览] [⬇ 下载]
 * - 在线预览：PDF/txt/md 用原始 URL（浏览器预览）；doc/docx/xls/xlsx/ppt/pptx 用微软 Office Online Viewer
 * - 下载：原始 URL + download 属性（用原始文件名）
 *
 * ⚠️ 性能注意：只在挂载时扫描一次（正文是 SSR 渲染，挂载时链接已存在）；
 * 不用 MutationObserver 监听 body（任何 DOM 变化都会触发全文档扫描，造成卡顿）。
 */
export default function AttachmentEnhancer() {
  useEffect(() => {
    const OFFICE_EXTS = new Set(["doc", "docx", "xls", "xlsx", "ppt", "pptx"]);

    document
      .querySelectorAll<HTMLAnchorElement>(
        '.markdown-body a[href*="/post-images/attachments/"]'
      )
      .forEach((a) => {
        if (a.dataset.enhanced === "1") return;
        a.dataset.enhanced = "1";

        const url = a.href;
        const ext = url.split(".").pop()?.toLowerCase() ?? "";
        const filename = (a.textContent ?? "附件").replace(/^📎\s*/, "").trim() || "附件";

        const wrap = document.createElement("span");
        wrap.className =
          "attachment-item my-2 flex flex-wrap items-center gap-2 rounded-lg border border-ink-700/60 bg-ink-900/50 px-3 py-2";

        const name = document.createElement("span");
        name.textContent = `📎 ${filename}`;
        name.className = "text-sm font-medium text-fg";

        const preview = document.createElement("a");
        preview.href = OFFICE_EXTS.has(ext)
          ? `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`
          : url;
        preview.target = "_blank";
        preview.rel = "noreferrer noopener";
        preview.textContent = "👁 在线预览";
        preview.className =
          "rounded-md border border-brand-400/40 bg-brand-500/10 px-2.5 py-1 text-xs text-brand-300 transition-colors hover:bg-brand-500/20";

        const download = document.createElement("a");
        // 跨域 download 属性无效 → 走服务端下载代理（设置 Content-Disposition: attachment）
        download.href = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
        download.textContent = "⬇ 下载";
        download.className =
          "rounded-md border border-ink-600 px-2.5 py-1 text-xs text-fg-muted transition-colors hover:border-brand-500/50 hover:text-fg";

        wrap.append(name, preview, download);
        a.replaceWith(wrap);
      });
  }, []);

  return null;
}

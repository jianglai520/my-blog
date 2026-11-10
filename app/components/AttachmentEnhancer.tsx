"use client";

import { useEffect } from "react";

/**
 * 附件链接增强（文章页用）：
 * 把正文里的附件链接（Supabase Storage attachments 目录）重建成统一的操作卡片：
 *   [PDF] 文件名 / 类型说明            [👁 在线预览] [⬇ 下载]
 * - 在线预览：PDF/txt/md 用原始 URL（浏览器预览）；doc/docx/xls/xlsx/ppt/pptx 用微软 Office Online Viewer
 * - 下载：走 /api/download 服务端代理（跨域 download 属性无效）
 *
 * ⚠️ 性能注意：只在挂载时扫描一次（正文是 SSR 渲染，挂载时链接已存在）；
 * 不用 MutationObserver 监听 body（任何 DOM 变化都会触发全文档扫描，造成卡顿）。
 * ⚠️ 幂等：同 URL 已生成过卡片就不再重复生成，并清掉重复/残留节点
 * （Fast Refresh 或客户端重渲染可能让原始链接与卡片同时存在）。
 */

const OFFICE_EXTS = new Set(["doc", "docx", "xls", "xlsx", "ppt", "pptx"]);

type FileMeta = { ext: string; label: string; badge: string };

const FILE_META: Record<string, Omit<FileMeta, "ext">> = {
  pdf: { label: "PDF 文档", badge: "bg-red-500/15 text-red-400" },
  doc: { label: "Word 文档", badge: "bg-blue-500/15 text-blue-400" },
  docx: { label: "Word 文档", badge: "bg-blue-500/15 text-blue-400" },
  xls: { label: "Excel 表格", badge: "bg-emerald-500/15 text-emerald-400" },
  xlsx: { label: "Excel 表格", badge: "bg-emerald-500/15 text-emerald-400" },
  ppt: { label: "PPT 演示", badge: "bg-orange-500/15 text-orange-400" },
  pptx: { label: "PPT 演示", badge: "bg-orange-500/15 text-orange-400" },
  zip: { label: "压缩包", badge: "bg-amber-500/15 text-amber-400" },
  txt: { label: "文本文件", badge: "bg-sky-500/15 text-sky-400" },
  md: { label: "Markdown", badge: "bg-sky-500/15 text-sky-400" },
};

const DEFAULT_META = { label: "附件", badge: "bg-brand-500/15 text-brand-300" };

const EYE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;

const DOWNLOAD_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>`;

function createEl<K extends keyof HTMLElementTagNameMap>(tag: K, className: string) {
  const el = document.createElement(tag);
  el.className = className;
  return el;
}

export default function AttachmentEnhancer() {
  useEffect(() => {
    document
      .querySelectorAll<HTMLAnchorElement>('.markdown-body a[href*="/post-images/attachments/"]')
      .forEach((a) => {
        const url = a.href;

        // 幂等守卫：同一 URL 的卡片已存在时，只清掉这条原始链接，不再重复生成
        const existing = Array.from(
          document.querySelectorAll<HTMLElement>(".attachment-item"),
        ).filter((el) => el.dataset.attachmentUrl === url);
        if (existing.length > 0) {
          existing.slice(1).forEach((el) => el.remove());
          a.remove();
          return;
        }

        const ext = url.split(".").pop()?.toLowerCase() ?? "";
        const filename = (a.textContent ?? "附件").replace(/^📎\s*/, "").trim() || "附件";
        const meta = FILE_META[ext] ?? DEFAULT_META;

        const card = createEl(
          "span",
          "attachment-item my-3 flex flex-wrap items-center gap-3 rounded-xl border border-ink-700/60 bg-ink-900/50 px-3 py-2.5",
        );
        card.dataset.attachmentUrl = url;

        // 左侧类型徽标（用文件后缀代替 emoji，视觉更干净）
        const badge = createEl(
          "span",
          `flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-mono text-[10px] font-semibold uppercase tracking-tight ${meta.badge}`,
        );
        badge.textContent = ext || "FILE";

        // 中间文件名 + 类型说明
        const info = createEl("span", "min-w-0 flex-1");
        const name = createEl("span", "block truncate text-sm font-medium text-fg");
        name.textContent = filename;
        name.title = filename;
        const kind = createEl("span", "mt-0.5 block text-[11px] text-fg-faint");
        kind.textContent = meta.label;
        info.append(name, kind);

        // 操作按钮
        const actions = createEl("span", "flex shrink-0 items-center gap-2");

        const preview = createEl(
          "a",
          "inline-flex items-center gap-1 rounded-md border border-brand-400/40 bg-brand-500/10 px-2 py-1 text-[11px] font-medium text-brand-300 transition-colors hover:bg-brand-500/20",
        );
        preview.href = OFFICE_EXTS.has(ext)
          ? `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`
          : url;
        preview.target = "_blank";
        preview.rel = "noreferrer noopener";
        preview.innerHTML = `${EYE_ICON}<span>在线预览</span>`;

        const download = createEl(
          "a",
          "inline-flex items-center gap-1 rounded-md border border-ink-600 px-2 py-1 text-[11px] text-fg-muted transition-colors hover:border-brand-500/50 hover:text-fg",
        );
        // 跨域 download 属性无效 → 走服务端下载代理（设置 Content-Disposition: attachment）
        download.href = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
        download.innerHTML = `${DOWNLOAD_ICON}<span>下载</span>`;

        actions.append(preview, download);
        card.append(badge, info, actions);
        a.replaceWith(card);
      });
  }, []);

  return null;
}

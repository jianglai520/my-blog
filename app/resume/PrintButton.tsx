"use client";

import { Printer } from "lucide-react";

/** 打印按钮（客户端）：浏览器打印 → 存 PDF（配合 @media print 样式） */
export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 rounded-lg border border-ink-600 px-4 py-2 text-sm text-fg-muted transition-colors hover:border-brand-500/50 hover:text-fg"
    >
      <Printer size={14} /> 打印 / 导出 PDF
    </button>
  );
}

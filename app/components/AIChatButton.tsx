"use client";

import { useState } from "react";
import { MessageCircle, X, Loader2, Sparkles } from "lucide-react";

/**
 * 站内 AI 问答（Phase 1）：文章页右下角悬浮按钮 → 弹窗输入问题 → 调 /api/ai → 展示回答。
 */
export default function AIChatButton({ identifier }: { identifier: string }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function ask() {
    const q = question.trim();
    if (!q || loading) return;
    setLoading(true);
    setError("");
    setAnswer("");
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, question: q }),
      });
      const data = (await res.json()) as { answer?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "请求失败，请稍后再试");
      setAnswer(data.answer ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "请求失败，请稍后再试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* 悬浮按钮 */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "关闭 AI 问答" : "问 AI"}
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-glow-500 text-white shadow-lg shadow-brand-500/30 transition-transform hover:scale-105"
      >
        {open ? <X size={20} /> : <MessageCircle size={20} />}
      </button>

      {/* 弹窗 */}
      {open && (
        <div className="fixed bottom-20 right-6 z-40 flex w-[20rem] max-w-[calc(100vw-3rem)] flex-col rounded-2xl border border-ink-700/60 bg-ink-900/95 p-4 shadow-2xl backdrop-blur">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles size={16} className="text-brand-300" />
            <h3 className="text-sm font-semibold text-fg">问 AI（基于本文）</h3>
          </div>

          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="输入你的问题…（如：这篇文章讲了什么？）"
            rows={3}
            maxLength={500}
            className="mb-2 w-full resize-none rounded-lg border border-ink-600 bg-ink-800 px-3 py-2 text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-brand-500"
          />

          <button
            type="button"
            onClick={ask}
            disabled={loading || !question.trim()}
            className="rounded-lg bg-gradient-to-r from-brand-600 to-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:from-brand-500 hover:to-glow-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "思考中…" : "提问"}
          </button>

          <div className="mt-3 max-h-64 space-y-2 overflow-y-auto text-sm">
            {loading && (
              <p className="flex items-center gap-2 text-fg-muted">
                <Loader2 size={14} className="animate-spin" /> AI 正在阅读文章并思考…
              </p>
            )}
            {answer && (
              <div className="whitespace-pre-wrap rounded-lg border border-ink-700/60 bg-ink-800/60 p-3 leading-relaxed text-fg-muted">
                {answer}
              </div>
            )}
            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>

          <p className="mt-2 text-[11px] leading-relaxed text-fg-faint">
            回答基于本文内容生成，内容会发送给 AI 服务；如有偏差请以原文为准。
          </p>
        </div>
      )}
    </>
  );
}

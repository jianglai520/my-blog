"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { MessageCircle, X, Loader2, Sparkles, GripHorizontal } from "lucide-react";

type Citation = {
  post_id: number;
  title: string;
  href: string;
  similarity: number;
};

/** 行内渲染：**粗体** 与 `行内代码`（React 元素安全渲染，防 XSS） */
function inline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code key={i} className="rounded bg-ink-700/60 px-1 text-[0.9em]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

/** 轻量 Markdown 渲染：标题 / 无序列表 / 段落 + 行内粗体/代码 */
function renderMarkdown(text: string): ReactNode[] {
  const lines = text.split("\n");
  const nodes: ReactNode[] = [];
  let list: string[] = [];

  const flushList = () => {
    if (list.length) {
      nodes.push(
        <ul key={nodes.length} className="my-1 list-disc space-y-0.5 pl-5">
          {list.map((item, i) => (
            <li key={i}>{inline(item)}</li>
          ))}
        </ul>,
      );
      list = [];
    }
  };

  for (const raw of lines) {
    const t = raw.trim();
    if (/^#{1,4}\s+/.test(t)) {
      flushList();
      nodes.push(
        <h4 key={nodes.length} className="mt-2 font-semibold text-fg">
          {inline(t.replace(/^#{1,4}\s+/, ""))}
        </h4>,
      );
    } else if (/^[-*•]\s+/.test(t)) {
      list.push(t.replace(/^[-*•]\s+/, ""));
    } else if (!t) {
      flushList();
    } else {
      flushList();
      nodes.push(<p key={nodes.length}>{inline(t)}</p>);
    }
  }
  flushList();
  return nodes;
}

/**
 * 站内 AI 问答：文章页右下角悬浮按钮 → 弹窗（可拖动）→ 调 /api/ai → 回答（轻量 Markdown）。
 */
export default function AIChatButton({ identifier }: { identifier: string }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [citations, setCitations] = useState<Citation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // 拖动位置：null = 默认右下角；拖动后记忆（仅本次会话）
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // 组件卸载时中止未完成的流
  useEffect(() => () => abortRef.current?.abort(), []);

  function startDrag(e: React.MouseEvent) {
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: rect.left, oy: rect.top };
  }
  function onDrag(e: React.MouseEvent) {
    if (!dragRef.current) return;
    setPos({
      x: dragRef.current.ox + (e.clientX - dragRef.current.sx),
      y: dragRef.current.oy + (e.clientY - dragRef.current.sy),
    });
  }
  function endDrag() {
    dragRef.current = null;
  }

  async function ask() {
    const q = question.trim();
    if (!q || loading) return;

    // 新提问先中止上一次未完成的流
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError("");
    setAnswer("");
    setCitations([]);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, question: q }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "请求失败，请稍后再试");
      }
      if (!res.body) throw new Error("浏览器不支持流式响应");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;

          let event: {
            type?: string;
            text?: string;
            error?: string;
            citations?: Citation[];
          };
          try {
            event = JSON.parse(payload);
          } catch {
            continue;
          }

          if (event.type === "citations") {
            setCitations(event.citations ?? []);
          } else if (event.type === "delta" && event.text) {
            full += event.text;
            setAnswer(full);
          } else if (event.type === "error") {
            throw new Error(event.error || "回答生成中断，请重试");
          }
        }
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "请求失败，请稍后再试");
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setLoading(false);
      }
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

      {/* 弹窗（可拖动：按住顶部标题栏移动） */}
      {open && (
        <div
          ref={panelRef}
          style={pos ? { left: pos.x, top: pos.y } : undefined}
          className={`fixed z-40 flex w-[20rem] max-w-[calc(100vw-3rem)] flex-col rounded-2xl border border-ink-700/60 bg-ink-900/95 p-4 shadow-2xl backdrop-blur ${
            pos ? "" : "bottom-20 right-6"
          }`}
        >
          {/* 标题栏（拖动区域） */}
          <div
            onMouseDown={startDrag}
            onMouseMove={onDrag}
            onMouseUp={endDrag}
            onMouseLeave={endDrag}
            className="mb-3 flex cursor-move select-none items-center gap-2"
            title="按住拖动"
          >
            <GripHorizontal size={14} className="text-fg-faint" />
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
            {loading && !answer && (
              <p className="flex items-center gap-2 text-fg-muted">
                <Loader2 size={14} className="animate-spin" /> AI 正在阅读文章并思考…
              </p>
            )}
            {answer && (
              <div className="space-y-1 rounded-lg border border-ink-700/60 bg-ink-800/60 p-3 leading-relaxed text-fg-muted">
                {renderMarkdown(answer)}
              </div>
            )}
            {citations.length > 0 && (
              <div className="rounded-lg border border-ink-700/60 bg-ink-800/40 p-2.5">
                <p className="mb-1.5 text-[11px] font-medium text-fg-faint">
                  参考来源
                </p>
                <ul className="space-y-1">
                  {citations.map((citation) => (
                    <li key={citation.post_id}>
                      <a
                        href={citation.href}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="flex items-center justify-between gap-2 text-[11px] text-brand-300 transition-colors hover:text-brand-200 hover:underline"
                      >
                        <span className="truncate">{citation.title}</span>
                        <span className="shrink-0 font-mono text-fg-faint">
                          {Math.round(citation.similarity * 100)}%
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>

          <p className="mt-2 text-[11px] leading-relaxed text-fg-faint">
            回答基于站内文章生成，内容会发送给 AI 服务；引用来源可点击核对原文。
          </p>
        </div>
      )}
    </>
  );
}

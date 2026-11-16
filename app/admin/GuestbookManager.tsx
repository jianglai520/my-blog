"use client";

import { useState, useActionState } from "react";
import {
  deleteGuestbookMessage,
  replyGuestbookMessage,
  type GuestbookReplyState,
} from "@/app/actions/guestbook";
import { formatDateTime } from "@/lib/format";
import type { GuestbookMessage } from "@/db/schema";

const initialState: GuestbookReplyState = { message: "", success: false };

/** 单条留言的博主回复：默认收起，编辑时展开 */
function ReplyForm({ message }: { message: GuestbookMessage }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<GuestbookReplyState, FormData>(
    replyGuestbookMessage,
    initialState,
  );

  if (!editing) {
    return (
      <div className="mt-3">
        {message.reply ? (
          <div className="rounded-xl border border-brand-400/15 bg-brand-500/[0.06] px-4 py-3">
            <div className="mb-1 flex items-center justify-between gap-3">
              <span className="text-[11px] tracking-wide text-brand-300">
                博主回复
              </span>
              <div className="flex items-center gap-3">
                {message.replied_at && (
                  <span className="font-mono text-[10px] text-fg-faint">
                    {formatDateTime(message.replied_at)}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  aria-expanded={editing}
                  className="text-[11px] text-fg-faint transition-colors hover:text-brand-300"
                >
                  编辑
                </button>
              </div>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-fg-muted">
              {message.reply}
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-expanded={editing}
            className="text-xs text-fg-faint transition-colors hover:text-brand-300"
          >
            ↩ 回复这封来信
          </button>
        )}
      </div>
    );
  }

  return (
    <form
      action={action}
      className="mt-3 rounded-xl border border-ink-600/70 bg-ink-900/50 p-3"
    >
      <input type="hidden" name="messageId" value={message.id} />
      <label
        htmlFor={`reply-${message.id}`}
        className="mb-1.5 block text-[11px] text-fg-faint"
      >
        博主回复
        {message.reply && message.replied_at
          ? ` · 上次回复 ${formatDateTime(message.replied_at)}`
          : ""}
      </label>
      <textarea
        id={`reply-${message.id}`}
        name="reply"
        defaultValue={message.reply ?? ""}
        rows={3}
        maxLength={1000}
        autoFocus
        placeholder="写一封回信…"
        className="w-full resize-y rounded-lg border border-ink-600 bg-ink-800/70 px-3 py-2 text-sm leading-relaxed text-fg placeholder:text-fg-faint focus:border-brand-500/50 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
      />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-gradient-to-r from-brand-600 to-brand-500 px-3.5 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "保存中…" : message.reply ? "更新回复" : "发送回复"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-xs text-fg-faint transition-colors hover:text-fg"
        >
          取消
        </button>
        {message.reply && (
          <span className="text-[11px] text-fg-faint">
            清空内容后保存可删除回复
          </span>
        )}
        {state.message && (
          <span
            className={`text-xs ${state.success ? "text-emerald-400" : "text-red-400"}`}
          >
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}

/**
 * 后台留言管理：留言列表 + 博主回复 + 删除。
 */
export default function GuestbookManager({
  messages,
}: {
  messages: GuestbookMessage[];
}) {
  if (messages.length === 0) {
    return <p className="py-4 text-center text-fg-muted">还没有留言～</p>;
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className="rounded-lg border border-ink-700/60 bg-ink-800/40 p-4"
        >
          <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="font-medium text-fg">{message.name}</span>
            <span className="text-xs text-fg-faint">
              {formatDateTime(message.created_at)}
            </span>
          </div>
          <p className="whitespace-pre-wrap text-fg-muted">{message.content}</p>

          <ReplyForm message={message} />

          <div className="mt-3 border-t border-ink-700/40 pt-2.5">
            <form
              action={deleteGuestbookMessage}
              onSubmit={(e) => {
                if (!confirm("确定要删除这条留言吗？")) e.preventDefault();
              }}
            >
              <input type="hidden" name="messageId" value={message.id} />
              <button
                type="submit"
                className="text-[11px] text-fg-faint transition-colors hover:text-red-400"
              >
                删除留言
              </button>
            </form>
          </div>
        </div>
      ))}
    </div>
  );
}

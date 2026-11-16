"use client";

import { useActionState } from "react";
import {
  deleteGuestbookMessage,
  replyGuestbookMessage,
  type GuestbookReplyState,
} from "@/app/actions/guestbook";
import { formatDateTime } from "@/lib/format";
import type { GuestbookMessage } from "@/db/schema";

const initialState: GuestbookReplyState = { message: "", success: false };

/** 单条留言的博主回复表单：保存 / 更新 / 清空 */
function ReplyForm({ message }: { message: GuestbookMessage }) {
  const [state, action, pending] = useActionState<GuestbookReplyState, FormData>(
    replyGuestbookMessage,
    initialState,
  );

  return (
    <form action={action} className="mt-3 border-t border-ink-700/60 pt-3">
      <input type="hidden" name="messageId" value={message.id} />
      <label
        htmlFor={`reply-${message.id}`}
        className="mb-1 block text-xs text-fg-faint"
      >
        博主回复
        {message.reply && message.replied_at
          ? ` · 已回复于 ${formatDateTime(message.replied_at)}`
          : ""}
      </label>
      <textarea
        id={`reply-${message.id}`}
        name="reply"
        defaultValue={message.reply ?? ""}
        rows={2}
        maxLength={1000}
        placeholder="回复这封来信…（清空后保存可清除回复）"
        className="w-full resize-y rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg border border-brand-400/40 bg-brand-500/10 px-3 py-1 text-xs text-brand-300 transition-colors hover:bg-brand-500/20 disabled:opacity-50"
        >
          {pending ? "保存中…" : message.reply ? "更新回复" : "回复"}
        </button>
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

          <div className="mt-2">
            <form
              action={deleteGuestbookMessage}
              onSubmit={(e) => {
                if (!confirm("确定要删除这条留言吗？")) e.preventDefault();
              }}
            >
              <input type="hidden" name="messageId" value={message.id} />
              <button
                type="submit"
                className="rounded-lg border border-red-400/30 px-3 py-1 text-xs text-red-400 transition-colors hover:bg-red-400/10"
              >
                删除
              </button>
            </form>
          </div>
        </div>
      ))}
    </div>
  );
}

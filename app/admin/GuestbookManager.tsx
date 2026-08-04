"use client";

import { deleteGuestbookMessage } from "@/app/actions/guestbook";
import type { GuestbookMessage } from "@/db/schema";

/**
 * 后台留言管理：留言板留言列表 + 删除。
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
              {new Date(message.created_at).toLocaleString("zh-CN")}
            </span>
          </div>
          <p className="whitespace-pre-wrap text-fg-muted">{message.content}</p>
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

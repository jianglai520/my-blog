"use client";

import { deleteMessage } from "@/app/actions/messages";
import { formatDateTime } from "@/lib/format";
import type { Message } from "@/db/schema";

/**
 * 后台私信管理：站内私信列表（含联系方式，仅博主可见）+ 删除。
 */
export default function MessageManager({ messages }: { messages: Message[] }) {
  if (messages.length === 0) {
    return <p className="py-4 text-center text-fg-muted">还没有私信～</p>;
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
            {message.contact && (
              <span className="text-xs text-brand-300">📮 {message.contact}</span>
            )}
            <span className="text-xs text-fg-faint">
              {formatDateTime(message.created_at)}
            </span>
          </div>
          <p className="whitespace-pre-wrap text-fg-muted">{message.content}</p>
          <div className="mt-2">
            <form
              action={deleteMessage}
              onSubmit={(e) => {
                if (!confirm("确定要删除这条私信吗？")) e.preventDefault();
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

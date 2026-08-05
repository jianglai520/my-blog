import type { Metadata } from "next";
import Link from "next/link";
import { getGuestbookMessages } from "@/lib/guestbook";
import { formatDateTime } from "@/lib/format";
import GuestbookForm from "./GuestbookForm";

export const metadata: Metadata = { title: "留言板" };

export default async function GuestbookPage() {
  const messages = await getGuestbookMessages();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/" className="mb-6 inline-block text-sm text-fg-muted transition-colors hover:text-brand-300">
        ← 返回首页
      </Link>
      <h1 className="page-heading mb-2 text-3xl font-bold text-fg">💬 留言板</h1>
      <p className="mb-8 text-sm text-fg-faint">
        欢迎留下你想说的话——建议、问题或随便聊聊都行。
      </p>

      {/* 留言表单 */}
      <div className="rounded-2xl border border-ink-700/60 bg-ink-900/50 p-8">
        <GuestbookForm />
      </div>

      {/* 留言列表 */}
      <div className="mt-10">
        <h2 className="mb-6 text-xl font-bold text-fg">
          全部留言{" "}
          <span className="text-sm font-normal text-fg-faint">（{messages.length} 条）</span>
        </h2>

        {messages.length === 0 ? (
          <p className="rounded-2xl border border-ink-700/60 bg-ink-900/50 py-12 text-center text-fg-muted">
            还没有留言，来抢个沙发～
          </p>
        ) : (
          <ul className="space-y-4">
            {messages.map((message) => (
              <li
                key={message.id}
                className="flex gap-4 rounded-2xl border border-ink-700/60 bg-ink-900/50 p-5"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-glow-500 font-display text-lg font-bold text-white">
                  {message.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <span className="font-medium text-fg">{message.name}</span>
                    <span className="text-xs text-fg-faint">
                      {formatDateTime(message.created_at)}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-fg-muted">{message.content}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

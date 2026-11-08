import type { Metadata } from "next";
import Link from "next/link";
import { getGuestbookMessages } from "@/lib/guestbook";
import { formatDate } from "@/lib/format";
import GuestbookForm from "./GuestbookForm";

export const metadata: Metadata = { title: "留言" };

export default async function GuestbookPage() {
  const messages = await getGuestbookMessages();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link
        href="/"
        className="mb-8 inline-block text-sm text-fg-muted transition-colors hover:text-brand-400"
      >
        ← 返回首页
      </Link>

      <header className="mb-10">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-fg-faint">
          Guestbook
        </p>
        <h1 className="mb-3 font-serif text-4xl font-semibold tracking-tight text-fg">
          留言
        </h1>
        <p className="font-serif text-sm leading-relaxed text-fg-faint">
          写一封信，留在这里。
        </p>
      </header>

      {/* 写一封信 */}
      <section className="glass rounded-2xl px-6 py-7 sm:px-8">
        <h2 className="mb-1 font-serif text-xl font-semibold text-fg">写一封信</h2>
        <p className="mb-6 text-xs text-fg-faint">署名可选，留空则显示为匿名。</p>
        <GuestbookForm />
      </section>

      {/* 来信 */}
      <section className="mt-12">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="font-serif text-xl font-semibold text-fg">来信</h2>
          <span className="font-mono text-[11px] text-fg-faint">
            {messages.length} 封
          </span>
        </div>

        {messages.length === 0 ? (
          <div className="glass rounded-2xl py-16 text-center">
            <p className="font-serif text-lg text-fg-muted">还没有来信</p>
            <p className="mt-2 font-serif text-sm text-fg-faint">写下第一封吧。</p>
          </div>
        ) : (
          <div className="space-y-5">
            {messages.map((message) => (
              <article
                key={message.id}
                className="glass relative overflow-hidden rounded-2xl px-6 py-6 sm:px-8"
              >
                {/* 引号装饰 */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-4 top-2 select-none font-serif text-5xl leading-none text-brand-400/15"
                >
                  “
                </span>

                <p className="relative whitespace-pre-wrap pl-5 font-serif text-[15px] leading-[2] text-fg-muted">
                  {message.content}
                </p>

                {/* 署名 */}
                <div className="mt-5 flex items-center justify-end gap-2.5">
                  <span className="font-serif text-xs text-fg-faint">
                    — {message.name}
                  </span>
                  <span aria-hidden="true" className="h-3 w-px bg-ink-600" />
                  <span className="font-mono text-[10.5px] text-fg-faint">
                    {formatDate(message.created_at)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

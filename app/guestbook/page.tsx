import type { Metadata } from "next";
import Link from "next/link";
import { getGuestbookMessages } from "@/lib/guestbook";
import { getSiteSettings } from "@/lib/site";
import { formatDate } from "@/lib/format";
import GuestbookForm from "./GuestbookForm";
import Avatar from "@/app/components/Avatar";
import ReplyForm from "@/app/components/ReplyForm";

export const metadata: Metadata = { title: "留言" };

export default async function GuestbookPage() {
  const [messages, settings] = await Promise.all([
    getGuestbookMessages(),
    getSiteSettings(),
  ]);

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
                  <Avatar
                    name={message.name}
                    avatarUrl={message.avatar_data ?? ""}
                    size={26}
                  />
                  <span className="font-serif text-xs text-fg-faint">
                    — {message.name}
                  </span>
                  <span aria-hidden="true" className="h-3 w-px bg-ink-600" />
                  <span className="font-mono text-[10.5px] text-fg-faint">
                    {formatDate(message.created_at)}
                  </span>
                </div>

                {/* 博主回复：信件式回信（头像不加描边/对号） */}
                {message.reply && (
                  <div className="relative mt-6 pl-5">
                    <span
                      aria-hidden="true"
                      className="absolute bottom-1 left-0 top-1 w-px bg-gradient-to-b from-brand-400/70 via-brand-400/30 to-transparent"
                    />
                    <span
                      aria-hidden="true"
                      className="absolute left-[-2px] top-1.5 h-[5px] w-[5px] rounded-full bg-brand-400"
                    />
                    <div className="rounded-2xl bg-gradient-to-br from-brand-500/[0.08] via-brand-500/[0.03] to-transparent px-5 py-4 ring-1 ring-brand-400/10">
                      <div className="mb-2 flex items-center gap-2">
                        <Avatar
                          name={settings.author_name}
                          avatarUrl={settings.avatar_url}
                          size={22}
                        />
                        <span className="font-serif text-xs tracking-[0.08em] text-brand-300">
                          博主回信
                        </span>
                        {message.replied_at && (
                          <span className="ml-auto font-mono text-[10px] text-fg-faint">
                            {formatDate(message.replied_at)}
                          </span>
                        )}
                      </div>
                      <p className="whitespace-pre-wrap font-serif text-[14.5px] leading-[1.95] text-fg-muted">
                        {message.reply}
                      </p>
                      <p className="mt-2 text-right font-serif text-xs text-fg-faint">
                        — {settings.author_name}
                      </p>
                    </div>
                  </div>
                )}

                {/* 游客回复 */}
                {message.replies.length > 0 && (
                  <div className="mt-5 space-y-3 border-l-2 border-ink-600/60 pl-4">
                    {message.replies.map((reply) => (
                      <div key={reply.id} className="flex gap-3">
                        <Avatar
                          name={reply.name}
                          avatarUrl={reply.avatar_data ?? ""}
                          size={26}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 font-serif text-xs">
                            <span className="text-fg">{reply.name}</span>
                            <span className="text-fg-faint">
                              {formatDate(reply.created_at)}
                            </span>
                          </div>
                          <p className="mt-1 whitespace-pre-wrap font-serif text-[14px] leading-[1.9] text-fg-muted">
                            {reply.content}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <ReplyForm targetType="guestbook" targetId={message.id} />
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

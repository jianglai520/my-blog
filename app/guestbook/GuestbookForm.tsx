"use client";

import { useActionState } from "react";
import {
  createGuestbookMessage,
  type GuestbookFormState,
} from "@/app/actions/guestbook";

const initial: GuestbookFormState = { message: "", success: false };

const inputCls =
  "w-full rounded-lg border border-ink-600 bg-ink-800/60 px-4 py-3 text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-brand-500";

/** 留言板表单（信件风格：署名 + 内容，调用 Server Action，带 IP 限流） */
export default function GuestbookForm() {
  const [state, formAction, pending] = useActionState<GuestbookFormState, FormData>(
    createGuestbookMessage,
    initial
  );

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label
          htmlFor="gb-name"
          className="mb-2 block text-xs tracking-wide text-fg-faint"
        >
          署名 <span>（可选，留空为匿名）</span>
        </label>
        <input
          id="gb-name"
          name="name"
          type="text"
          maxLength={30}
          placeholder="匿名"
          className={`${inputCls} max-w-xs`}
        />
      </div>

      <div>
        <label
          htmlFor="gb-content"
          className="mb-2 block text-xs tracking-wide text-fg-faint"
        >
          留言内容
        </label>
        <textarea
          id="gb-content"
          name="content"
          rows={5}
          maxLength={1000}
          placeholder="写点什么吧…（留言会公开）"
          className={`${inputCls} resize-y font-serif text-[15px] leading-[1.9]`}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-gradient-to-r from-brand-600 to-brand-500 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:from-brand-500 hover:to-glow-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "寄出中…" : "✉️ 寄出"}
        </button>
        {state.message && (
          <span
            className={`text-sm ${
              state.success ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}

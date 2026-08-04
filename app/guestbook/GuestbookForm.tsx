"use client";

import { useActionState } from "react";
import {
  createGuestbookMessage,
  type GuestbookFormState,
} from "@/app/actions/guestbook";

const initial: GuestbookFormState = { message: "", success: false };

const inputCls =
  "w-full rounded-lg border border-ink-600 bg-ink-800 px-4 py-3 text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-brand-500";

/** 留言板表单（昵称 + 内容，调用 Server Action，带 IP 限流） */
export default function GuestbookForm() {
  const [state, formAction, pending] = useActionState<GuestbookFormState, FormData>(
    createGuestbookMessage,
    initial
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="gb-name" className="mb-2 block text-sm text-fg-muted">
          昵称 <span className="text-fg-faint">（可选，留空显示为「匿名」）</span>
        </label>
        <input
          id="gb-name"
          name="name"
          type="text"
          maxLength={30}
          placeholder="匿名"
          className={inputCls}
        />
      </div>
      <div>
        <label htmlFor="gb-content" className="mb-2 block text-sm text-fg-muted">
          留言内容
        </label>
        <textarea
          id="gb-content"
          name="content"
          rows={4}
          maxLength={1000}
          placeholder="说点什么吧…（悄悄话不行，会公开）"
          className={`${inputCls} resize-y`}
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-gradient-to-r from-brand-600 to-brand-500 px-6 py-3 font-medium text-white transition-colors hover:from-brand-500 hover:to-glow-400 disabled:cursor-not-allowed disabled:bg-ink-600 disabled:text-fg-faint"
        >
          {pending ? "提交中…" : "💬 发布留言"}
        </button>
        {state.message && (
          <span className={`text-sm ${state.success ? "text-emerald-400" : "text-red-400"}`}>
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}

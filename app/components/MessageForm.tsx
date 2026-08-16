"use client";

import { useActionState } from "react";
import { createMessage, type MessageFormState } from "@/app/actions/messages";

const initial: MessageFormState = { message: "", success: false };

const inputCls =
  "w-full rounded-lg border border-ink-600 bg-ink-800 px-4 py-3 text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-brand-500";

/** 站内私信表单（关于页底部；昵称/联系方式可选，内容 + 联系方式仅博主在后台可见） */
export default function MessageForm() {
  const [state, formAction, pending] = useActionState<MessageFormState, FormData>(
    createMessage,
    initial
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="msg-name" className="mb-2 block text-sm text-fg-muted">
            昵称 <span className="text-fg-faint">（可选）</span>
          </label>
          <input
            id="msg-name"
            name="name"
            type="text"
            maxLength={30}
            placeholder="怎么称呼你"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="msg-contact" className="mb-2 block text-sm text-fg-muted">
            联系方式 <span className="text-fg-faint">（可选，仅站长可见）</span>
          </label>
          <input
            id="msg-contact"
            name="contact"
            type="text"
            maxLength={100}
            placeholder="邮箱 / 微信 / 其他"
            className={inputCls}
          />
        </div>
      </div>
      <div>
        <label htmlFor="msg-content" className="mb-2 block text-sm text-fg-muted">
          私信内容
        </label>
        <textarea
          id="msg-content"
          name="content"
          rows={4}
          maxLength={2000}
          placeholder="想对我说的话…（仅站长可见，不会公开）"
          className={`${inputCls} resize-y`}
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-gradient-to-r from-brand-600 to-brand-500 px-6 py-3 font-medium text-white transition-colors hover:from-brand-500 hover:to-glow-400 disabled:cursor-not-allowed disabled:bg-ink-600 disabled:text-fg-faint"
        >
          {pending ? "发送中…" : "✉️ 发送私信"}
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

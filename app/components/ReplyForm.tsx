"use client";

import { useEffect, useRef } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import AvatarPicker from "@/app/components/AvatarPicker";
import { createReply, type ReplyFormState } from "@/app/actions/replies";

const initialState: ReplyFormState = { message: "", success: false };

const inputCls =
  "w-full rounded-lg border border-ink-600 bg-ink-800/60 px-3 py-2 text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-brand-500";

/** 游客回复表单：评论与留言共用。默认折叠，避免页面过长。 */
export default function ReplyForm({
  targetType,
  targetId,
  identifier = "",
}: {
  targetType: "comment" | "guestbook";
  targetId: number;
  identifier?: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<ReplyFormState, FormData>(
    createReply,
    initialState,
  );

  useEffect(() => {
    if (!state.success) return;

    formRef.current?.reset();
    // ISR 页面首次刷新可能仍返回旧 HTML（stale-while-revalidate），
    // 再补一次刷新，确保回复立即可见。
    router.refresh();
    const timer = setTimeout(() => router.refresh(), 800);
    return () => clearTimeout(timer);
  }, [state.success, router]);

  return (
    <details className="group mt-4">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-xs text-fg-faint transition-colors hover:text-brand-300">
        <span aria-hidden="true">↩</span>
        回复
      </summary>

      <form
        ref={formRef}
        action={formAction}
        className="mt-3 space-y-3 rounded-xl border border-ink-700/60 bg-ink-900/40 p-4"
      >
        <input type="hidden" name="targetType" value={targetType} />
        <input type="hidden" name="targetId" value={targetId} />
        {identifier && <input type="hidden" name="identifier" value={identifier} />}

        <div className="flex flex-wrap items-center gap-3">
          <AvatarPicker compact />
          <input
            name="name"
            type="text"
            maxLength={30}
            placeholder="昵称（可选，默认匿名）"
            className={`${inputCls} max-w-[220px]`}
          />
        </div>

        <textarea
          name="content"
          rows={2}
          maxLength={1000}
          required
          placeholder="写下你的回复…"
          className={`${inputCls} resize-y`}
        />

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-gradient-to-r from-brand-600 to-brand-500 px-4 py-2 text-xs font-medium text-white transition-colors hover:from-brand-500 hover:to-glow-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "发送中…" : "发送回复"}
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
    </details>
  );
}

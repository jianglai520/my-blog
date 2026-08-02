"use client";

import { useEffect, useRef } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { createComment, type CommentFormState } from "@/app/actions/comments";

const initialState: CommentFormState = { message: "", success: false };

export default function CommentForm({
  postId,
  identifier,
}: {
  postId: number;
  identifier: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  // createComment：服务端校验 + 写库，状态回填到表单
  const [state, formAction, pending] = useActionState<CommentFormState, FormData>(
    createComment,
    initialState
  );

  // 评论成功后：重置表单（DOM reset）并刷新文章页（动态渲染，刷新后拿到新评论）
  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="mt-8 rounded-2xl border border-ink-700/60 bg-ink-900/50 p-6"
    >
      <h3 className="mb-4 text-lg font-semibold text-fg">写评论</h3>

      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="identifier" value={identifier} />

      <div className="mb-4">
        <label htmlFor="comment-name" className="mb-1 block text-sm text-fg-muted">
          昵称
        </label>
        <input
          id="comment-name"
          name="name"
          type="text"
          defaultValue=""
          placeholder="你的昵称"
          className="w-full rounded-lg border border-ink-600 bg-ink-800 px-4 py-3 text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="comment-content" className="mb-1 block text-sm text-fg-muted">
          内容
        </label>
        <textarea
          id="comment-content"
          name="content"
          defaultValue=""
          placeholder="写下你的评论..."
          rows={4}
          className="w-full resize-y rounded-lg border border-ink-600 bg-ink-800 px-4 py-3 text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className={`rounded-lg px-6 py-3 font-medium text-white transition-colors ${
          pending
            ? "cursor-not-allowed bg-ink-600"
            : "bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-glow-400"
        }`}
      >
        {pending ? "提交中..." : "发布评论"}
      </button>

      {state.message && (
        <p
          className={`mt-4 text-sm ${
            state.success ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}

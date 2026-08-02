"use client";

import * as Sentry from "@sentry/nextjs";

/** 全局错误边界（必须包含 <html>/<body>，应用级兜底） */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  Sentry.captureException(error);

  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-[#07070f] text-[#e7e7f2] antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
          <p className="text-5xl">💥</p>
          <h1 className="mt-4 text-3xl font-bold">博客出错了</h1>
          <p className="mt-2 max-w-md text-[#9b9bb3]">
            发生了一个意外错误。如果持续出现，请联系站长。
          </p>
          <button
            onClick={() => reset()}
            className="mt-8 rounded-lg bg-[#7c3aed] px-6 py-2.5 font-medium text-white"
          >
            重试
          </button>
        </div>
      </body>
    </html>
  );
}

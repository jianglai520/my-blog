"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/** 路由级错误边界（客户端渲染错误兜底） */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-5xl">😵</p>
      <h1 className="mt-4 text-3xl font-bold text-fg">页面出错了</h1>
      <p className="mt-2 max-w-md text-fg-muted">
        加载时发生了一个错误。如果持续出现，请联系站长。
      </p>
      <button
        onClick={() => reset()}
        className="mt-8 rounded-lg bg-gradient-to-r from-brand-600 to-brand-500 px-6 py-2.5 font-medium text-white transition-colors hover:from-brand-500 hover:to-glow-400"
      >
        重试
      </button>
    </div>
  );
}

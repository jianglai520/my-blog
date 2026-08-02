import * as Sentry from "@sentry/nextjs";

/**
 * Sentry 客户端配置（浏览器端）。
 * DSN 来自 NEXT_PUBLIC_SENTRY_DSN，未配置时 init 空转不报错。
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
});

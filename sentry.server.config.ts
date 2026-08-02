import * as Sentry from "@sentry/nextjs";

/**
 * Sentry 服务端配置（Node runtime）。
 * DSN 来自 SENTRY_DSN（服务端专用），未配置时 init 空转不报错。
 */
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
});

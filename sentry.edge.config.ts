import * as Sentry from "@sentry/nextjs";

/** Sentry 边缘运行时配置（Edge Runtime，如 proxy） */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
});

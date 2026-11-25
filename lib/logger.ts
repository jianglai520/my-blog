/**
 * 轻量结构化日志：输出单行 JSON，方便 Vercel Runtime Logs 按字段检索。
 *
 * 约定：
 * - 只记录可公开的上下文（错误信息、路由、耗时），不要传密钥 / 完整 IP
 * - Error 实例会自动转成 { error: message }
 * - 客户端组件不要 import（浏览器 devtools 保持普通 console 即可）
 */

type LogLevel = "info" | "warn" | "error";
type LogContext = Record<string, unknown>;

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function normalizeContext(context?: unknown): LogContext {
  if (context === undefined) return {};
  if (context instanceof Error) return { error: context.message };
  if (context && typeof context === "object") return context as LogContext;
  return { detail: context };
}

function write(level: LogLevel, message: string, context?: unknown) {
  const entry = {
    level,
    time: new Date().toISOString(),
    msg: message,
    ...normalizeContext(context),
  };
  const line = JSON.stringify(entry);

  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (message: string, context?: unknown) => write("info", message, context),
  warn: (message: string, context?: unknown) => write("warn", message, context),
  error: (message: string, context?: unknown) => write("error", message, context),
};

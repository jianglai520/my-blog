import { NextRequest, NextResponse } from "next/server";
import { getPublicEnv } from "@/lib/env";
import { getClientIp, hashIp } from "@/lib/server/ip";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { logger } from "@/lib/logger";

/**
 * 附件下载代理：跨域 download 属性在浏览器无效，改为服务端 fetch 文件并设置
 * Content-Disposition: attachment，确保点击「下载」真正下载而非导航到文件页。
 *
 * 安全约束：
 * - 只允许「本站 Supabase 项目 + post-images 桶」的公开文件（防 SSRF）
 * - 必须解析 URL 后精确比较 hostname，不能用 includes / endsWith(".supabase.co")
 *   （`https://evil.supabase.co/...` 或 `https://evil.com/supabase.co/...` 必须被拒绝）
 * - 按 IP 限流，避免被当作免费代理刷流量
 * - 单文件上限 20MB，超限直接 413，不进入流式转发
 */

const MAX_DOWNLOAD_BYTES = 20 * 1024 * 1024;
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_SECONDS = 60;

function getStorageHost(): string | null {
  try {
    return new URL(getPublicEnv().supabaseUrl).hostname;
  } catch {
    return null;
  }
}

function isAllowedStorageUrl(raw: string, allowedHost: string | null): boolean {
  if (!allowedHost) return false;
  try {
    const url = new URL(raw);
    return (
      url.protocol === "https:" &&
      url.hostname === allowedHost &&
      url.pathname.startsWith("/storage/v1/object/public/post-images/")
    );
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  const filename = req.nextUrl.searchParams.get("filename") || "attachment";

  if (!url) {
    return NextResponse.json({ error: "缺少 url 参数" }, { status: 400 });
  }

  const allowed = await checkRateLimit(
    "download",
    hashIp(getClientIp(req.headers)),
    RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW_SECONDS,
  ).catch((error) => {
    // 限流表不可用时放行，避免误伤正常下载
    logger.error("下载限流检查失败:", error);
    return true;
  });
  if (!allowed) {
    return NextResponse.json({ error: "下载太频繁了，请稍后再试" }, { status: 429 });
  }

  if (!isAllowedStorageUrl(url, getStorageHost())) {
    return NextResponse.json({ error: "不允许的下载地址" }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  } catch {
    return NextResponse.json({ error: "文件获取失败" }, { status: 502 });
  }
  if (!upstream.ok) {
    return NextResponse.json({ error: "文件不存在" }, { status: upstream.status });
  }

  const declaredSize = Number(upstream.headers.get("Content-Length") ?? "0");
  if (declaredSize > MAX_DOWNLOAD_BYTES) {
    return NextResponse.json({ error: "文件过大，请直接到原文附件区下载" }, { status: 413 });
  }

  // 保留原始 Content-Type，强制附件下载
  const headers = new Headers();
  headers.set("Content-Type", upstream.headers.get("Content-Type") ?? "application/octet-stream");
  headers.set(
    "Content-Disposition",
    `attachment; filename*=UTF-8''${encodeURIComponent(filename).slice(0, 500)}`
  );
  headers.set("Cache-Control", "public, max-age=3600");
  headers.set("X-Content-Type-Options", "nosniff");

  return new Response(upstream.body, { status: 200, headers });
}

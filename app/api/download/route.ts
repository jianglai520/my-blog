import { NextRequest, NextResponse } from "next/server";

/**
 * 附件下载代理：跨域 download 属性在浏览器无效，改为服务端 fetch 文件并设置
 * Content-Disposition: attachment，确保点击「下载」真正下载而非导航到文件页。
 * 安全：只允许本站 Supabase Storage 的公开文件（防 SSRF）。
 * 注意：必须解析 URL 后校验 hostname，不能用 includes ——
 * `https://evil.com/supabase.co/storage/...` 也能通过字符串包含检查。
 */
function isAllowedStorageUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return (
      url.protocol === "https:" &&
      (url.hostname === "supabase.co" ||
        url.hostname.endsWith(".supabase.co")) &&
      url.pathname.startsWith("/storage/v1/object/public/")
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
  if (!isAllowedStorageUrl(url)) {
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

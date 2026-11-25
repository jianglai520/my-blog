import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { recordVisit } from "@/lib/visits";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/** 明显的爬虫/自动化 UA，不计入访客 */
const BOT_RE =
  /bot|crawler|spider|headless|preview|curl|wget|python-requests|axios|httpclient|scrapy|phantom|puppeteer|playwright/i;

/** 后台与接口页面不统计 */
const SKIP_PREFIXES = ["/admin", "/login", "/api", "/_next"];

/**
 * 访客打点（匿名）。
 * - 只存 sha256(IP | UA | salt)，不落原始 IP/UA
 * - 同一访客每天只记一次（数据库唯一约束）
 * - 已登录用户（站长）不计入
 * - 任何异常都返回 204，避免影响页面
 */
export async function POST(req: NextRequest) {
  try {
    const ua = req.headers.get("user-agent") ?? "";
    if (!ua || BOT_RE.test(ua)) {
      return new NextResponse(null, { status: 204 });
    }

    // 站长登录态（Supabase auth cookie，含分片）不计入
    const isLoggedIn = req.cookies
      .getAll()
      .some((cookie) => /^sb-.*-auth-token(\.\d+)?$/.test(cookie.name));
    if (isLoggedIn) {
      return new NextResponse(null, { status: 204 });
    }

    let path = "/";
    try {
      const body = (await req.json()) as { path?: unknown };
      if (typeof body.path === "string" && body.path.startsWith("/")) {
        path = body.path.slice(0, 200);
      }
    } catch {
      // 没带 JSON 也按首页计
    }
    if (SKIP_PREFIXES.some((prefix) => path.startsWith(prefix))) {
      return new NextResponse(null, { status: 204 });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const salt = process.env.VISIT_HASH_SALT || "jianglai520-visit-salt";
    const visitorHash = createHash("sha256")
      .update(`${ip}|${ua}|${salt}`)
      .digest("hex");

    await recordVisit(visitorHash, path);
  } catch (error) {
    logger.error("访客打点失败:", error);
  }

  return new NextResponse(null, { status: 204 });
}

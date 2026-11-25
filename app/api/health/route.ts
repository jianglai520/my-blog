import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { errorMessage, logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 健康检查：给 uptime 监控 / 部署验证用。
 * - 200：应用与数据库都正常
 * - 503：数据库不可用
 * 不返回任何配置或密钥信息。
 */
export async function GET() {
  const startedAt = Date.now();

  try {
    await db.execute(sql`select 1`);
    return NextResponse.json(
      { ok: true, db: "up", latencyMs: Date.now() - startedAt },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logger.error("health check failed", {
      db: "down",
      latencyMs: Date.now() - startedAt,
      error: errorMessage(error),
    });
    return NextResponse.json(
      { ok: false, db: "down" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

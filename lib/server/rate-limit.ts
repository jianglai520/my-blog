import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { rateLimitEvents } from "@/db/schema";

/**
 * 数据库限流（serverless 多实例安全）。
 * 在窗口内先计数，未超限才写入一条事件。
 *
 * 注意：计数与写入不是原子操作，高并发下可能多放行少量请求；
 * 对博客的防刷场景足够，严格限流应使用 Redis 的原子脚本。
 */
export async function checkRateLimit(
  bucket: string,
  identifier: string,
  max: number,
  windowSeconds: number,
): Promise<boolean> {
  const countRows = await db
    .select({ n: sql<number>`count(*)` })
    .from(rateLimitEvents)
    .where(
      and(
        eq(rateLimitEvents.bucket, bucket),
        eq(rateLimitEvents.identifier, identifier),
        sql`${rateLimitEvents.created_at} >= now() - (${windowSeconds} * interval '1 second')`,
      ),
    );

  const used = Number(countRows[0]?.n ?? 0);
  if (used >= max) return false;

  await db.insert(rateLimitEvents).values({ bucket, identifier });

  // 低成本清理：约 1% 的请求顺手删除一天前的旧事件，避免表无限增长
  if (Math.random() < 0.01) {
    try {
      await db
        .delete(rateLimitEvents)
        .where(sql`${rateLimitEvents.created_at} < now() - interval '1 day'`);
    } catch {
      // 清理失败不影响本次限流
    }
  }

  return true;
}

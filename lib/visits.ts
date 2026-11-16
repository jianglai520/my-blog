import "server-only";
import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { siteVisits } from "@/db/schema";

/** 全站访客统计（UV 去重，PV 不在此表统计） */
export type VisitStats = {
  /** 建站以来累计独立访客 */
  totalUv: number;
  /** 今日独立访客（Asia/Shanghai） */
  todayUv: number;
};

const readVisitStats = unstable_cache(
  async (): Promise<VisitStats> => {
    const result = await db.execute(sql`
      select
        (select count(distinct visitor_hash) from ${siteVisits}) as total_uv,
        (
          select count(distinct visitor_hash)
          from ${siteVisits}
          where visit_date = (now() at time zone 'Asia/Shanghai')::date
        ) as today_uv
    `);
    const row = result.rows?.[0] as
      | { total_uv?: string | number; today_uv?: string | number }
      | undefined;
    return {
      totalUv: Number(row?.total_uv ?? 0),
      todayUv: Number(row?.today_uv ?? 0),
    };
  },
  ["visit-stats"],
  { revalidate: 60, tags: ["visits"] },
);

/**
 * 读取访客统计（60 秒缓存）。
 * 表尚未迁移时返回 0，不影响页面渲染。
 */
export async function getVisitStats(): Promise<VisitStats> {
  try {
    return await readVisitStats();
  } catch (error) {
    console.error("读取访客统计失败（是否已执行 0016 迁移？）:", error);
    return { totalUv: 0, todayUv: 0 };
  }
}

/**
 * 记录一次访问。
 * 同一天同一 visitor_hash 由唯一约束去重；跨天各记一次，
 * 因此累计 UV 用 count(distinct visitor_hash) 仍然准确。
 */
export async function recordVisit(visitorHash: string, path: string): Promise<void> {
  await db
    .insert(siteVisits)
    .values({ visitor_hash: visitorHash, path })
    .onConflictDoNothing();
}

import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export type StorageUsage = {
  /** 文件数 */
  files: number;
  /** 总字节数 */
  bytes: number;
};

/**
 * post-images 桶的用量（后台展示）。
 * 直接读 storage.objects 元数据，不请求 Storage API。
 */
export async function getStorageUsage(): Promise<StorageUsage> {
  try {
    const result = await db.execute(sql`
      select
        count(*)::int as files,
        coalesce(sum((metadata->>'size')::bigint), 0)::bigint as bytes
      from storage.objects
      where bucket_id = 'post-images'
    `);
    const row = result.rows?.[0] as
      | { files?: number | string; bytes?: number | string }
      | undefined;
    return {
      files: Number(row?.files ?? 0),
      bytes: Number(row?.bytes ?? 0),
    };
  } catch (error) {
    logger.error("读取存储用量失败:", error);
    return { files: 0, bytes: 0 };
  }
}

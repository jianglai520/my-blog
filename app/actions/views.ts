"use server";

import { headers } from "next/headers";
import { getServerSupabase } from "@/lib/server/supabase";
import { getClientIp, hashIp } from "@/lib/server/ip";
import { logger } from "@/lib/logger";

/**
 * 浏览量 +1（匿名访客可调用）。
 * 调用 RPC `record_post_view`（security definer）：
 * - 同一访客（IP 哈希）同一篇文章每天只计一次
 * - 只有首次插入 post_views 时才给 posts.view_count +1
 * - 不保存明文 IP
 */
export async function incrementView(postId: number): Promise<number | null> {
  if (!Number.isFinite(postId) || postId <= 0) return null;

  const visitorHash = hashIp(getClientIp(await headers()));
  const supabase = await getServerSupabase();
  const { data, error } = await supabase.rpc("record_post_view", {
    p_post_id: postId,
    p_visitor_hash: visitorHash,
  });

  if (error) {
    logger.error("浏览量更新失败:", error.message);
    return null;
  }
  const count = Number(data);
  return Number.isFinite(count) ? count : null;
}

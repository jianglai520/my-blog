"use server";

import { getServerSupabase } from "@/lib/server/supabase";

/**
 * 浏览量 +1（匿名访客可调用）。
 * 调用 RPC `increment_view`（security definer，固定 +1，只作用于已发布文章）；
 * 防刷由客户端 ViewCounter 用 cookie 控制（同一文章每天只计一次）。
 */
export async function incrementView(postId: number): Promise<number | null> {
  if (!Number.isFinite(postId) || postId <= 0) return null;

  const supabase = await getServerSupabase();
  const { data, error } = await supabase.rpc("increment_view", { post_id: postId });

  if (error) {
    console.error("浏览量更新失败:", error.message);
    return null;
  }
  return typeof data === "number" ? data : null;
}

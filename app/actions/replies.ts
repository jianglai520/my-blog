"use server";

import { headers } from "next/headers";
import { revalidatePath, updateTag } from "next/cache";
import { getServerSupabase } from "@/lib/server/supabase";
import { getClientIp, hashIp } from "@/lib/server/ip";
import { replySchema } from "@/lib/validations/replies";
import { logger } from "@/lib/logger";

export type ReplyFormState = {
  message: string;
  success: boolean;
};

const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60_000;

/**
 * 游客回复评论 / 留言。
 * - 按 IP 哈希限流（3 次/分）
 * - 与博主回复分开存 `replies` 表，前端不会显示成「博主回复」
 * - 头像随回复以 data URL 存 DB，不开放匿名 Storage 写
 */
export async function createReply(
  _prev: ReplyFormState,
  formData: FormData,
): Promise<ReplyFormState> {
  const ipHash = hashIp(getClientIp(await headers()));
  const supabase = await getServerSupabase();

  const { count, error: countError } = await supabase
    .from("replies")
    .select("id", { count: "exact", head: true })
    .eq("ip", ipHash)
    .gte("created_at", new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString());

  if (!countError && (count ?? 0) >= RATE_LIMIT_MAX) {
    return { message: "❌ 回复太频繁了，请稍后再试", success: false };
  }

  const parsed = replySchema.safeParse({
    targetType: String(formData.get("targetType") || ""),
    targetId: formData.get("targetId"),
    identifier: String(formData.get("identifier") || ""),
    name: String(formData.get("name") || ""),
    avatarData: String(formData.get("avatarData") || ""),
    content: String(formData.get("content") || ""),
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { message: `❌ ${first?.message || "输入不合法"}`, success: false };
  }

  const { targetType, targetId, identifier, name, avatarData, content } = parsed.data;

  const { error } = await supabase.from("replies").insert({
    target_type: targetType,
    target_id: targetId,
    name,
    avatar_data: avatarData || null,
    content,
    ip: ipHash,
  });

  if (error) {
    logger.error("发表回复失败:", error);
    return { message: "❌ 回复失败，请稍后重试", success: false };
  }

  if (targetType === "comment") {
    if (identifier) revalidatePath(`/posts/${identifier}`);
    revalidatePath("/");
    updateTag("comments");
  } else {
    revalidatePath("/guestbook");
  }

  return { message: "✅ 回复成功", success: true };
}

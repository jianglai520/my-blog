"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getServerSupabase, requireAdmin } from "@/lib/server/supabase";
import { getClientIp, hashIp } from "@/lib/server/ip";
import { guestbookSchema } from "@/lib/validations/guestbook";

export type GuestbookFormState = {
  message: string;
  success: boolean;
};

/** 限流：同一 IP 在窗口内的最大留言数 */
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60_000;

/**
 * 发表留言：限流 → zod 校验 → 写库 → 刷新留言板。
 * 匿名可发（与评论一致），仅博主可在后台删除。
 */
export async function createGuestbookMessage(
  _prev: GuestbookFormState,
  formData: FormData
): Promise<GuestbookFormState> {
  // ① 按 IP 哈希限流（防脚本刷留言；不保存明文 IP）
  const ipHash = hashIp(getClientIp(await headers()));
  const supabase = await getServerSupabase();
  const { count, error: countError } = await supabase
    .from("guestbook_messages")
    .select("id", { count: "exact", head: true })
    .eq("ip", ipHash)
    .gte("created_at", new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString());

  if (!countError && (count ?? 0) >= RATE_LIMIT_MAX) {
    return { message: "❌ 留言太频繁了，请稍后再试", success: false };
  }

  // ② zod 校验
  const parsed = guestbookSchema.safeParse({
    name: String(formData.get("name") || ""),
    content: String(formData.get("content") || ""),
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { message: `❌ ${first?.message || "输入不合法"}`, success: false };
  }

  // ③ 写库
  const { error } = await supabase.from("guestbook_messages").insert({
    name: parsed.data.name,
    content: parsed.data.content,
    ip: ipHash,
  });

  if (error) {
    console.error("发表留言失败:", error);
    return { message: "❌ 留言失败，请稍后重试", success: false };
  }

  revalidatePath("/guestbook");
  return { message: "✅ 留言成功！", success: true };
}

export type GuestbookReplyState = {
  message: string;
  success: boolean;
};

/**
 * 博主回复留言。
 * reply 为空字符串时表示清除回复（reply/replied_at 置空）。
 */
export async function replyGuestbookMessage(
  _prev: GuestbookReplyState,
  formData: FormData,
): Promise<GuestbookReplyState> {
  try {
    await requireAdmin();
  } catch {
    return { message: "❌ 无权限执行此操作", success: false };
  }

  const messageId = Number(formData.get("messageId"));
  if (!Number.isFinite(messageId) || messageId <= 0) {
    return { message: "❌ 留言 ID 不合法", success: false };
  }

  const replyText = String(formData.get("reply") ?? "").trim();
  if (replyText.length > 1000) {
    return { message: "❌ 回复最长 1000 字", success: false };
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("guestbook_messages")
    .update({
      reply: replyText || null,
      replied_at: replyText ? new Date().toISOString() : null,
    })
    .eq("id", messageId);

  if (error) {
    console.error("回复留言失败:", error);
    return { message: "❌ 保存失败，请稍后重试", success: false };
  }

  revalidatePath("/guestbook");
  revalidatePath("/admin");
  return {
    message: replyText ? "✅ 回复已保存" : "✅ 回复已清除",
    success: true,
  };
}

/** 删除留言（仅博主）：表单 action，成功后刷新缓存 */
export async function deleteGuestbookMessage(formData: FormData): Promise<void> {
  const messageId = Number(formData.get("messageId"));
  if (!Number.isFinite(messageId) || messageId <= 0) return;

  try {
    await requireAdmin();
  } catch {
    return; // 非博主：静默拒绝
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase.from("guestbook_messages").delete().eq("id", messageId);
  if (error) {
    console.error("删除留言失败:", error);
    return;
  }

  revalidatePath("/guestbook");
  revalidatePath("/admin");
}

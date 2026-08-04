"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getServerSupabase, requireAdmin } from "@/lib/server/supabase";
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
  // ① 按 IP 限流（防脚本刷留言）
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const supabase = await getServerSupabase();
  const { count, error: countError } = await supabase
    .from("guestbook_messages")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
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
    ip,
  });

  if (error) {
    console.error("发表留言失败:", error);
    return { message: "❌ 留言失败，请稍后重试", success: false };
  }

  revalidatePath("/guestbook");
  return { message: "✅ 留言成功！", success: true };
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

"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getServerSupabase, requireAdmin } from "@/lib/server/supabase";
import { messageSchema } from "@/lib/validations/message";

export type MessageFormState = {
  message: string;
  success: boolean;
};

/** 限流：同一 IP 在窗口内的最大私信数（私信更敏感，限得更严） */
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60_000;

/**
 * 发送站内私信：限流 → zod 校验 → 写库。
 * 匿名可发（与留言板一致），内容 + 可选联系方式仅博主在后台可见。
 */
export async function createMessage(
  _prev: MessageFormState,
  formData: FormData
): Promise<MessageFormState> {
  // ① 按 IP 限流（防脚本刷私信）
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const supabase = await getServerSupabase();
  const { count, error: countError } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("created_at", new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString());

  if (!countError && (count ?? 0) >= RATE_LIMIT_MAX) {
    return { message: "❌ 发送太频繁了，请稍后再试", success: false };
  }

  // ② zod 校验
  const parsed = messageSchema.safeParse({
    name: String(formData.get("name") || ""),
    contact: String(formData.get("contact") || ""),
    content: String(formData.get("content") || ""),
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { message: `❌ ${first?.message || "输入不合法"}`, success: false };
  }

  // ③ 写库
  const { error } = await supabase.from("messages").insert({
    name: parsed.data.name,
    contact: parsed.data.contact || null,
    content: parsed.data.content,
    ip,
  });

  if (error) {
    console.error("发送私信失败:", error);
    return { message: "❌ 发送失败，请稍后重试", success: false };
  }

  revalidatePath("/about");
  revalidatePath("/admin");
  return { message: "✅ 私信已发送！", success: true };
}

/** 删除私信（仅博主）：表单 action，成功后刷新缓存 */
export async function deleteMessage(formData: FormData): Promise<void> {
  const messageId = Number(formData.get("messageId"));
  if (!Number.isFinite(messageId) || messageId <= 0) return;

  try {
    await requireAdmin();
  } catch {
    return; // 非博主：静默拒绝
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase.from("messages").delete().eq("id", messageId);
  if (error) {
    console.error("删除私信失败:", error);
    return;
  }

  revalidatePath("/about");
  revalidatePath("/admin");
}

"use server";

import { headers } from "next/headers";
import { revalidatePath, updateTag } from "next/cache";
import { getServerSupabase, requireAdmin } from "@/lib/server/supabase";
import { getClientIp, hashIp } from "@/lib/server/ip";
import { commentSchema } from "@/lib/validations/comments";
import { logger } from "@/lib/logger";

export type CommentFormState = {
  message: string;
  success: boolean;
};

/** 限流：同一 IP 在窗口内的最大评论数 */
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60_000;

/**
 * 发表评论：限流 → zod 校验 → 写库 → 刷新文章页。
 * 直接显示模式：插入 status 默认 approved（DB 默认值），评论即时公开。
 */
export async function createComment(
  _prev: CommentFormState,
  formData: FormData
): Promise<CommentFormState> {
  // ① 按 IP 哈希限流（防脚本刷评论；不保存明文 IP）
  const ipHash = hashIp(getClientIp(await headers()));
  const supabase = await getServerSupabase();
  const { count, error: countError } = await supabase
    .from("comments")
    .select("id", { count: "exact", head: true })
    .eq("ip", ipHash)
    .gte("created_at", new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString());

  if (!countError && (count ?? 0) >= RATE_LIMIT_MAX) {
    return { message: "❌ 评论太频繁了，请稍后再试", success: false };
  }

  const parsed = commentSchema.safeParse({
    postId: formData.get("postId"),
    identifier: String(formData.get("identifier") || ""),
    name: String(formData.get("name") || ""),
    content: String(formData.get("content") || ""),
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { message: `❌ ${first?.message || "输入不合法"}`, success: false };
  }

  const { postId, identifier, name, content } = parsed.data;
  const { error } = await supabase.from("comments").insert({
    post_id: postId,
    name,
    content,
    ip: ipHash,
  });

  if (error) {
    logger.error("发表评论失败:", error);
    return { message: "❌ 评论失败，请稍后重试", success: false };
  }

  // 文章页是动态渲染，revalidate 保证下次请求拿到新评论
  revalidatePath(`/posts/${identifier}`);
  revalidatePath("/");
  // 失效首页统计行缓存（getSiteStats 挂了 "comments" tag）
  updateTag("comments");
  return { message: "✅ 评论成功！", success: true };
}

/** 删除评论（仅博主）：表单 action，成功后刷新缓存 */
export async function deleteComment(formData: FormData): Promise<void> {
  const commentId = Number(formData.get("commentId"));
  if (!Number.isFinite(commentId) || commentId <= 0) return;

  try {
    await requireAdmin();
  } catch {
    return; // 非博主：静默拒绝
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase.from("comments").delete().eq("id", commentId);
  if (error) {
    logger.error("删除评论失败:", error);
    return;
  }

  revalidatePath("/");
  revalidatePath("/admin");
  updateTag("comments");
}

/** 批量删除评论（仅博主） */
export async function batchDeleteComments(ids: number[]): Promise<void> {
  if (!ids.length) return;

  try {
    await requireAdmin();
  } catch {
    return; // 非博主：静默拒绝
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase.from("comments").delete().in("id", ids);
  if (error) {
    logger.error("批量删除评论失败:", error);
    return;
  }

  revalidatePath("/");
  revalidatePath("/admin");
  updateTag("comments");
}

export type CommentReplyState = {
  message: string;
  success: boolean;
};

/**
 * 博主回复评论。
 * reply 为空字符串时表示清除回复（reply/replied_at 置空）。
 */
export async function replyComment(
  _prev: CommentReplyState,
  formData: FormData,
): Promise<CommentReplyState> {
  try {
    await requireAdmin();
  } catch {
    return { message: "❌ 无权限执行此操作", success: false };
  }

  const commentId = Number(formData.get("commentId"));
  if (!Number.isFinite(commentId) || commentId <= 0) {
    return { message: "❌ 评论 ID 不合法", success: false };
  }

  const replyText = String(formData.get("reply") ?? "").trim();
  if (replyText.length > 1000) {
    return { message: "❌ 回复最长 1000 字", success: false };
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("comments")
    .update({
      reply: replyText || null,
      replied_at: replyText ? new Date().toISOString() : null,
    })
    .eq("id", commentId);

  if (error) {
    logger.error("回复评论失败:", error);
    return { message: "❌ 保存失败，请稍后重试", success: false };
  }

  revalidatePath("/");
  revalidatePath("/admin");
  updateTag("comments");
  return {
    message: replyText ? "✅ 回复已保存" : "✅ 回复已清除",
    success: true,
  };
}

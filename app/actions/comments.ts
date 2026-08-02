"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase, requireAdmin } from "@/lib/server/supabase";
import { commentSchema } from "@/lib/validations/comments";

export type CommentFormState = {
  message: string;
  success: boolean;
};

/**
 * 发表评论：zod 校验 → 写库 → 刷新文章页。
 * 直接显示模式：插入 status 默认 approved（DB 默认值），评论即时公开。
 */
export async function createComment(
  _prev: CommentFormState,
  formData: FormData
): Promise<CommentFormState> {
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
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("comments").insert({
    post_id: postId,
    name,
    content,
  });

  if (error) {
    console.error("发表评论失败:", error);
    return { message: "❌ 评论失败，请稍后重试", success: false };
  }

  // 文章页是动态渲染，revalidate 保证下次请求拿到新评论
  revalidatePath(`/posts/${identifier}`);
  revalidatePath("/");
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
    console.error("删除评论失败:", error);
    return;
  }

  revalidatePath("/");
  revalidatePath("/admin");
}

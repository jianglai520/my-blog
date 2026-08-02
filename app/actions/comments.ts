"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServerSupabase } from "@/lib/server/supabase";

export type CommentFormState = {
  message: string;
  success: boolean;
};

/** 评论表单校验：昵称与内容必填，内容限长 */
const createCommentSchema = z.object({
  postId: z.coerce.number().int().positive("文章 ID 不合法"),
  identifier: z.string().trim().min(1),
  name: z.string().trim().min(1, "昵称不能为空").max(30, "昵称最长 30 字"),
  content: z.string().trim().min(1, "评论内容不能为空").max(1000, "评论最长 1000 字"),
});

/**
 * 发表评论：zod 校验 → 写库 → 刷新文章页。
 * 允许匿名提交（与现状一致）；垃圾评论防护放到后续 Phase。
 */
export async function createComment(
  _prev: CommentFormState,
  formData: FormData
): Promise<CommentFormState> {
  const parsed = createCommentSchema.safeParse({
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

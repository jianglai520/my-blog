"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServerSupabase, requireAdmin } from "@/lib/server/supabase";

export type PostFormState = {
  message: string;
  success: boolean;
};

/** 发布文章表单校验（与 AdminClient 共用规则） */
const createPostSchema = z.object({
  title: z.string().trim().min(1, "标题不能为空").max(120),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/i, "slug 只能包含字母、数字和连字符")
    .max(100)
    .optional()
    .or(z.literal("")),
  excerpt: z.string().trim().max(200, "摘要最长 200 字").optional().or(z.literal("")),
  coverImage: z.string().trim().url("封面图需为合法 URL").optional().or(z.literal("")),
  content: z.string().trim().min(1, "内容不能为空"),
});

/** 发布文章：zod 校验 → 博主鉴权 → 写库 → 刷新缓存 */
export async function createPost(
  _prev: PostFormState,
  formData: FormData
): Promise<PostFormState> {
  const parsed = createPostSchema.safeParse({
    title: String(formData.get("title") || ""),
    slug: String(formData.get("slug") || ""),
    excerpt: String(formData.get("excerpt") || ""),
    coverImage: String(formData.get("coverImage") || ""),
    content: String(formData.get("content") || ""),
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { message: `❌ ${first?.message || "输入不合法"}`, success: false };
  }

  let admin;
  try {
    admin = await requireAdmin();
  } catch (e) {
    return {
      message: `❌ ${e instanceof Error ? e.message : "无权限执行此操作"}`,
      success: false,
    };
  }

  const { title, slug, excerpt, coverImage, content } = parsed.data;
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("posts").insert({
    title,
    slug: slug || null,
    excerpt: excerpt || null,
    cover_image: coverImage || null,
    content,
    published: true,
    author_id: admin.id,
  });

  if (error) {
    return { message: `❌ 发布失败：${error.message}`, success: false };
  }

  revalidatePath("/");
  revalidatePath("/admin");
  return { message: "✅ 发布成功！", success: true };
}

/** 删除文章：博主鉴权 → 删除 → 刷新缓存 */
export async function deletePost(formData: FormData): Promise<void> {
  const postId = Number(formData.get("postId"));
  if (!Number.isFinite(postId) || postId <= 0) return;

  try {
    await requireAdmin();
  } catch {
    return; // 非博主：静默拒绝
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) {
    console.error("删除文章失败:", error);
    return;
  }

  revalidatePath("/admin");
  revalidatePath("/");
}

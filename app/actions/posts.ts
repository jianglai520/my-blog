"use server";

import { revalidatePath, updateTag } from "next/cache";
import { getServerSupabase, requireAdmin } from "@/lib/server/supabase";
import { postSchema, type PostFormInput } from "@/lib/validations/posts";
import { slugify } from "@/lib/format";

export type PostFormState = {
  message: string;
  success: boolean;
};

/** 解析表单并统一校验（返回错误消息或解析后的数据） */
function parseForm(formData: FormData):
  | { ok: true; data: PostFormInput }
  | { ok: false; message: string } {
  const parsed = postSchema.safeParse({
    title: String(formData.get("title") || ""),
    slug: String(formData.get("slug") || ""),
    excerpt: String(formData.get("excerpt") || ""),
    coverImage: String(formData.get("coverImage") || ""),
    content: String(formData.get("content") || ""),
    status: String(formData.get("status") || "published"),
    tags: String(formData.get("tags") || ""),
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, message: `❌ ${first?.message || "输入不合法"}` };
  }
  return { ok: true, data: parsed.data };
}

/**
 * slug 唯一化：若候选 slug 已被其他文章占用，自动追加 -2、-3… 后缀。
 * 避免自动生成的 slug（slugify 基于标题）与已有文章冲突报 23505。
 * 返回最终唯一 slug；excludeId 用于编辑时排除自身。
 */
async function ensureUniqueSlug(
  supabase: Awaited<ReturnType<typeof getServerSupabase>>,
  slug: string,
  excludeId?: number,
): Promise<string> {
  let candidate = slug;
  let i = 2;
  for (;;) {
    const { data } = await supabase
      .from("posts")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    const taken = data && data.id !== excludeId;
    if (!taken) return candidate;
    candidate = `${slug}-${i++}`;
  }
}

/**
 * 同步文章的标签关联（tags + post_tags）。
 * 输入逗号分隔的标签名（自动去重）；不存在则创建（slug 冲突自动加后缀）；
 * 先清空旧关联再插入新关联。
 */
async function syncPostTags(
  supabase: Awaited<ReturnType<typeof getServerSupabase>>,
  postId: number,
  tagsInput: string,
): Promise<void> {
  const names = [...new Set(tagsInput.split(/[,，]/).map((t) => t.trim()).filter(Boolean))];

  if (names.length === 0) {
    await supabase.from("post_tags").delete().eq("post_id", postId);
    return;
  }

  // 生成唯一 slug（避免不同名称 slugify 后撞车）
  const slugs = names.map((n) => slugify(n)).filter(Boolean);
  const { data: existing } = await supabase.from("tags").select("slug").in("slug", slugs);
  const taken = new Set((existing ?? []).map((t: { slug: string }) => t.slug));
  const rows = names.map((name) => {
    const base = slugify(name);
    let s = base;
    let i = 2;
    while (taken.has(s)) s = `${base}-${i++}`;
    taken.add(s);
    return { name, slug: s };
  });

  // 只插入新标签（name 已存在的忽略，保留原 slug）
  await supabase.from("tags").upsert(rows, { onConflict: "name", ignoreDuplicates: true });

  // 取所有相关 tag id 后重建关联
  const { data: tagRows } = await supabase.from("tags").select("id").in("name", names);
  if (!tagRows?.length) return;

  await supabase.from("post_tags").delete().eq("post_id", postId);
  const { error } = await supabase
    .from("post_tags")
    .insert(tagRows.map((t: { id: number }) => ({ post_id: postId, tag_id: t.id })));
  if (error) console.error("同步标签失败:", error.message);
}

/** 发布新文章：zod 校验 → 博主鉴权 → 写库 → 刷新缓存 */
export async function createPost(
  _prev: PostFormState,
  formData: FormData
): Promise<PostFormState> {
  const parsed = parseForm(formData);
  if (!parsed.ok) return { message: parsed.message, success: false };

  let admin;
  try {
    admin = await requireAdmin();
  } catch (e) {
    return {
      message: `❌ ${e instanceof Error ? e.message : "无权限执行此操作"}`,
      success: false,
    };
  }

  const { title, slug, excerpt, coverImage, content, status, tags } = parsed.data;
  const supabase = await getServerSupabase();
  const finalSlug = slug ? await ensureUniqueSlug(supabase, slug) : null;
  const { data: created, error } = await supabase
    .from("posts")
    .insert({
      title,
      slug: finalSlug,
      excerpt: excerpt || null,
      cover_image: coverImage || null,
      content,
      status,
      published: status === "published",
      author_id: admin.id,
    })
    .select("id")
    .single();

  if (error) {
    return { message: `❌ 发布失败：${error.message}`, success: false };
  }

  await syncPostTags(supabase, created.id, tags ?? "");

  revalidatePath("/");
  revalidatePath("/archives");
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin");
  updateTag("posts");
  return {
    message: status === "published" ? "✅ 发布成功！" : "✅ 草稿已保存！",
    success: true,
  };
}

/** 编辑已有文章（含草稿续写 / 发布）：校验 → 博主鉴权 → 更新 → 刷新缓存 */
export async function updatePost(
  _prev: PostFormState,
  formData: FormData
): Promise<PostFormState> {
  const postId = Number(formData.get("postId"));
  if (!Number.isFinite(postId) || postId <= 0) {
    return { message: "❌ 文章 ID 不合法", success: false };
  }

  const parsed = parseForm(formData);
  if (!parsed.ok) return { message: parsed.message, success: false };

  try {
    await requireAdmin();
  } catch (e) {
    return {
      message: `❌ ${e instanceof Error ? e.message : "无权限执行此操作"}`,
      success: false,
    };
  }

  const { title, slug, excerpt, coverImage, content, status, tags } = parsed.data;
  const supabase = await getServerSupabase();
  const finalSlug = slug ? await ensureUniqueSlug(supabase, slug, postId) : null;
  const { data: updated, error } = await supabase
    .from("posts")
    .update({
      title,
      slug: finalSlug,
      excerpt: excerpt || null,
      cover_image: coverImage || null,
      content,
      status,
      published: status === "published",
    })
    .eq("id", postId)
    .select("slug,status")
    .maybeSingle();

  if (error) {
    return { message: `❌ 保存失败：${error.message}`, success: false };
  }

  await syncPostTags(supabase, postId, tags ?? "");

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/archives");
  revalidatePath("/sitemap.xml");
  updateTag("posts");
  if (updated?.slug) revalidatePath(`/posts/${updated.slug}`);
  return {
    message: status === "published" ? "✅ 已发布！" : "✅ 草稿已更新！",
    success: true,
  };
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
  // 先删该文章下的评论（数据库外键已配置级联删除，此处为应用层兜底保险）
  await supabase.from("comments").delete().eq("post_id", postId);
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) {
    console.error("删除文章失败:", error);
    return;
  }

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/archives");
  revalidatePath("/sitemap.xml");
  updateTag("posts");
}

"use server";

import { randomUUID } from "node:crypto";
import { getServerSupabase, requireAdmin } from "@/lib/server/supabase";

export type UploadState = {
  url: string | null;
  message: string;
  success: boolean;
};

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

/** 扩展名映射（按 MIME 推断，避免信任用户文件名） */
const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

/**
 * 通用上传：博主鉴权 → 文件校验 → 上传到 post-images bucket 指定目录 → 返回公开 URL。
 * bucket RLS 仅博主可写（`post_images_admin_insert`），浏览器端不接触任何存储密钥。
 */
async function uploadToStorage(
  file: File,
  folder: string,
  maxSize: number,
): Promise<UploadState> {
  try {
    await requireAdmin();
  } catch (e) {
    return {
      url: null,
      message: `❌ ${e instanceof Error ? e.message : "无权限执行此操作"}`,
      success: false,
    };
  }

  // 不依赖 instanceof（跨 realm 可能失效），用鸭子类型判断 File
  if (
    !file ||
    typeof file === "string" ||
    typeof file.arrayBuffer !== "function" ||
    file.size === 0
  ) {
    return { url: null, message: "❌ 请选择要上传的图片", success: false };
  }
  if (!IMAGE_TYPES.has(file.type)) {
    return { url: null, message: "❌ 仅支持 PNG / JPG / WebP / GIF", success: false };
  }
  if (file.size > maxSize) {
    const mb = Math.round(maxSize / 1024 / 1024);
    return { url: null, message: `❌ 图片不能超过 ${mb}MB`, success: false };
  }

  const ext = EXT_BY_MIME[file.type];
  const path = `${folder}/${randomUUID()}.${ext}`;

  const supabase = await getServerSupabase();
  const buffer = await file.arrayBuffer();
  const { error } = await supabase.storage
    .from("post-images")
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (error) {
    console.error("图片上传失败:", error);
    return { url: null, message: "❌ 上传失败，请稍后重试", success: false };
  }

  const { data } = supabase.storage.from("post-images").getPublicUrl(path);
  return { url: data.publicUrl, message: "✅ 上传成功", success: true };
}

/** 上传文章图片（编辑器用，≤5MB） */
export async function uploadImage(
  _prev: UploadState,
  formData: FormData
): Promise<UploadState> {
  const file = formData.get("file");
  if (!(file instanceof File) && typeof file !== "object") {
    return { url: null, message: "❌ 请选择要上传的图片", success: false };
  }
  const date = new Date().toISOString().slice(0, 10); // yyyy-mm-dd
  return uploadToStorage(file as File, `posts/${date}`, 5 * 1024 * 1024);
}

/** 上传头像（后台站点设置用，≤5MB，PNG/JPG/WebP） */
export async function uploadAvatar(
  _prev: UploadState,
  formData: FormData
): Promise<UploadState> {
  const file = formData.get("file");
  if (!(file instanceof File) && typeof file !== "object") {
    return { url: null, message: "❌ 请选择要上传的图片", success: false };
  }
  return uploadToStorage(file as File, "avatars", 5 * 1024 * 1024);
}

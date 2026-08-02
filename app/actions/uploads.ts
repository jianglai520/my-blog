"use server";

import { randomUUID } from "node:crypto";
import { getServerSupabase, requireAdmin } from "@/lib/server/supabase";

export type UploadState = {
  url: string | null;
  message: string;
  success: boolean;
};

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

/** 扩展名映射（按 MIME 推断，避免信任用户文件名） */
const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

/**
 * 上传文章图片到 Supabase Storage（post-images bucket，公开读）。
 * 博主鉴权 + bucket RLS 双保险；浏览器端不接触任何存储密钥。
 */
export async function uploadImage(
  _prev: UploadState,
  formData: FormData
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

  const file = formData.get("file");
  // 不依赖 instanceof（跨 realm 可能失效），用鸭子类型判断 File
  if (
    !file ||
    typeof file === "string" ||
    typeof (file as File).arrayBuffer !== "function" ||
    (file as File).size === 0
  ) {
    return { url: null, message: "❌ 请选择要上传的图片", success: false };
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { url: null, message: "❌ 仅支持 PNG / JPG / WebP / GIF", success: false };
  }
  if (file.size > MAX_SIZE) {
    return { url: null, message: "❌ 图片不能超过 5MB", success: false };
  }

  const ext = EXT_BY_MIME[file.type];
  const date = new Date().toISOString().slice(0, 10); // yyyy-mm-dd
  const path = `posts/${date}/${randomUUID()}.${ext}`;

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

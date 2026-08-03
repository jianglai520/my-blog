"use server";

import { randomUUID } from "node:crypto";
import { getServerSupabase, requireAdmin } from "@/lib/server/supabase";

export type UploadState = {
  url: string | null;
  message: string;
  success: boolean;
};

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

/** 附件类型：文档/表格/压缩包/纯文本 */
const ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "text/plain",
  "text/markdown",
]);

/** 扩展名映射（按 MIME 推断，避免信任用户文件名） */
const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/zip": "zip",
  "text/plain": "txt",
  "text/markdown": "md",
};

/**
 * 通用上传：博主鉴权 → 文件校验 → 上传到 post-images bucket 指定目录 → 返回公开 URL。
 * bucket RLS 仅博主可写（`post_images_admin_insert`），浏览器端不接触任何存储密钥。
 */
async function uploadToStorage(
  file: File,
  folder: string,
  maxSize: number,
  allowedTypes: Set<string>,
  label: string,
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
    return { url: null, message: `❌ 请选择要上传的${label}`, success: false };
  }
  if (!allowedTypes.has(file.type)) {
    return { url: null, message: `❌ 不支持该文件类型`, success: false };
  }
  if (file.size > maxSize) {
    const mb = Math.round(maxSize / 1024 / 1024);
    return { url: null, message: `❌ ${label}不能超过 ${mb}MB`, success: false };
  }

  const ext = EXT_BY_MIME[file.type] ?? "bin";
  const path = `${folder}/${randomUUID()}.${ext}`;

  // text/markdown 非标准 MIME，浏览器不认识会导致乱码/无法下载 → 统一用 text/plain; charset=utf-8
  const contentType =
    file.type === "text/markdown" || file.type === "text/plain"
      ? "text/plain; charset=utf-8"
      : file.type;

  const supabase = await getServerSupabase();
  const buffer = await file.arrayBuffer();
  const { error } = await supabase.storage
    .from("post-images")
    .upload(path, buffer, { contentType, upsert: false });

  if (error) {
    console.error("文件上传失败:", error);
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
  if (!file || typeof file === "string" || typeof (file as File).arrayBuffer !== "function") {
    return { url: null, message: "❌ 请选择要上传的图片", success: false };
  }
  const date = new Date().toISOString().slice(0, 10); // yyyy-mm-dd
  return uploadToStorage(file as File, `posts/${date}`, 5 * 1024 * 1024, IMAGE_TYPES, "图片");
}

/** 上传头像（后台站点设置用，≤5MB，PNG/JPG/WebP） */
export async function uploadAvatar(
  _prev: UploadState,
  formData: FormData
): Promise<UploadState> {
  const file = formData.get("file");
  if (!file || typeof file === "string" || typeof (file as File).arrayBuffer !== "function") {
    return { url: null, message: "❌ 请选择要上传的图片", success: false };
  }
  return uploadToStorage(file as File, "avatars", 5 * 1024 * 1024, IMAGE_TYPES, "图片");
}

/** 上传附件（编辑器用，PDF/Word/Excel/压缩包等，≤20MB） */
export async function uploadAttachment(
  _prev: UploadState,
  formData: FormData
): Promise<UploadState> {
  const file = formData.get("file");
  if (!file || typeof file === "string" || typeof (file as File).arrayBuffer !== "function") {
    return { url: null, message: "❌ 请选择要上传的文档", success: false };
  }
  return uploadToStorage(file as File, "attachments", 20 * 1024 * 1024, ATTACHMENT_TYPES, "文档");
}

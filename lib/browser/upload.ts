"use client";

import { getBrowserSupabase } from "./supabase";

export type UploadResult = {
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
 * 浏览器直传 Supabase Storage（不走 Server Action 中转，上传更快）。
 * 依赖 RLS 策略 `post_images_admin_insert`（仅博主可插入）保证安全：
 * 未登录/非博主调用 storage.upload 会被 RLS 拒绝。
 */
async function uploadToStorage(
  file: File,
  folder: string,
  maxSize: number,
  allowedTypes: Set<string>,
  label: string,
): Promise<UploadResult> {
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
  // 浏览器原生 Web Crypto API（node:crypto 在客户端不可用）
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;

  // text/markdown 非标准 MIME，浏览器不认识会导致乱码/无法下载 → 统一用 text/plain; charset=utf-8
  const contentType =
    file.type === "text/markdown" || file.type === "text/plain"
      ? "text/plain; charset=utf-8"
      : file.type;

  const supabase = getBrowserSupabase();
  const { error } = await supabase.storage
    .from("post-images")
    .upload(path, file, { contentType, upsert: false });

  if (error) {
    console.error("文件上传失败:", error);
    // RLS 拒绝时给出明确提示（未登录/非博主）
    if (error.message?.includes("row-level security") || error.status === 403) {
      return { url: null, message: "❌ 无上传权限（仅博主可上传）", success: false };
    }
    return { url: null, message: "❌ 上传失败，请稍后重试", success: false };
  }

  const { data } = supabase.storage.from("post-images").getPublicUrl(path);
  return { url: data.publicUrl, message: "✅ 上传成功", success: true };
}

/** 上传图片（封面图 / 正文插图用，≤5MB） */
export async function uploadImageToStorage(file: File, folder: string): Promise<UploadResult> {
  return uploadToStorage(file, folder, 5 * 1024 * 1024, IMAGE_TYPES, "图片");
}

/** 上传附件（PDF/Word/Excel/压缩包等，≤20MB） */
export async function uploadAttachmentToStorage(
  file: File,
  folder: string,
): Promise<UploadResult> {
  return uploadToStorage(file, folder, 20 * 1024 * 1024, ATTACHMENT_TYPES, "文档");
}

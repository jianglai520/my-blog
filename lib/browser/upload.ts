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
 * 上传前压缩图片。
 * - 手机原图常见 3–8MB，直接进 Storage 会让文章页/首页加载很慢
 * - 最长边压到 1600px，转 WebP（保留透明度），质量 0.82
 * - GIF 跳过（保留动图）；压缩后反而更大时保留原文件
 * - 失败时静默回退原文件，不阻断上传
 */
async function compressImage(file: File): Promise<File> {
  if (file.type === "image/gif") return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.82)
    );
    if (!blob || blob.size >= file.size) return file;

    const base = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${base}.webp`, { type: "image/webp" });
  } catch (error) {
    console.warn("图片压缩失败，使用原文件:", error);
    return file;
  }
}

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

  // 上传前确认登录态：会话失效时直接给出明确提示，
  // 避免底层只抛出难懂的 “StorageUnknownError: Failed to fetch”。
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return {
      url: null,
      message: "❌ 登录状态已失效，请退出后重新登录，再上传",
      success: false,
    };
  }

  const { error } = await supabase.storage
    .from("post-images")
    .upload(path, file, { contentType, upsert: false });

  if (error) {
    console.error("文件上传失败:", error);
    const msg = (error.message || "").toLowerCase();
    // RLS 拒绝（未登录/非博主）
    if (msg.includes("row-level security") || error.status === 403) {
      return { url: null, message: "❌ 无上传权限（仅博主可上传）", success: false };
    }
    // 会话/JWT 失效
    if (
      msg.includes("jwt") ||
      msg.includes("refresh") ||
      msg.includes("session") ||
      error.status === 401
    ) {
      return {
        url: null,
        message: "❌ 登录状态已失效，请退出后重新登录，再上传",
        success: false,
      };
    }
    // 网络/代理层失败
    if (
      error.name === "StorageUnknownError" ||
      msg.includes("failed to fetch") ||
      msg.includes("network") ||
      msg.includes("load failed")
    ) {
      return {
        url: null,
        message: "❌ 网络连接失败（可能是网络/代理问题），请检查网络后重试",
        success: false,
      };
    }
    return {
      url: null,
      message: `❌ 上传失败：${error.message || "请稍后重试"}`,
      success: false,
    };
  }

  const { data } = supabase.storage.from("post-images").getPublicUrl(path);
  return { url: data.publicUrl, message: "✅ 上传成功", success: true };
}

/** 上传图片（封面图 / 正文插图用，≤5MB；上传前自动压缩） */
export async function uploadImageToStorage(file: File, folder: string): Promise<UploadResult> {
  const optimized = await compressImage(file);
  return uploadToStorage(optimized, folder, 5 * 1024 * 1024, IMAGE_TYPES, "图片");
}

/** 上传附件（PDF/Word/Excel/压缩包等，≤20MB） */
export async function uploadAttachmentToStorage(
  file: File,
  folder: string,
): Promise<UploadResult> {
  return uploadToStorage(file, folder, 20 * 1024 * 1024, ATTACHMENT_TYPES, "文档");
}

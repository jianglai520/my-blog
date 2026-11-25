"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";

/**
 * 访客头像选择器。
 * - 浏览器端裁成正方形并压到 96×96 WebP，作为 data URL 提交
 * - 不入 Storage（避免匿名写权限与孤儿文件），随评论/回复一起存 DB
 * - 不上传时，展示端用昵称首字 + 渐变兜底
 */

const MAX_INPUT_BYTES = 10 * 1024 * 1024;

async function buildAvatarData(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("当前浏览器不支持头像处理");
  }

  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, 96, 96);
  bitmap.close();
  return canvas.toDataURL("image/webp", 0.8);
}

export default function AvatarPicker({
  name = "avatarData",
  label = "头像（可选）",
  compact = false,
}: {
  name?: string;
  label?: string;
  compact?: boolean;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // 表单成功提交后父组件会 form.reset()，这里同步清空预览
  useEffect(() => {
    const form = hiddenRef.current?.form;
    if (!form) return;

    const handleReset = () => {
      setValue("");
      setError("");
      if (fileRef.current) fileRef.current.value = "";
    };
    form.addEventListener("reset", handleReset);
    return () => form.removeEventListener("reset", handleReset);
  }, []);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError("");

    if (!file.type.startsWith("image/")) {
      setError("请选择图片文件");
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      setError("原图不能超过 10MB");
      return;
    }

    setPending(true);
    try {
      setValue(await buildAvatarData(file));
    } catch {
      setError("头像处理失败，换一张试试");
    } finally {
      setPending(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className={compact ? "" : "space-y-1.5"}>
      {label && (
        <span className={compact ? "sr-only" : "block text-sm text-fg-muted"}>
          {label}
        </span>
      )}

      <div className="flex flex-wrap items-center gap-2.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-ink-600 bg-ink-800/60">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus size={15} className="text-fg-faint" />
          )}
        </span>

        <input ref={hiddenRef} type="hidden" name={name} value={value} />

        <button
          type="button"
          disabled={pending}
          onClick={() => fileRef.current?.click()}
          className="rounded-lg border border-ink-600 px-3 py-1.5 text-xs text-fg-muted transition-colors hover:border-brand-500/50 hover:text-fg disabled:opacity-50"
        >
          {pending ? "处理中…" : value ? "更换头像" : "上传头像"}
        </button>

        {value && (
          <button
            type="button"
            onClick={() => {
              setValue("");
              setError("");
            }}
            className="inline-flex items-center gap-1 text-xs text-fg-faint transition-colors hover:text-red-400"
          >
            <X size={12} />
            移除
          </button>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

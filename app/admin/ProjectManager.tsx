"use client";

import { useRef, useState } from "react";
import { useActionState } from "react";
import { Loader2, ImagePlus } from "lucide-react";
import { updateProjects, type ProjectsState } from "@/app/actions/projects";
import { parseProjects, serializeProjects, type ProjectItem } from "@/lib/projects";
import { uploadImageToStorage } from "@/lib/browser/upload";
import { inputCls } from "./shared";

const initial: ProjectsState = { message: "", success: false };

/**
 * 项目管理：项目卡片动态编辑（名称/年份/描述/技术栈/链接/GitHub/封面），独立保存。
 * 封面支持「粘贴 URL」或「本地上传」（浏览器直传 Supabase Storage）。
 */
export default function ProjectManager({ initialData }: { initialData: string }) {
  const [rows, setRows] = useState<ProjectItem[]>(() => parseProjects(initialData));
  const [state, formAction, pending] = useActionState<ProjectsState, FormData>(
    updateProjects,
    initial
  );

  // 封面本地上传：隐藏 file input + 浏览器直传 Supabase Storage
  const coverRef = useRef<HTMLInputElement>(null);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [coverMsg, setCoverMsg] = useState<{ idx: number; text: string; ok: boolean } | null>(
    null
  );

  function update(idx: number, field: keyof ProjectItem, value: string) {
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }
  function remove(idx: number) {
    setRows((rs) => rs.filter((_, i) => i !== idx));
  }
  function add() {
    setRows((rs) => [
      ...rs,
      { name: "", year: "", description: "", tech: "", link: "", github: "", cover: "" },
    ]);
  }

  function openCoverPicker(idx: number) {
    setUploadingIdx(idx);
    coverRef.current?.click();
  }

  // 选择本地封面图后直传，成功后把公开 URL 写入对应项目的 cover 字段
  async function handleCoverFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || uploadingIdx === null) return;
    const idx = uploadingIdx;
    setCoverMsg({ idx, text: "", ok: false });
    try {
      const date = new Date().toISOString().slice(0, 10); // yyyy-mm-dd
      const res = await uploadImageToStorage(file, `projects/${date}`);
      if (res.success && res.url) {
        update(idx, "cover", res.url);
      }
      setCoverMsg({ idx, text: res.message, ok: res.success });
    } catch (err) {
      console.error("项目封面上传异常:", err);
      setCoverMsg({
        idx,
        text: `❌ 上传失败：${err instanceof Error ? err.message : "未知错误"}`,
        ok: false,
      });
    } finally {
      setUploadingIdx(null);
      e.target.value = "";
    }
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="projects" value={serializeProjects(rows)} />
      {/* 隐藏的封面文件输入（多个项目共用一个） */}
      <input
        ref={coverRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleCoverFile}
      />

      {rows.length === 0 && (
        <p className="py-4 text-center text-sm text-fg-muted">
          还没有项目，点下方「添加项目」开始。
        </p>
      )}

      <div className="space-y-4">
        {rows.map((project, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-ink-700/60 bg-ink-800/40 p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-fg-muted">项目 #{idx + 1}</span>
              <button
                type="button"
                onClick={() => remove(idx)}
                aria-label={`删除项目 ${project.name || idx + 1}`}
                className="rounded-lg border border-red-400/30 px-2.5 py-1 text-sm text-red-400 transition-colors hover:bg-red-400/10"
              >
                ✕ 删除
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={project.name}
                onChange={(e) => update(idx, "name", e.target.value)}
                placeholder="项目名称（如：我的博客）"
                className={`${inputCls} px-3 py-2`}
              />
              <input
                value={project.year}
                onChange={(e) => update(idx, "year", e.target.value)}
                placeholder="年份（如 2026）"
                className={`${inputCls} px-3 py-2`}
              />
              <input
                value={project.tech}
                onChange={(e) => update(idx, "tech", e.target.value)}
                placeholder="技术栈（逗号分隔，如 Next.js, TypeScript）"
                className={`${inputCls} px-3 py-2 sm:col-span-2`}
              />
              <input
                value={project.link}
                onChange={(e) => update(idx, "link", e.target.value)}
                placeholder="项目链接（可选，如 https://jianglai520.com）"
                className={`${inputCls} px-3 py-2`}
              />
              <input
                value={project.github}
                onChange={(e) => update(idx, "github", e.target.value)}
                placeholder="GitHub 仓库（可选）"
                className={`${inputCls} px-3 py-2`}
              />
              {/* 封面：URL 输入 + 本地上传按钮 */}
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-fg-muted">封面图（可选，URL 或本地上传）</label>
                <div className="flex gap-2">
                  <input
                    value={project.cover}
                    onChange={(e) => update(idx, "cover", e.target.value)}
                    placeholder="粘贴图片 URL，或点右侧「本地上传」"
                    className={`${inputCls} px-3 py-2`}
                  />
                  <button
                    type="button"
                    disabled={uploadingIdx === idx}
                    onClick={() => openCoverPicker(idx)}
                    className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-ink-600 px-4 py-2 text-sm font-medium text-fg-muted transition-colors hover:border-brand-500/50 hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {uploadingIdx === idx ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <ImagePlus size={15} />
                    )}
                    {uploadingIdx === idx ? "上传中…" : "本地上传"}
                  </button>
                </div>
                {coverMsg?.idx === idx && (
                  <p className={`mt-1 text-xs ${coverMsg.ok ? "text-emerald-400" : "text-red-400"}`}>
                    {coverMsg.text}
                  </p>
                )}
              </div>
              <textarea
                value={project.description}
                onChange={(e) => update(idx, "description", e.target.value)}
                placeholder="项目简介"
                rows={2}
                className={`${inputCls} resize-y px-3 py-2 sm:col-span-2`}
              />
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={add}
        className="rounded-lg border border-brand-400/30 px-4 py-2 text-sm text-brand-300 transition-colors hover:bg-brand-400/10"
      >
        ➕ 添加项目
      </button>
      <p className="text-xs text-fg-faint">
        封面图可本地上传（≤5MB）或粘贴 URL（supabase.co / unsplash / jsdelivr）；链接以 https:// 开头。
      </p>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-gradient-to-r from-brand-600 to-brand-500 px-6 py-3 font-medium text-white transition-colors hover:from-brand-500 hover:to-glow-400 disabled:cursor-not-allowed disabled:bg-ink-600 disabled:text-fg-faint"
        >
          {pending ? "保存中..." : "💾 保存项目"}
        </button>
        {state.message && (
          <span className={`text-sm ${state.success ? "text-emerald-400" : "text-red-400"}`}>
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}

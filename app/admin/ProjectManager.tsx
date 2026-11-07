"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { Loader2, ImagePlus } from "lucide-react";
import { saveProject, deleteProject, type ProjectState } from "@/app/actions/projects";
import { parseProjects, type ProjectItem } from "@/lib/projects";
import { uploadImageToStorage } from "@/lib/browser/upload";
import { inputCls } from "./shared";

const initial: ProjectState = { message: "", success: false };

const emptyProject: ProjectItem = {
  name: "",
  year: "",
  description: "",
  tech: "",
  link: "",
  github: "",
  cover: "",
  coverPosition: "",
};

/** 解析 object-position 字符串（如 "50% 30%"）为数字；非法/缺省返回 50% 50% */
function parsePos(s?: string): { x: number; y: number } {
  const m = (s ?? "").match(/(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%/);
  return m ? { x: Number(m[1]), y: Number(m[2]) } : { x: 50, y: 50 };
}

type Row = {
  key: string;
  originalName: string; // 空 = 新增
  data: ProjectItem;
};

/**
 * 项目管理：每个项目独立卡片、独立保存/删除（互不影响）。
 */
export default function ProjectManager({ initialData }: { initialData: string }) {
  const [rows, setRows] = useState<Row[]>(() =>
    parseProjects(initialData).map((p, i) => ({
      key: `existing-${i}-${p.name}`,
      originalName: p.name,
      data: p,
    }))
  );

  function addRow() {
    setRows((rs) => [
      ...rs,
      { key: `new-${Date.now()}`, originalName: "", data: { ...emptyProject } },
    ]);
  }

  function removeRow(key: string) {
    setRows((rs) => rs.filter((r) => r.key !== key));
  }

  return (
    <div className="space-y-4">
      {rows.length === 0 && (
        <p className="py-4 text-center text-sm text-fg-muted">
          还没有项目，点下方「添加项目」开始。
        </p>
      )}

      {rows.map((row, idx) => (
        <ProjectRow key={row.key} row={row} index={idx} onDeleted={() => removeRow(row.key)} />
      ))}

      <button
        type="button"
        onClick={addRow}
        className="rounded-lg border border-brand-400/30 px-4 py-2 text-sm text-brand-300 transition-colors hover:bg-brand-400/10"
      >
        ➕ 添加项目
      </button>

      <p className="text-xs text-fg-faint">
        每个项目独立保存；封面可本地上传（≤5MB）或粘贴 URL；链接以 https:// 开头。
      </p>
    </div>
  );
}

/** 单个项目卡片：自己的表单、保存状态、删除动作、封面上传 */
function ProjectRow({
  row,
  index,
  onDeleted,
}: {
  row: Row;
  index: number;
  onDeleted: () => void;
}) {
  const [data, setData] = useState<ProjectItem>(row.data);
  const [originalName, setOriginalName] = useState(row.originalName);

  const [state, saveAction, pending] = useActionState<ProjectState, FormData>(
    saveProject,
    initial
  );
  const [delState, delAction, delPending] = useActionState<ProjectState, FormData>(
    deleteProject,
    initial
  );

  // 封面本地上传（每行独立）
  const coverRef = useRef<HTMLInputElement>(null);
  const [coverPending, setCoverPending] = useState(false);
  const [coverMsg, setCoverMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // 保存成功后，把定位键更新为新名称（支持改名后继续保存）
  const prevSuccess = useRef(false);
  useEffect(() => {
    if (state.success && !prevSuccess.current) {
      setOriginalName(data.name);
    }
    prevSuccess.current = state.success;
  }, [state.success, data.name]);

  // 删除成功后，从父列表移除（只执行一次）
  const deletedRef = useRef(false);
  useEffect(() => {
    if (delState.success && !deletedRef.current) {
      deletedRef.current = true;
      onDeleted();
    }
  }, [delState.success, onDeleted]);

  function update<K extends keyof ProjectItem>(field: K, value: string) {
    setData((d) => ({ ...d, [field]: value }));
  }

  async function handleCoverFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverPending(true);
    setCoverMsg(null);
    try {
      const date = new Date().toISOString().slice(0, 10);
      const res = await uploadImageToStorage(file, `projects/${date}`);
      if (res.success && res.url) {
        update("cover", res.url);
      }
      setCoverMsg({ text: res.message, ok: res.success });
    } catch (err) {
      console.error("项目封面上传异常:", err);
      setCoverMsg({
        text: `❌ 上传失败：${err instanceof Error ? err.message : "未知错误"}`,
        ok: false,
      });
    } finally {
      setCoverPending(false);
      e.target.value = "";
    }
  }

  const pos = parsePos(data.coverPosition);

  return (
    <div className="rounded-xl border border-ink-700/60 bg-ink-800/40 p-4">
      {/* 头部：序号 + 删除 */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-fg-muted">
          项目 #{index + 1}
          {!originalName && <span className="ml-2 text-xs text-brand-400">（未保存）</span>}
        </span>

        {originalName ? (
          <form
            action={delAction}
            onSubmit={(e) => {
              if (!confirm(`确定删除项目「${originalName}」？`)) e.preventDefault();
            }}
          >
            <input type="hidden" name="name" value={originalName} />
            <button
              type="submit"
              disabled={delPending}
              className="rounded-lg border border-red-400/30 px-2.5 py-1 text-sm text-red-400 transition-colors hover:bg-red-400/10 disabled:opacity-40"
            >
              {delPending ? "删除中…" : "✕ 删除"}
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={onDeleted}
            className="rounded-lg border border-ink-600 px-2.5 py-1 text-sm text-fg-muted transition-colors hover:border-red-400/30 hover:text-red-400"
          >
            ✕ 移除
          </button>
        )}
      </div>

      {/* 保存表单 */}
      <form action={saveAction} className="space-y-3">
        <input type="hidden" name="originalName" value={originalName} />
        <input type="hidden" name="project" value={JSON.stringify(data)} />

        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={data.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="项目名称（如：我的博客）"
            className={`${inputCls} px-3 py-2`}
          />
          <input
            value={data.year}
            onChange={(e) => update("year", e.target.value)}
            placeholder="年份（如 2026）"
            className={`${inputCls} px-3 py-2`}
          />
          <input
            value={data.tech}
            onChange={(e) => update("tech", e.target.value)}
            placeholder="技术栈（逗号分隔，如 Next.js, TypeScript）"
            className={`${inputCls} px-3 py-2 sm:col-span-2`}
          />
          <input
            value={data.link}
            onChange={(e) => update("link", e.target.value)}
            placeholder="项目链接（可选，如 https://jianglai520.com）"
            className={`${inputCls} px-3 py-2`}
          />
          <input
            value={data.github}
            onChange={(e) => update("github", e.target.value)}
            placeholder="GitHub 仓库（可选）"
            className={`${inputCls} px-3 py-2`}
          />

          {/* 封面 */}
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-fg-muted">
              封面图（可选，URL 或本地上传）
            </label>
            <div className="flex gap-2">
              <input
                value={data.cover}
                onChange={(e) => update("cover", e.target.value)}
                placeholder="粘贴图片 URL，或点右侧「本地上传」"
                className={`${inputCls} px-3 py-2`}
              />
              <input
                ref={coverRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={handleCoverFile}
              />
              <button
                type="button"
                disabled={coverPending}
                onClick={() => coverRef.current?.click()}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-ink-600 px-4 py-2 text-sm font-medium text-fg-muted transition-colors hover:border-brand-500/50 hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
              >
                {coverPending ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <ImagePlus size={15} />
                )}
                {coverPending ? "上传中…" : "本地上传"}
              </button>
            </div>

            {coverMsg && (
              <p className={`mt-1 text-xs ${coverMsg.ok ? "text-emerald-400" : "text-red-400"}`}>
                {coverMsg.text}
              </p>
            )}

            {/* 发布后卡片封面效果预览（16:9 裁剪，滑块调整显示区域） */}
            {data.cover && (
              <div className="mt-2">
                <p className="mb-1 text-xs text-fg-faint">
                  发布后卡片封面效果（16:9 裁剪，滑块调整显示区域）
                </p>
                <div className="aspect-[16/9] w-full max-w-sm overflow-hidden rounded-lg border border-ink-600">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={data.cover}
                    alt={`${data.name || "项目"} 封面预览`}
                    style={{ objectPosition: data.coverPosition || "50% 50%" }}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
                <div className="mt-2 grid max-w-sm gap-3 sm:grid-cols-2">
                  <label className="block text-xs text-fg-muted">
                    水平位置 {pos.x}%
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={pos.x}
                      onChange={(e) => update("coverPosition", `${e.target.value}% ${pos.y}%`)}
                      className="mt-1 w-full accent-brand-500"
                    />
                  </label>
                  <label className="block text-xs text-fg-muted">
                    垂直位置 {pos.y}%
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={pos.y}
                      onChange={(e) => update("coverPosition", `${pos.x}% ${e.target.value}%`)}
                      className="mt-1 w-full accent-brand-500"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          <textarea
            value={data.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="项目简介"
            rows={2}
            className={`${inputCls} resize-y px-3 py-2 sm:col-span-2`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending || coverPending}
            className="rounded-lg bg-gradient-to-r from-brand-600 to-brand-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:from-brand-500 hover:to-glow-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "保存中…" : "💾 保存此项目"}
          </button>
          {state.message && (
            <span className={`text-sm ${state.success ? "text-emerald-400" : "text-red-400"}`}>
              {state.message}
            </span>
          )}
          {delState.message && !delState.success && (
            <span className="text-sm text-red-400">{delState.message}</span>
          )}
        </div>
      </form>
    </div>
  );
}

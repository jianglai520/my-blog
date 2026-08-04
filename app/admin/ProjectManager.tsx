"use client";

import { useState } from "react";
import { useActionState } from "react";
import { updateProjects, type ProjectsState } from "@/app/actions/projects";
import { parseProjects, serializeProjects, type ProjectItem } from "@/lib/projects";
import { inputCls } from "./shared";

const initial: ProjectsState = { message: "", success: false };

/**
 * 项目管理：项目卡片动态编辑（名称/年份/描述/技术栈/链接/GitHub/封面），独立保存。
 */
export default function ProjectManager({ initialData }: { initialData: string }) {
  const [rows, setRows] = useState<ProjectItem[]>(() => parseProjects(initialData));
  const [state, formAction, pending] = useActionState<ProjectsState, FormData>(
    updateProjects,
    initial
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

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="projects" value={serializeProjects(rows)} />

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
              <input
                value={project.cover}
                onChange={(e) => update(idx, "cover", e.target.value)}
                placeholder="封面图 URL（可选）"
                className={`${inputCls} px-3 py-2 sm:col-span-2`}
              />
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
        封面图需在允许图源（supabase.co / unsplash / jsdelivr）；链接以 https:// 开头。
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

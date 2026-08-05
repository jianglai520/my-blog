"use client";

import { useState } from "react";
import { useActionState } from "react";
import { updateSkills, type SkillsState } from "@/app/actions/skills";
import { parseSkills, serializeSkills, SKILL_GROUPS, type SkillItem } from "@/lib/skills";
import { inputCls } from "./shared";

const initial: SkillsState = { message: "", success: false };

/**
 * 技能管理：技能动态行编辑（分组/名称/熟练度），独立保存。
 */
export default function SkillManager({ initialData }: { initialData: string }) {
  const [rows, setRows] = useState<SkillItem[]>(() => parseSkills(initialData));
  const [state, formAction, pending] = useActionState<SkillsState, FormData>(
    updateSkills,
    initial
  );

  function update(idx: number, field: keyof SkillItem, value: string | number) {
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }
  function remove(idx: number) {
    setRows((rs) => rs.filter((_, i) => i !== idx));
  }
  function add() {
    setRows((rs) => [...rs, { group: "其他", name: "", level: 3 }]);
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="skills" value={serializeSkills(rows)} />

      {rows.length === 0 && (
        <p className="py-4 text-center text-sm text-fg-muted">
          还没有技能，点下方「添加技能」开始。
        </p>
      )}

      <div className="space-y-2">
        {rows.map((row, idx) => (
          <div
            key={idx}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-ink-700/60 bg-ink-800/40 p-3 transition-colors hover:border-brand-500/30"
          >
            <input
              value={row.group}
              list="skill-groups"
              onChange={(e) => update(idx, "group", e.target.value)}
              placeholder="分组"
              className={`${inputCls} w-24 flex-shrink-0 px-3 py-2`}
            />
            <input
              value={row.name}
              onChange={(e) => update(idx, "name", e.target.value)}
              placeholder="技能名（如 Next.js）"
              className={`${inputCls} min-w-0 flex-1 px-3 py-2`}
            />
            {/* 熟练度：星级点选 */}
            <div className="flex flex-shrink-0 items-center gap-0.5" aria-label={`熟练度 ${row.level}/5`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => update(idx, "level", n)}
                  aria-label={`熟练度 ${n}`}
                  className={`text-lg leading-none transition-transform hover:scale-125 ${
                    n <= row.level ? "text-amber-400" : "text-ink-600 hover:text-ink-500"
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
            <span className="flex-shrink-0 text-xs text-fg-faint">
              {row.level}/5
            </span>
            <button
              type="button"
              onClick={() => remove(idx)}
              aria-label={`删除 ${row.name || "该技能"}`}
              className="flex-shrink-0 rounded-lg border border-red-400/30 px-2.5 py-2 text-sm text-red-400 transition-colors hover:bg-red-400/10"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <datalist id="skill-groups">
        {SKILL_GROUPS.map((g) => (
          <option key={g} value={g} />
        ))}
      </datalist>

      <button
        type="button"
        onClick={add}
        className="rounded-lg border border-brand-400/30 px-4 py-2 text-sm text-brand-300 transition-colors hover:bg-brand-400/10"
      >
        ➕ 添加技能
      </button>
      <p className="text-xs text-fg-faint">
        分组可自由填写（建议：前端 / 后端 / 数据库 / 工具）；熟练度 1~5。保存后 /skills 页按分组展示。
      </p>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-gradient-to-r from-brand-600 to-brand-500 px-6 py-3 font-medium text-white transition-colors hover:from-brand-500 hover:to-glow-400 disabled:cursor-not-allowed disabled:bg-ink-600 disabled:text-fg-faint"
        >
          {pending ? "保存中..." : "💾 保存技能"}
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

"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import {
  saveSkill,
  deleteSkill,
  moveGroup,
  type SkillsState,
} from "@/app/actions/skills";
import {
  groupSkills,
  LEVEL_LABELS,
  parseSkills,
  SKILL_GROUPS,
  type SkillItem,
} from "@/lib/skills";
import { inputCls } from "./shared";

const initial: SkillsState = { message: "", success: false };

const emptySkill: SkillItem = {
  group: "其他",
  name: "",
  level: 3,
  description: "",
  featured: false,
  years: "",
  icon: "",
};

type Row = {
  key: string;
  originalGroup: string;
  originalName: string;
  data: SkillItem;
};

/** 本地按分组块重排（乐观更新用） */
function reorderRows(rows: Row[], group: string, direction: "up" | "down"): Row[] {
  const order: string[] = [];
  for (const row of rows) {
    if (!order.includes(row.data.group)) order.push(row.data.group);
  }
  const idx = order.indexOf(group);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || swapIdx < 0 || swapIdx >= order.length) return rows;

  [order[idx], order[swapIdx]] = [order[swapIdx], order[idx]];

  const buckets = new Map<string, Row[]>();
  for (const row of rows) {
    const bucket = buckets.get(row.data.group) ?? [];
    bucket.push(row);
    buckets.set(row.data.group, bucket);
  }
  return order.flatMap((g) => buckets.get(g) ?? []);
}

/**
 * 技能管理：每个技能独立保存/删除，支持分组排序与实时预览。
 */
export default function SkillManager({ initialData }: { initialData: string }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(() =>
    parseSkills(initialData).map((skill, i) => ({
      key: `existing-${i}-${skill.group}-${skill.name}`,
      originalGroup: skill.group,
      originalName: skill.name,
      data: skill,
    })),
  );
  const [showPreview, setShowPreview] = useState(false);
  const [groupError, setGroupError] = useState("");
  const [movingGroup, setMovingGroup] = useState<string | null>(null);

  const groups = groupSkills(rows.map((r) => r.data));
  const hasUnsaved = rows.some((r) => !r.originalName);

  function addRow() {
    setRows((rs) => [
      ...rs,
      {
        key: `new-${Date.now()}`,
        originalGroup: "",
        originalName: "",
        data: { ...emptySkill },
      },
    ]);
  }

  function removeRow(key: string) {
    setRows((rs) => rs.filter((r) => r.key !== key));
  }

  async function handleMoveGroup(group: string, direction: "up" | "down") {
    const before = rows;
    const after = reorderRows(rows, group, direction);
    if (after === before) return;

    setRows(after); // 乐观更新
    setMovingGroup(group);
    setGroupError("");

    try {
      const fd = new FormData();
      fd.set("group", group);
      fd.set("direction", direction);
      const res = await moveGroup(initial, fd);
      if (!res.success) {
        setRows(before); // 回滚
        setGroupError(res.message);
      } else {
        router.refresh();
      }
    } catch {
      setRows(before);
      setGroupError("移动失败，请稍后重试");
    } finally {
      setMovingGroup(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* 工具条：预览开关 */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          className="inline-flex items-center gap-2 rounded-lg border border-ink-600 px-3.5 py-2 text-sm text-fg-muted transition-colors hover:border-brand-400/50 hover:text-fg"
        >
          {showPreview ? <EyeOff size={15} /> : <Eye size={15} />}
          {showPreview ? "关闭预览" : "实时预览"}
        </button>
        {hasUnsaved && (
          <span className="text-xs text-amber-400">
            有未保存的新增技能，保存后再调整分组顺序
          </span>
        )}
      </div>

      {/* 分组顺序 */}
      {groups.length > 1 && (
        <div className="rounded-xl border border-ink-700/60 bg-ink-800/40 p-3">
          <p className="mb-2 text-xs text-fg-faint">分组顺序（前台按此顺序展示）</p>
          <div className="flex flex-wrap gap-2">
            {groups.map((g, i) => (
              <span
                key={g.group}
                className="inline-flex items-center gap-1 rounded-full border border-ink-600 bg-ink-900/50 px-2.5 py-1 text-xs text-fg-muted"
              >
                {g.group}
                <button
                  type="button"
                  aria-label={`上移分组 ${g.group}`}
                  disabled={i === 0 || movingGroup !== null || hasUnsaved}
                  onClick={() => handleMoveGroup(g.group, "up")}
                  className="rounded p-0.5 text-fg-faint transition-colors hover:text-fg disabled:cursor-not-allowed disabled:opacity-30"
                >
                  {movingGroup === g.group ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <ChevronUp size={12} />
                  )}
                </button>
                <button
                  type="button"
                  aria-label={`下移分组 ${g.group}`}
                  disabled={i === groups.length - 1 || movingGroup !== null || hasUnsaved}
                  onClick={() => handleMoveGroup(g.group, "down")}
                  className="rounded p-0.5 text-fg-faint transition-colors hover:text-fg disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronDown size={12} />
                </button>
              </span>
            ))}
          </div>
          {groupError && <p className="mt-2 text-xs text-red-400">{groupError}</p>}
        </div>
      )}

      {rows.length === 0 && (
        <p className="py-4 text-center text-sm text-fg-muted">
          还没有技能，点下方「添加技能」开始。
        </p>
      )}

      <div className="space-y-3">
        {rows.map((row, idx) => (
          <SkillRowEditor
            key={row.key}
            row={row}
            index={idx}
            onDeleted={() => removeRow(row.key)}
          />
        ))}
      </div>

      <datalist id="skill-groups-list">
        {SKILL_GROUPS.map((g) => (
          <option key={g} value={g} />
        ))}
      </datalist>

      <button
        type="button"
        onClick={addRow}
        className="inline-flex items-center gap-2 rounded-lg border border-brand-400/30 px-4 py-2 text-sm text-brand-300 transition-colors hover:bg-brand-400/10"
      >
        <Plus size={15} /> 添加技能
      </button>

      <p className="text-xs text-fg-faint">
        每个技能独立保存；分组可自由填写（建议：前端 / 后端 / 数据库 / 工具）；
        熟练度 1~5；勾选「核心」会出现在前台顶部大卡片。
      </p>

      {showPreview && <SkillPreview skills={rows.map((r) => r.data)} />}
    </div>
  );
}

/** 单个技能编辑卡 */
function SkillRowEditor({
  row,
  index,
  onDeleted,
}: {
  row: Row;
  index: number;
  onDeleted: () => void;
}) {
  const [data, setData] = useState<SkillItem>(row.data);
  const [originalGroup, setOriginalGroup] = useState(row.originalGroup);
  const [originalName, setOriginalName] = useState(row.originalName);

  const [state, saveAction, pending] = useActionState<SkillsState, FormData>(
    saveSkill,
    initial,
  );
  const [delState, delAction, delPending] = useActionState<SkillsState, FormData>(
    deleteSkill,
    initial,
  );

  // 保存成功后，把定位键更新为新分组/名称（支持改名后继续保存）
  const prevSuccess = useRef(false);
  useEffect(() => {
    if (state.success && !prevSuccess.current) {
      setOriginalGroup(data.group);
      setOriginalName(data.name);
    }
    prevSuccess.current = state.success;
  }, [state.success, data.group, data.name]);

  // 删除成功后从父列表移除（只执行一次）
  const deletedRef = useRef(false);
  useEffect(() => {
    if (delState.success && !deletedRef.current) {
      deletedRef.current = true;
      onDeleted();
    }
  }, [delState.success, onDeleted]);

  function update<K extends keyof SkillItem>(field: K, value: SkillItem[K]) {
    setData((d) => ({ ...d, [field]: value }));
  }

  return (
    <div className="rounded-xl border border-ink-700/60 bg-ink-800/40 p-4">
      {/* 头部：序号 + 删除 */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-fg-muted">
          技能 #{index + 1}
          {!originalName && <span className="ml-2 text-xs text-brand-400">（未保存）</span>}
        </span>

        {originalName ? (
          <form
            action={delAction}
            onSubmit={(e) => {
              if (!confirm(`确定删除技能「${originalName}」？`)) e.preventDefault();
            }}
          >
            <input type="hidden" name="originalGroup" value={originalGroup} />
            <input type="hidden" name="originalName" value={originalName} />
            <button
              type="submit"
              disabled={delPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/30 px-2.5 py-1 text-sm text-red-400 transition-colors hover:bg-red-400/10 disabled:opacity-40"
            >
              {delPending ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Trash2 size={13} />
              )}
              删除
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={onDeleted}
            className="inline-flex items-center gap-1.5 rounded-lg border border-ink-600 px-2.5 py-1 text-sm text-fg-muted transition-colors hover:border-red-400/30 hover:text-red-400"
          >
            <Trash2 size={13} /> 移除
          </button>
        )}
      </div>

      {/* 保存表单 */}
      <form action={saveAction} className="space-y-3">
        <input type="hidden" name="originalGroup" value={originalGroup} />
        <input type="hidden" name="originalName" value={originalName} />
        <input type="hidden" name="skill" value={JSON.stringify(data)} />

        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={data.group}
            list="skill-groups-list"
            onChange={(e) => update("group", e.target.value)}
            placeholder="分组（前端 / 后端 / …）"
            className={`${inputCls} px-3 py-2`}
          />
          <input
            value={data.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="技能名（如 Next.js）"
            className={`${inputCls} px-3 py-2`}
          />
          <input
            value={data.years ?? ""}
            onChange={(e) => update("years", e.target.value)}
            placeholder="经验（可选，如 3 年）"
            className={`${inputCls} px-3 py-2`}
          />
          <input
            value={data.icon ?? ""}
            onChange={(e) => update("icon", e.target.value)}
            placeholder="图标 emoji（可选，如 ⚛️）"
            className={`${inputCls} px-3 py-2`}
          />
          <input
            value={data.description ?? ""}
            onChange={(e) => update("description", e.target.value)}
            placeholder="一句话说明（可选）"
            className={`${inputCls} px-3 py-2 sm:col-span-2`}
          />
        </div>

        {/* 熟练度 + 核心技能 */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1" aria-label={`熟练度 ${data.level}/5`}>
            <span className="mr-1 text-xs text-fg-muted">熟练度</span>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`熟练度 ${n}`}
                onClick={() => update("level", n)}
                className={`text-lg leading-none transition-transform hover:scale-125 ${
                  n <= data.level
                    ? "text-amber-400"
                    : "text-ink-600 hover:text-ink-500"
                }`}
              >
                ★
              </button>
            ))}
            <span className="ml-1.5 text-xs text-fg-faint">
              {LEVEL_LABELS[data.level]} {data.level}/5
            </span>
          </div>

          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-fg-muted">
            <input
              type="checkbox"
              checked={Boolean(data.featured)}
              onChange={(e) => update("featured", e.target.checked)}
              className="h-4 w-4 accent-brand-500"
            />
            核心技能（前台顶部展示）
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-gradient-to-r from-brand-600 to-brand-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:from-brand-500 hover:to-glow-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "保存中…" : "💾 保存此技能"}
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

/** 实时预览（基于当前未保存的编辑状态） */
function SkillPreview({ skills }: { skills: SkillItem[] }) {
  const groups = groupSkills(skills);

  if (groups.length === 0) {
    return (
      <p className="mt-4 rounded-xl border border-ink-700/60 bg-ink-800/30 p-4 text-center text-sm text-fg-faint">
        暂无技能可预览
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <p className="text-xs text-fg-faint">实时预览（包含未保存的修改）</p>
      {groups.map((group) => (
        <div key={group.group} className="glass rounded-xl p-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-fg">{group.group}</h4>
            <span className="text-xs text-fg-faint">{group.items.length} 项</span>
          </div>
          <div className="space-y-2.5">
            {group.items.map((skill) => (
              <div key={`${skill.group}-${skill.name}-${skill.level}`}>
                <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                  <span className="min-w-0 truncate text-fg-muted">
                    {skill.icon ? `${skill.icon} ` : ""}
                    {skill.name || "（未命名）"}
                    {skill.featured && (
                      <span className="ml-1.5 rounded-full bg-brand-500/15 px-1.5 py-0.5 text-[10px] text-brand-300">
                        核心
                      </span>
                    )}
                  </span>
                  <span className="flex-shrink-0 text-fg-faint">
                    {LEVEL_LABELS[skill.level]} {skill.level}/5
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-ink-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-500 to-glow-400"
                    style={{ width: `${(skill.level / 5) * 100}%` }}
                  />
                </div>
                {skill.description && (
                  <p className="mt-1 line-clamp-1 text-[11px] text-fg-faint">
                    {skill.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

"use server";

import { revalidatePath, updateTag } from "next/cache";
import { getServerSupabase, requireAdmin } from "@/lib/server/supabase";
import {
  moveGroupBlock,
  parseSkills,
  serializeSkills,
  type SkillItem,
} from "@/lib/skills";

export type SkillsState = {
  message: string;
  success: boolean;
};

type ServerSupabase = Awaited<ReturnType<typeof getServerSupabase>>;

/** 读取当前技能 JSON 数组 */
async function readSkills(supabase: ServerSupabase): Promise<SkillItem[]> {
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "skills")
    .maybeSingle();
  // ⚠️ 读失败绝不能当成空数组：后续写回会覆盖掉其他技能
  if (error) {
    throw new Error(`读取技能失败：${error.message}`);
  }
  return parseSkills(data?.value ?? "[]");
}

/** 写回技能 JSON 数组，返回错误信息（成功为 null） */
async function writeSkills(
  supabase: ServerSupabase,
  items: SkillItem[],
): Promise<string | null> {
  const { error } = await supabase
    .from("site_settings")
    .upsert({ key: "skills", value: serializeSkills(items) }, {
      onConflict: "key",
      ignoreDuplicates: false,
    });
  return error ? error.message : null;
}

function revalidateSkills() {
  revalidatePath("/skills");
  revalidatePath("/admin");
  updateTag("site");
}

/**
 * 保存单个技能（独立保存，不影响其他技能）。
 * - `originalName` 为空：新增
 * - 非空：按 originalGroup + originalName 定位并替换
 */
export async function saveSkill(
  _prev: SkillsState,
  formData: FormData,
): Promise<SkillsState> {
  try {
    await requireAdmin();

    const originalGroup = String(formData.get("originalGroup") || "").trim();
    const originalName = String(formData.get("originalName") || "").trim();
    const raw = String(formData.get("skill") || "{}").slice(0, 3000);

    const item = parseSkills(`[${raw}]`)[0];
    if (!item || !item.name) {
      return { message: "❌ 技能名称必填", success: false };
    }

    const supabase = await getServerSupabase();
    const current = await readSkills(supabase);

    let next: SkillItem[];
    if (originalName) {
      const idx = current.findIndex(
        (s) => s.group === originalGroup && s.name === originalName,
      );
      if (idx === -1) {
        return {
          message: "❌ 技能不存在（可能已被删除），请刷新后重试",
          success: false,
        };
      }
      next = current.map((s, i) => (i === idx ? item : s));
    } else {
      next = [...current, item];
    }

    const err = await writeSkills(supabase, next);
    if (err) {
      console.error("保存技能失败:", err);
      return { message: `❌ 保存失败：${err}`, success: false };
    }

    revalidateSkills();
    return { message: "✅ 已保存", success: true };
  } catch (e) {
    console.error("saveSkill 异常:", e);
    return {
      message: `❌ 保存失败：${e instanceof Error ? e.message : "未知错误"}`,
      success: false,
    };
  }
}

/** 删除单个技能（按原分组 + 名称定位） */
export async function deleteSkill(
  _prev: SkillsState,
  formData: FormData,
): Promise<SkillsState> {
  try {
    await requireAdmin();

    const originalGroup = String(formData.get("originalGroup") || "").trim();
    const originalName = String(formData.get("originalName") || "").trim();
    if (!originalName) {
      return { message: "❌ 缺少技能标识", success: false };
    }

    const supabase = await getServerSupabase();
    const current = await readSkills(supabase);
    const next = current.filter(
      (s) => !(s.group === originalGroup && s.name === originalName),
    );

    if (next.length === current.length) {
      return { message: "❌ 技能不存在（可能已被删除）", success: false };
    }

    const err = await writeSkills(supabase, next);
    if (err) {
      console.error("删除技能失败:", err);
      return { message: `❌ 删除失败：${err}`, success: false };
    }

    revalidateSkills();
    return { message: "✅ 已删除", success: true };
  } catch (e) {
    console.error("deleteSkill 异常:", e);
    return {
      message: `❌ 删除失败：${e instanceof Error ? e.message : "未知错误"}`,
      success: false,
    };
  }
}

/** 上移 / 下移分组（重排整个分组块，组内顺序不变） */
export async function moveGroup(
  _prev: SkillsState,
  formData: FormData,
): Promise<SkillsState> {
  try {
    await requireAdmin();

    const group = String(formData.get("group") || "").trim();
    const direction = String(formData.get("direction") || "up");
    if (!group || (direction !== "up" && direction !== "down")) {
      return { message: "❌ 参数不合法", success: false };
    }

    const supabase = await getServerSupabase();
    const current = await readSkills(supabase);
    const next = moveGroupBlock(current, group, direction);

    if (!next) {
      return { message: "❌ 已经到边界，无法继续移动", success: false };
    }

    const err = await writeSkills(supabase, next);
    if (err) {
      console.error("移动分组失败:", err);
      return { message: `❌ 移动失败：${err}`, success: false };
    }

    revalidateSkills();
    return { message: "✅ 分组顺序已更新", success: true };
  } catch (e) {
    console.error("moveGroup 异常:", e);
    return {
      message: `❌ 移动失败：${e instanceof Error ? e.message : "未知错误"}`,
      success: false,
    };
  }
}

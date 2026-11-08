"use server";

import { revalidatePath, updateTag } from "next/cache";
import { getServerSupabase, requireAdmin } from "@/lib/server/supabase";
import { parseProjects, serializeProjects, type ProjectItem } from "@/lib/projects";

export type ProjectState = {
  message: string;
  success: boolean;
};

type ServerSupabase = Awaited<ReturnType<typeof getServerSupabase>>;

/** 读取当前项目 JSON 数组 */
async function readProjects(supabase: ServerSupabase): Promise<ProjectItem[]> {
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "projects")
    .maybeSingle();
  // ⚠️ 读失败绝不能当成空数组：后续写回会覆盖掉其他项目
  if (error) {
    throw new Error(`读取项目失败：${error.message}`);
  }
  return parseProjects(data?.value ?? "[]");
}

/** 写回项目 JSON 数组，返回错误信息（成功为 null） */
async function writeProjects(
  supabase: ServerSupabase,
  items: ProjectItem[]
): Promise<string | null> {
  const { error } = await supabase
    .from("site_settings")
    .upsert({ key: "projects", value: serializeProjects(items) }, {
      onConflict: "key",
      ignoreDuplicates: false,
    });
  return error ? error.message : null;
}

function revalidateProjects() {
  revalidatePath("/projects");
  revalidatePath("/admin");
  updateTag("site");
}

/**
 * 保存单个项目（独立保存，不影响其他项目）。
 * - `originalName` 为空：新增
 * - `originalName` 非空：按原名称定位并替换
 */
export async function saveProject(
  _prev: ProjectState,
  formData: FormData
): Promise<ProjectState> {
  try {
    await requireAdmin();

    const originalName = String(formData.get("originalName") || "").trim();
    const raw = String(formData.get("project") || "{}").slice(0, 4000);

    // 复用 parseProjects 做校验/清洗（包成单元素数组）
    const item = parseProjects(`[${raw}]`)[0];
    if (!item || !item.name) {
      return { message: "❌ 项目名称必填", success: false };
    }

    const supabase = await getServerSupabase();
    const current = await readProjects(supabase);

    let next: ProjectItem[];
    if (originalName) {
      const idx = current.findIndex((p) => p.name === originalName);
      if (idx === -1) {
        return {
          message: "❌ 项目不存在（可能已被删除），请刷新后重试",
          success: false,
        };
      }
      next = current.map((p, i) => (i === idx ? item : p));
    } else {
      next = [...current, item];
    }

    const err = await writeProjects(supabase, next);
    if (err) {
      console.error("保存项目失败:", err);
      return { message: `❌ 保存失败：${err}`, success: false };
    }

    revalidateProjects();
    return { message: "✅ 已保存", success: true };
  } catch (e) {
    console.error("saveProject 异常:", e);
    return {
      message: `❌ 保存失败：${e instanceof Error ? e.message : "未知错误"}`,
      success: false,
    };
  }
}

/** 删除单个项目（按原名称定位，不影响其他项目） */
export async function deleteProject(
  _prev: ProjectState,
  formData: FormData
): Promise<ProjectState> {
  try {
    await requireAdmin();

    const name = String(formData.get("name") || "").trim();
    if (!name) {
      return { message: "❌ 缺少项目标识", success: false };
    }

    const supabase = await getServerSupabase();
    const current = await readProjects(supabase);
    const next = current.filter((p) => p.name !== name);

    if (next.length === current.length) {
      return { message: "❌ 项目不存在（可能已被删除）", success: false };
    }

    const err = await writeProjects(supabase, next);
    if (err) {
      console.error("删除项目失败:", err);
      return { message: `❌ 删除失败：${err}`, success: false };
    }

    revalidateProjects();
    return { message: "✅ 已删除", success: true };
  } catch (e) {
    console.error("deleteProject 异常:", e);
    return {
      message: `❌ 删除失败：${e instanceof Error ? e.message : "未知错误"}`,
      success: false,
    };
  }
}

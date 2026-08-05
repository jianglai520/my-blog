"use server";

import { revalidatePath, updateTag } from "next/cache";
import { getServerSupabase, requireAdmin } from "@/lib/server/supabase";

export type SkillsState = {
  message: string;
  success: boolean;
};

/** 保存技能清单（独立于站点设置，后台「技能管理」tab 使用） */
export async function updateSkills(
  _prev: SkillsState,
  formData: FormData
): Promise<SkillsState> {
  try {
    await requireAdmin();
  } catch (e) {
    return {
      message: `❌ ${e instanceof Error ? e.message : "无权限执行此操作"}`,
      success: false,
    };
  }

  const skills = String(formData.get("skills") || "[]").slice(0, 2000);

  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("site_settings")
    .upsert({ key: "skills", value: skills }, {
      onConflict: "key",
      ignoreDuplicates: false,
    });

  if (error) {
    console.error("保存技能失败:", error);
    return { message: "❌ 保存失败，请稍后重试", success: false };
  }

  revalidatePath("/skills");
  revalidatePath("/admin");
  updateTag("site");
  return { message: "✅ 技能已保存！", success: true };
}

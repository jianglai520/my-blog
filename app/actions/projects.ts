"use server";

import { revalidatePath, updateTag } from "next/cache";
import { getServerSupabase, requireAdmin } from "@/lib/server/supabase";

export type ProjectsState = {
  message: string;
  success: boolean;
};

/** 保存项目展示数据（独立于站点设置，后台「项目管理」tab 使用） */
export async function updateProjects(
  _prev: ProjectsState,
  formData: FormData
): Promise<ProjectsState> {
  try {
    await requireAdmin();

    const projects = String(formData.get("projects") || "[]").slice(0, 8000);

    const supabase = await getServerSupabase();
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: "projects", value: projects }, {
        onConflict: "key",
        ignoreDuplicates: false,
      });

    if (error) {
      console.error("保存项目失败:", error);
      return { message: `❌ 保存失败：${error.message}`, success: false };
    }

    revalidatePath("/projects");
    revalidatePath("/admin");
    updateTag("site");
    return { message: "✅ 项目已保存！", success: true };
  } catch (e) {
    console.error("updateProjects 异常:", e);
    return {
      message: `❌ 保存失败：${e instanceof Error ? e.message : "未知错误"}`,
      success: false,
    };
  }
}

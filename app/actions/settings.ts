"use server";

import { revalidatePath, updateTag } from "next/cache";
import { getServerSupabase, requireAdmin } from "@/lib/server/supabase";
import { settingsSchema, type SettingsInput } from "@/lib/validations/settings";

export type SettingsState = {
  message: string;
  success: boolean;
};

/** 保存站点设置：博主鉴权 → 校验 → upsert 全部键 → 刷新缓存 */
export async function updateSiteSettings(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  try {
    await requireAdmin();
  } catch (e) {
    return {
      message: `❌ ${e instanceof Error ? e.message : "无权限执行此操作"}`,
      success: false,
    };
  }

  const parsed = settingsSchema.safeParse({
    author_name: String(formData.get("author_name") || ""),
    intro: String(formData.get("intro") || ""),
    bio: String(formData.get("bio") || ""),
    github: String(formData.get("github") || ""),
    email: String(formData.get("email") || ""),
    school: String(formData.get("school") || ""),
    school_url: String(formData.get("school_url") || ""),
    avatar_url: String(formData.get("avatar_url") || ""),
    icp: String(formData.get("icp") || ""),
    skills: String(formData.get("skills") || ""),
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { message: `❌ ${first?.message || "输入不合法"}`, success: false };
  }

  const data: SettingsInput = parsed.data;
  const entries = Object.entries(data).map(([key, value]) => ({
    key,
    value: (value ?? "").trim(),
  }));

  const supabase = await getServerSupabase();
  const { error } = await supabase.from("site_settings").upsert(entries, {
    onConflict: "key",
    ignoreDuplicates: false,
  });

  if (error) {
    console.error("保存站点设置失败:", error);
    return { message: "❌ 保存失败，请稍后重试", success: false };
  }

  revalidatePath("/");
  revalidatePath("/about");
  revalidatePath("/admin");
  updateTag("site");
  return { message: "✅ 站点设置已保存！", success: true };
}

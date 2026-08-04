/** 技能项：分组 + 名称 + 熟练度(1-5) */
export type SkillItem = { group: string; name: string; level: number };

/** 建议分组（后台 datalist 提示用） */
export const SKILL_GROUPS = ["前端", "后端", "数据库", "工具", "其他"];

/** 解析技能文本：优先 JSON（后台动态表单序列化），兼容旧「名称 | 1-5」逐行格式 */
export function parseSkills(raw: string): SkillItem[] {
  const text = (raw ?? "").trim();
  if (!text) return [];

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((s) => s && typeof s.name === "string" && s.name.trim())
        .map((s) => ({
          group: typeof s.group === "string" && s.group.trim() ? s.group.trim() : "其他",
          name: s.name.trim(),
          level: Math.min(5, Math.max(1, Number(s.level) || 1)),
        }));
    }
  } catch {
    // 非 JSON，按旧文本格式解析
  }

  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, level] = line.split("|").map((s) => s.trim());
      return {
        group: "其他",
        name: name ?? "",
        level: Math.min(5, Math.max(1, Number(level) || 1)),
      };
    })
    .filter((s) => s.name);
}

/** 序列化为 JSON 字符串（存入 site_settings.skills） */
export function serializeSkills(items: SkillItem[]): string {
  return JSON.stringify(items);
}

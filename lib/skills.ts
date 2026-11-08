/** 技能项：分组 + 名称 + 熟练度(1-5) + 可选扩展字段 */
export type SkillItem = {
  group: string;
  name: string;
  level: number;
  /** 一句话说明（可选） */
  description?: string;
  /** 是否核心技能（前台顶部大卡片展示） */
  featured?: boolean;
  /** 使用年限/经验（可选，如 "3 年"） */
  years?: string;
  /** 自定义 emoji / 图标（可选） */
  icon?: string;
};

/** 建议分组（后台 datalist 提示用） */
export const SKILL_GROUPS = ["前端", "后端", "数据库", "工具", "其他"];

/** 熟练度文案（1-5） */
export const LEVEL_LABELS = ["", "了解", "熟悉", "熟练", "精通", "专家"];

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
          description: typeof s.description === "string" ? s.description.trim() : "",
          featured: Boolean(s.featured),
          years: typeof s.years === "string" ? s.years.trim() : "",
          icon: typeof s.icon === "string" ? s.icon.trim() : "",
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
        description: "",
        featured: false,
        years: "",
        icon: "",
      };
    })
    .filter((s) => s.name);
}

/** 序列化为 JSON 字符串（存入 site_settings.skills） */
export function serializeSkills(items: SkillItem[]): string {
  return JSON.stringify(items);
}

/** 技能唯一标识（用于后台逐行保存/删除时定位） */
export function skillKey(item: Pick<SkillItem, "group" | "name">): string {
  return JSON.stringify([item.group, item.name]);
}

/** 按首次出现顺序聚合分组（保持填写顺序） */
export function groupSkills(
  items: SkillItem[],
): { group: string; items: SkillItem[] }[] {
  const groups: { group: string; items: SkillItem[] }[] = [];
  for (const skill of items) {
    const g = groups.find((x) => x.group === skill.group);
    if (g) g.items.push(skill);
    else groups.push({ group: skill.group, items: [skill] });
  }
  return groups;
}

/** 移动分组顺序（纯函数；direction = up/down，越界返回 null） */
export function moveGroupBlock(
  items: SkillItem[],
  group: string,
  direction: "up" | "down",
): SkillItem[] | null {
  const order: string[] = [];
  for (const item of items) {
    if (!order.includes(item.group)) order.push(item.group);
  }

  const idx = order.indexOf(group);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || swapIdx < 0 || swapIdx >= order.length) return null;

  [order[idx], order[swapIdx]] = [order[swapIdx], order[idx]];

  // 按新分组顺序重组（组内保持原顺序）
  const buckets = new Map<string, SkillItem[]>();
  for (const item of items) {
    const bucket = buckets.get(item.group) ?? [];
    bucket.push(item);
    buckets.set(item.group, bucket);
  }
  return order.flatMap((g) => buckets.get(g) ?? []);
}

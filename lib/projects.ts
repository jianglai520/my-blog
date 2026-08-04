/** 项目项（项目展示页用，后台动态编辑） */
export type ProjectItem = {
  name: string;
  year: string;
  description: string;
  tech: string; // 逗号分隔的技术栈
  link: string; // 项目链接
  github: string; // GitHub 仓库
  cover: string; // 封面图 URL（可选）
};

/** 解析项目 JSON（后台序列化存储）；非法/空返回 [] */
export function parseProjects(raw: string): ProjectItem[] {
  const text = (raw ?? "").trim();
  if (!text) return [];

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((p) => p && typeof p.name === "string" && p.name.trim())
        .map((p) => ({
          name: p.name.trim(),
          year: typeof p.year === "string" ? p.year.trim() : "",
          description: typeof p.description === "string" ? p.description.trim() : "",
          tech: typeof p.tech === "string" ? p.tech.trim() : "",
          link: typeof p.link === "string" ? p.link.trim() : "",
          github: typeof p.github === "string" ? p.github.trim() : "",
          cover: typeof p.cover === "string" ? p.cover.trim() : "",
        }));
    }
  } catch {
    // 非 JSON，视为空
  }
  return [];
}

/** 序列化为 JSON 字符串（存入 site_settings.projects） */
export function serializeProjects(items: ProjectItem[]): string {
  return JSON.stringify(items);
}

/** 技术栈字符串 → 标签数组（支持中英文逗号） */
export function splitTech(tech: string): string[] {
  return tech.split(/[,，]/).map((t) => t.trim()).filter(Boolean);
}

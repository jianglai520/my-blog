/** 简历经历项（在线简历页，后台动态编辑） */
export type ResumeItem = {
  type: "教育" | "经历" | "奖项";
  title: string;
  org: string;
  time: string;
  desc: string;
};

export const RESUME_TYPES = ["教育", "经历", "奖项"] as const;

/** 解析简历经历 JSON；非法/空返回 [] */
export function parseResume(raw: string): ResumeItem[] {
  const text = (raw ?? "").trim();
  if (!text) return [];

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((r) => r && typeof r.title === "string" && r.title.trim())
        .map((r) => ({
          type: RESUME_TYPES.includes(r.type) ? r.type : "经历",
          title: r.title.trim(),
          org: typeof r.org === "string" ? r.org.trim() : "",
          time: typeof r.time === "string" ? r.time.trim() : "",
          desc: typeof r.desc === "string" ? r.desc.trim() : "",
        }));
    }
  } catch {
    // 非 JSON 视为空
  }
  return [];
}

/** 序列化为 JSON 字符串（存入 site_settings.resume） */
export function serializeResume(items: ResumeItem[]): string {
  return JSON.stringify(items);
}

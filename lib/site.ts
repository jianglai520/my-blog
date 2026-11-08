import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { siteSettings } from "@/db/schema";

/**
 * 站点配置读取（Drizzle 直连，公开数据）。
 * 数据库缺失的键用默认值兜底（防止未迁移/未 seed 时报错）。
 */

export type SiteSettings = {
  author_name: string;
  intro: string;
  bio: string;
  github: string;
  email: string;
  school: string;
  school_url: string;
  avatar_url: string;
  icp: string;
  skills: string;
  projects: string;
  resume: string;
};

const DEFAULTS: SiteSettings = {
  author_name: "江来",
  intro: "全栈学习者 & 生活记录者",
  bio: "你好，欢迎来到我的博客。这里记录技术实践、学习笔记与生活随想。",
  github: "",
  email: "",
  school: "",
  school_url: "",
  avatar_url: "",
  icp: "",
  skills: "[]",
  projects: "[]",
  resume: "[]",
};

/**
 * 真正读 DB 的缓存函数：失败时抛错，不缓存失败结果。
 * 把「读 DB」与「失败兜底」拆开，避免一次瞬时超时把空默认值缓存下来。
 */
const readSiteSettings = unstable_cache(
  async (): Promise<SiteSettings> => {
    const rows = await db.select().from(siteSettings);
    const map = new Map(rows.map((r) => [r.key, r.value]));
    return {
      author_name: map.get("author_name") || DEFAULTS.author_name,
      intro: map.get("intro") || DEFAULTS.intro,
      bio: map.get("bio") || DEFAULTS.bio,
      github: map.get("github") || "",
      email: map.get("email") || "",
      school: map.get("school") || "",
      school_url: map.get("school_url") || "",
      avatar_url: map.get("avatar_url") || "",
      icp: map.get("icp") || "",
      skills: map.get("skills") || "[]",
      projects: map.get("projects") || "[]",
      resume: map.get("resume") || "[]",
    };
  },
  ["site-settings"],
  { revalidate: 60, tags: ["site"] },
);

/**
 * 读取全部站点配置（合并默认值）。
 * ⚠️ 关键：DB 失败时返回默认值，但**默认值不进缓存**。
 * 否则一次瞬时连接超时会让全站 60 秒内显示空数据（项目/技能"消失"）。
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    return await readSiteSettings();
  } catch (error) {
    console.error("读取站点配置失败，使用默认值（不缓存）:", error);
    return { ...DEFAULTS };
  }
}

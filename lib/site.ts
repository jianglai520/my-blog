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
};

/**
 * 读取全部站点配置（合并默认值）。
 * 缓存：unstable_cache（60s）+ tag "site"（后台保存设置时 revalidateTag 立即失效）。
 */
export const getSiteSettings = unstable_cache(
  async (): Promise<SiteSettings> => {
    try {
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
      };
    } catch (error) {
      console.error("读取站点配置失败，使用默认值:", error);
      return { ...DEFAULTS };
    }
  },
  ["site-settings"],
  { revalidate: 60, tags: ["site"] },
);

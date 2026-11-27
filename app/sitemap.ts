import type { MetadataRoute } from "next";
import { getPublishedPosts, getTags } from "@/lib/posts";
import { postHref } from "@/lib/format";
import { getSiteSettings } from "@/lib/site";
import { parseProjects, projectSlug } from "@/lib/projects";

const SITE_URL = "https://jianglai520.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let posts: Awaited<ReturnType<typeof getPublishedPosts>>["posts"] = [];
  let tags: Awaited<ReturnType<typeof getTags>> = [];
  try {
    // 分页取全量，避免文章超过 100 篇后 sitemap 漏条目
    const collected: typeof posts = [];
    for (let page = 1; page <= 50; page++) {
      const result = await getPublishedPosts(page, 100);
      collected.push(...result.posts);
      if (result.posts.length === 0 || collected.length >= result.total) break;
    }
    posts = collected;
    tags = await getTags();
  } catch (error) {
    console.error("sitemap: 获取数据失败，仅输出基础页", error);
  }

  const postEntries = posts.map((post): MetadataRoute.Sitemap[number] => {
    const path = postHref(post);
    return {
      url: `${SITE_URL}${path}`,
      lastModified: post.created_at,
      changeFrequency: "monthly",
      priority: 0.7,
    };
  });

  const tagEntries = tags.map(
    (tag): MetadataRoute.Sitemap[number] => ({
      url: `${SITE_URL}/tags/${tag.slug}`,
      changeFrequency: "weekly",
      priority: 0.5,
    }),
  );

  // 项目详情页：slug 可能含中文，sitemap 必须做 URL 编码
  let projectEntries: MetadataRoute.Sitemap = [];
  try {
    const settings = await getSiteSettings();
    const projects = parseProjects(settings.projects);
    projectEntries = projects.map((project, index) => ({
      url: `${SITE_URL}/projects/${encodeURIComponent(projectSlug(project, index))}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
  } catch (error) {
    console.error("sitemap: 获取项目数据失败，跳过项目详情", error);
  }

  return [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/archives`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE_URL}/projects`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/skills`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/guestbook`, changeFrequency: "weekly", priority: 0.4 },
    { url: `${SITE_URL}/resume`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/logs`, changeFrequency: "daily", priority: 0.4 },
    { url: `${SITE_URL}/about`, changeFrequency: "yearly", priority: 0.3 },
    ...tagEntries,
    ...projectEntries,
    ...postEntries,
  ];
}

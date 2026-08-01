import type { MetadataRoute } from "next";
import { getPublishedPosts } from "@/lib/posts";

const SITE_URL = "https://jianglai520.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let posts: Awaited<ReturnType<typeof getPublishedPosts>> = [];
  try {
    posts = await getPublishedPosts();
  } catch (error) {
    console.error("sitemap: 获取文章失败，仅输出首页", error);
  }

  const postEntries = posts.map((post): MetadataRoute.Sitemap[number] => {
    const path = post.slug ? `/posts/${post.slug}` : `/posts/${post.id}`;
    return {
      url: `${SITE_URL}${path}`,
      lastModified: post.created_at,
      changeFrequency: "monthly",
      priority: 0.7,
    };
  });

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    ...postEntries,
  ];
}

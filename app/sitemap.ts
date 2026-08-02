import type { MetadataRoute } from "next";
import { getPublishedPosts, getTags } from "@/lib/posts";

const SITE_URL = "https://jianglai520.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let posts: Awaited<ReturnType<typeof getPublishedPosts>>["posts"] = [];
  let tags: Awaited<ReturnType<typeof getTags>> = [];
  try {
    const [postResult, tagResult] = await Promise.all([
      getPublishedPosts(1, 100),
      getTags(),
    ]);
    posts = postResult.posts;
    tags = tagResult;
  } catch (error) {
    console.error("sitemap: 获取数据失败，仅输出基础页", error);
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

  const tagEntries = tags.map(
    (tag): MetadataRoute.Sitemap[number] => ({
      url: `${SITE_URL}/tags/${tag.slug}`,
      changeFrequency: "weekly",
      priority: 0.5,
    }),
  );

  return [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/archives`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE_URL}/about`, changeFrequency: "yearly", priority: 0.3 },
    ...tagEntries,
    ...postEntries,
  ];
}

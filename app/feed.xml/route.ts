import { getPublishedPosts } from "@/lib/posts";
import { stripMarkdown } from "@/lib/format";

const SITE_URL = "https://jianglai520.com";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Atom Feed（订阅器 / 浏览器可解析） */
export async function GET() {
  const { posts } = await getPublishedPosts(1, 20);

  const items = posts
    .map((post) => {
      const link = `${SITE_URL}/posts/${post.slug ?? post.id}`;
      const summary =
        post.excerpt || stripMarkdown(post.content).slice(0, 200);
      const date = new Date(post.created_at).toISOString();
      return `    <entry>
      <title>${escapeXml(post.title)}</title>
      <link href="${link}" />
      <id>${link}</id>
      <published>${date}</published>
      <updated>${date}</updated>
      <summary type="html">${escapeXml(summary)}</summary>
    </entry>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>jianglai520 — 我的博客</title>
  <subtitle>个人技术博客，记录开发经验、学习笔记与生活随想。</subtitle>
  <link href="${SITE_URL}/feed.xml" rel="self" />
  <link href="${SITE_URL}" />
  <id>${SITE_URL}/</id>
  <updated>${new Date().toISOString()}</updated>
${items}
</feed>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/atom+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

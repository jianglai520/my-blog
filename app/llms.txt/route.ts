import { getPublishedPosts } from "@/lib/posts";
import { getSiteSettings } from "@/lib/site";
import { stripMarkdown, postHref } from "@/lib/format";

const SITE_URL = "https://jianglai520.com";

/**
 * llms.txt：给 LLM / AI 爬虫的站点索引（llmstxt.org 事实标准）。
 * 结构：站点名 + 摘要 + Markdown 链接列表（标题 + 一句话摘要）。
 * AI 爬虫（GPTBot/ClaudeBot 等）读取此文件可快速理解全站内容。
 */
export async function GET() {
  const [{ posts }, settings] = await Promise.all([
    getPublishedPosts(1, 50),
    getSiteSettings(),
  ]);

  const lines = [
    `# ${settings.author_name} 的个人博客`,
    "",
    `> ${settings.intro || "记录全栈开发、AI 应用与学习笔记。"}`,
    "",
    `## 站点信息`,
    "",
    `- 博主：${settings.author_name}`,
    settings.github ? `- GitHub：${settings.github}` : null,
    settings.email ? `- 邮箱：${settings.email}` : null,
    `- 博客地址：${SITE_URL}`,
    "",
    `## 文章`,
    "",
    ...posts.map((post) => {
      const summary = post.excerpt || stripMarkdown(post.content).slice(0, 100);
      return `- [${post.title}](${SITE_URL}${postHref(post)})：${summary}`;
    }),
    "",
  ];

  // 过滤掉 null 行
  const body = lines.filter((l) => l !== null).join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      // llms.txt 内容随文章更新，允许 CDN 缓存但保持较短
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}

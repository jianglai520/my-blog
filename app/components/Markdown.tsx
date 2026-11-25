import { unstable_cache } from "next/cache";
import "katex/dist/katex.min.css";
import { renderMarkdownHtml } from "@/lib/markdown";

/**
 * Markdown 渲染组件（Server Component）。
 *
 * 渲染管线在 `lib/markdown.ts`（纯函数，便于单测）；
 * 这里只负责按「正文内容」缓存 HTML：
 * Shiki 代码高亮是文章页 TTFB 的主要成本，缓存后重复访问不再重新渲染。
 * tag "posts" 在发布/编辑时失效；内容变化本身也会生成新的缓存 key。
 *
 * 管线变化时必须递增 key 前缀（当前 v4 = 图片 no-referrer 防盗链兼容），
 * 否则已缓存的旧 HTML 不会更新。
 */
const toHtml = unstable_cache(
  async (source: string) => renderMarkdownHtml(source),
  ["markdown-html-v4"],
  { revalidate: 3600, tags: ["posts"] },
);

export default async function Markdown({ source }: { source: string }) {
  const html = await toHtml(source);
  return (
    <div
      className="markdown-body prose prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

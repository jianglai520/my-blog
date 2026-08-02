import { cache } from "react";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeStringify from "rehype-stringify";

/**
 * Markdown → HTML（纯服务端渲染，客户端零 JS）。
 * 管线：remark-parse → remark-gfm → remark-rehype → rehype-slug → rehype-pretty-code → rehype-stringify
 * 不启用 rehypeRaw，文章内原始 HTML 会被忽略（防注入，内容来源只有博主编辑器）。
 */
const toHtml = cache(async (source: string) => {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypePrettyCode, {
      theme: "github-dark",
      keepBackground: true,
    })
    .use(rehypeStringify)
    .process(source);
  return String(file);
});

export default async function Markdown({ source }: { source: string }) {
  const html = await toHtml(source);
  return (
    <div
      className="markdown-body prose prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

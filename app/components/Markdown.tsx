import { unstable_cache } from "next/cache";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeStringify from "rehype-stringify";
import type { Element, Root } from "hast";

/**
 * 正文图片懒加载：外部图床图片通常很大，浏览器默认会立刻加载。
 * 统一补 loading/decoding，减少首屏图片请求与解码开销。
 */
function lazyImages() {
  return (tree: Root) => {
    const visit = (node: Element) => {
      if (node.tagName === "img") {
        node.properties = {
          ...node.properties,
          loading: "lazy",
          decoding: "async",
        };
      }
      for (const child of node.children ?? []) {
        if (child.type === "element") visit(child as Element);
      }
    };
    for (const child of tree.children) {
      if (child.type === "element") visit(child as Element);
    }
  };
}

/**
 * 无语言代码块补默认语言 text：
 * rehype-pretty-code 对无语言标注的代码块不做高亮（原样输出裸 <pre>），
 * 统一补 language-text 使其也走 shiki 双主题（深浅色下都有协调底色）。
 */
function defaultCodeLang() {
  return (tree: Root) => {
    const visit = (node: Element) => {
      if (node.tagName === "code") {
        const className = Array.isArray(node.properties.className)
          ? node.properties.className.map(String)
          : [];
        const hasLang = className.some((c) => c.startsWith("language-"));
        if (!hasLang && !node.properties.dataLanguage) {
          node.properties.className = ["language-text"];
        }
      }
      for (const child of node.children ?? []) {
        if (child.type === "element") visit(child as Element);
      }
    };
    for (const child of tree.children) {
      if (child.type === "element") visit(child as Element);
    }
  };
}

/**
 * Markdown → HTML（纯服务端渲染，客户端零 JS）。
 * 管线：remark-parse → remark-gfm → remark-rehype → rehype-slug → defaultCodeLang → rehype-pretty-code → rehype-stringify
 * 不启用 rehypeRaw，文章内原始 HTML 会被忽略（防注入，内容来源只有博主编辑器）。
 *
 * 使用 unstable_cache 按「正文内容」缓存渲染结果：
 * Shiki 代码高亮是文章页 TTFB 的主要成本，缓存后重复访问不再重新渲染。
 * tag "posts" 在发布/编辑时失效；内容变化本身也会生成新的缓存 key。
 */
const toHtml = unstable_cache(
  async (source: string) => {
    const file = await unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype)
      .use(rehypeSlug)
      .use(lazyImages)
      .use(defaultCodeLang)
      .use(rehypePrettyCode, {
        theme: {
          dark: "github-dark",
          light: "github-light",
        },
        keepBackground: true,
      })
      .use(rehypeStringify)
      .process(source);
    return String(file);
  },
  ["markdown-html"],
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
